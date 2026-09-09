/**
 * V2 Gesture Showdown / Gesture Duo: Team Challenge
 * 核心手勢辨識引擎 (GestureEngine)
 * 基於 MediaPipe Hands 進行即時鏡像投影與左右半區手勢（張手/握拳）辨識
 * 支援雙人同機雙右手合作模式與單人雙手模式
 */

class GestureEngine {
  constructor(videoElement, canvasElement, options = {}) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    // 回呼函式
    this.onGestureUpdate = options.onGestureUpdate || null;
    this.onCameraReady = options.onCameraReady || null;
    this.onError = options.onError || null;

    // 狀態儲存：左右半區手勢
    // 狀態可能為: 'FIST' (✊), 'OPEN' (🖐️), 'NONE' (無手), 'UNKNOWN' (過渡中)
    this.currentState = {
      left: { gesture: 'NONE', confidence: 0, x: 0, y: 0, rawOpenCount: 0 },
      right: { gesture: 'NONE', confidence: 0, x: 0, y: 0, rawOpenCount: 0 }
    };

    this.isRunning = false;
    this.hands = null;
    this.camera = null;
    this.stream = null;
    this.mirrorMode = true; // 視訊鏡像投影
  }

  /**
   * 初始化 MediaPipe Hands
   */
  async init() {
    try {
      if (typeof Hands === 'undefined') {
        throw new Error('MediaPipe Hands 程式庫尚未載入完成');
      }

      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      // 設置門檻 0.5，大幅提升各類光線環境與小學生手掌的捕捉率
      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.hands.onResults((results) => this.processResults(results));

      return true;
    } catch (err) {
      console.error('[GestureEngine] 初始化失敗:', err);
      if (this.onError) this.onError(err);
      return false;
    }
  }

  /**
   * 啟動攝影機串流
   */
  async startCamera() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的瀏覽器不支援視訊鏡頭存取');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();

      this.canvas.width = this.video.videoWidth || 1280;
      this.canvas.height = this.video.videoHeight || 720;
      this.isRunning = true;

      // 建立 MediaPipe Camera 輔助排程
      if (typeof Camera !== 'undefined') {
        this.camera = new Camera(this.video, {
          onFrame: async () => {
            if (this.isRunning && this.hands) {
              await this.hands.send({ image: this.video });
            }
          },
          width: 1280,
          height: 720
        });
        await this.camera.start();
      } else {
        // 自製 requestAnimationFrame 補丁
        this.renderLoop();
      }

      if (this.onCameraReady) {
        this.onCameraReady({
          width: this.canvas.width,
          height: this.canvas.height
        });
      }

      return true;
    } catch (err) {
      console.warn('[GestureEngine] 無法啟動視訊鏡頭:', err);
      if (this.onError) this.onError(err);
      return false;
    }
  }

  /**
   * 停止攝影機與推論
   */
  stop() {
    this.isRunning = false;
    if (this.camera && typeof this.camera.stop === 'function') {
      this.camera.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * 手動渲染迴圈（備援機制）
   */
  async renderLoop() {
    if (!this.isRunning) return;
    if (this.video.readyState >= 2 && this.hands) {
      await this.hands.send({ image: this.video });
    }
    requestAnimationFrame(() => this.renderLoop());
  }

  /**
   * 處理 MediaPipe 傳回的手部關鍵點結果
   */
  processResults(results) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 清空畫布
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 鏡像繪製視訊背景
    if (this.mirrorMode) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(results.image, 0, 0, w, h);
    ctx.restore();

    // 繪製中央分界線與區域標籤
    this.drawBoundaryOverlay(w, h);

    // 重設當前左右區狀態
    let detectedLeft = { gesture: 'NONE', confidence: 0, x: 0, y: 0, rawOpenCount: 0 };
    let detectedRight = { gesture: 'NONE', confidence: 0, x: 0, y: 0, rawOpenCount: 0 };

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        
        // 取得手掌中心（以 MCP 9 為代表）
        // 鏡像後的畫面 X 座標為：(1 - landmarks.x)
        const mirrorX = 1.0 - landmarks[9].x;
        const screenY = landmarks[9].y;

        // 計算該手張開的手指數量與手勢分類
        const gestureInfo = this.classifyGesture(landmarks);

        // 判斷屬於左半區還是右半區（雙人合作時兩人都用右手，分別在左半區與右半區比）
        const isLeftZone = mirrorX < 0.5;

        // 繪製骨架與手勢標籤
        this.drawHandSkeleton(landmarks, gestureInfo, mirrorX, screenY, w, h);

        if (isLeftZone) {
          detectedLeft = {
            gesture: gestureInfo.gesture,
            confidence: gestureInfo.confidence,
            x: mirrorX,
            y: screenY,
            rawOpenCount: gestureInfo.openCount
          };
        } else {
          detectedRight = {
            gesture: gestureInfo.gesture,
            confidence: gestureInfo.confidence,
            x: mirrorX,
            y: screenY,
            rawOpenCount: gestureInfo.openCount
          };
        }
      }
    }

    this.currentState = { left: detectedLeft, right: detectedRight };

    // 通知外部遊戲邏輯
    if (this.onGestureUpdate) {
      this.onGestureUpdate(this.currentState);
    }
  }

  /**
   * 手勢分類演算法：Open Palm 🖐️ vs Fist ✊
   * 根據 21 點骨架計算手指伸展程度，特別寬容小學生手型
   */
  classifyGesture(landmarks) {
    const wrist = landmarks[0];
    let openCount = 0;

    // 1. 食指、中指、無名指、小指 (4 指)
    const fingers = [
      { tip: 8, pip: 6, mcp: 5 },   // 食指
      { tip: 12, pip: 10, mcp: 9 }, // 中指
      { tip: 16, pip: 14, mcp: 13 },// 無名指
      { tip: 20, pip: 18, mcp: 17 } // 小指
    ];

    for (const f of fingers) {
      const distTipWrist = this.euclideanDist(landmarks[f.tip], wrist);
      const distPipWrist = this.euclideanDist(landmarks[f.pip], wrist);
      const distMcpWrist = this.euclideanDist(landmarks[f.mcp], wrist);

      // 當指尖離手腕大於 PIP 關節時，判定為伸展
      if (distTipWrist > distPipWrist * 1.08 || distTipWrist > distMcpWrist * 1.22) {
        openCount++;
      }
    }

    // 2. 大拇指 (Thumb: 4)
    const distThumbTipWrist = this.euclideanDist(landmarks[4], wrist);
    const distThumbIpWrist = this.euclideanDist(landmarks[3], wrist);
    const distThumbMcpWrist = this.euclideanDist(landmarks[2], wrist);

    if (distThumbTipWrist > distThumbIpWrist * 1.05 || distThumbTipWrist > distThumbMcpWrist * 1.15) {
      openCount++;
    }

    // 3. 判定手勢：
    // 張手比五：伸展手指數 >= 3（給予小學生手指靈活度充分寬容）
    // 握拳：伸展手指數 <= 1
    let gesture = 'UNKNOWN';
    let confidence = 0.5;

    if (openCount >= 3) {
      gesture = 'OPEN'; // 🖐️ 張開手掌比五
      confidence = openCount >= 4 ? 0.95 : 0.85;
    } else if (openCount <= 1) {
      gesture = 'FIST'; // ✊ 握拳
      confidence = openCount === 0 ? 0.95 : 0.82;
    } else {
      gesture = 'UNKNOWN'; // 2 指等過渡狀態
      confidence = 0.4;
    }

    return { gesture, openCount, confidence };
  }

  /**
   * 計算歐式距離
   */
  euclideanDist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 繪製中央科技分割線
   */
  drawBoundaryOverlay(w, h) {
    const ctx = this.ctx;
    const midX = w / 2;

    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.stroke();

    // 分隔光暈柱
    const grad = ctx.createLinearGradient(midX - 24, 0, midX + 24, 0);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.28)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(midX - 24, 0, 48, h);

    ctx.restore();
  }

  /**
   * 繪製手部骨架與手勢標籤
   */
  drawHandSkeleton(landmarks, gestureInfo, mirrorX, screenY, w, h) {
    const ctx = this.ctx;
    const pixelX = mirrorX * w;
    const pixelY = screenY * h;

    const isFive = gestureInfo.gesture === 'OPEN';
    const isFist = gestureInfo.gesture === 'FIST';
    const themeColor = isFive ? '#22c55e' : (isFist ? '#f59e0b' : '#94a3b8');

    ctx.save();

    // 繪製骨架點
    for (let i = 0; i < landmarks.length; i++) {
      const ptX = (1.0 - landmarks[i].x) * w;
      const ptY = landmarks[i].y * h;

      ctx.beginPath();
      ctx.arc(ptX, ptY, 4, 0, Math.PI * 2);
      ctx.fillStyle = themeColor;
      ctx.fill();
    }

    // 在手掌上方繪製手勢徽章
    const badgeY = Math.max(50, pixelY - 75);
    ctx.beginPath();
    ctx.arc(pixelX, badgeY, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = themeColor;
    ctx.stroke();

    // 繪製 Emoji
    ctx.shadowBlur = 0;
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let emoji = '❓';
    let text = 'Detecting';
    if (isFive) {
      emoji = '🖐️';
      text = 'OPEN';
    } else if (isFist) {
      emoji = '✊';
      text = 'FIST';
    }
    ctx.fillText(emoji, pixelX, badgeY - 2);

    // 文字
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.fillStyle = themeColor;
    ctx.fillText(text, pixelX, badgeY + 44);

    ctx.restore();
  }
}

window.GestureEngine = GestureEngine;
