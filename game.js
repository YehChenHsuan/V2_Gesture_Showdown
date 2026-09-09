/**
 * V2 Gesture Duo: Team Challenge (手勢默契大作戰 - 雙人合作闖關)
 * 遊戲主邏輯模組 (GameApp)
 * 支援三大練習模式、極速碼錶、TTS 發音、蓄力穩定檢驗與排行榜
 */

class GameApp {
  constructor() {
    // 預設三大模式題庫
    this.MODES = {
      after_school: {
        id: 'after_school',
        title: 'What Do You Do After School?',
        subtitle: '課本 Page 8：I / You / We 代名詞合作挑戰',
        leftLabel: 'I',
        rightLabel: 'You',
        items: this.generateAfterSchoolQuestions()
      },
      day_or_night: {
        id: 'day_or_night',
        title: 'Day or Night?',
        subtitle: '課本 Page 9：日常作息時間分類合作',
        leftLabel: 'Day ☀️',
        rightLabel: 'Night 🌙',
        items: this.generateDayOrNightQuestions()
      },
      custom: {
        id: 'custom',
        title: "Teacher's Custom Challenge",
        subtitle: '教師自由設定自訂題庫與手勢答案',
        leftLabel: 'Option A',
        rightLabel: 'Option B',
        items: []
      }
    };

    // 遊戲狀態變數
    this.currentModeKey = 'after_school';
    this.questionCountSetting = 5; // 5, 10, 15, 'all'
    this.playlist = [];
    this.currentIndex = 0;
    this.currentQuestion = null;

    // 極速碼錶
    this.timerStartTime = 0;
    this.timerInterval = null;
    this.elapsedMilliseconds = 0;
    this.isGameActive = false;

    // 手勢蓄力與穩定檢驗 (Dwell time: 350ms)
    this.dwellRequiredMs = 350;
    this.dwellStartTime = null;
    this.isDwellLocked = false;

    // 模擬手勢狀態 (備援快速鍵或滑鼠點擊)
    this.manualOverride = {
      left: 'FIST',
      right: 'FIST'
    };
    this.useManualInput = false;

    // 實例化音效與語音
    this.sound = new GameSound();
    this.gestureEngine = null;

    // DOM 元素快取
    this.dom = {};
  }

  /**
   * 初始化系統與事件綁定
   */
  init() {
    this.cacheDom();
    this.loadCustomQuestions();
    this.bindEvents();
    this.renderModeCards();
    this.initGestureEngine();
    console.log('[GameApp] 系統初始化完成');
  }

  /**
   * 建立 Mode 1 題庫 (What Do You Do After School?)
   */
  generateAfterSchoolQuestions() {
    const actions = [
      { text: 'go home', zh: '回家', img: 'assets/V2_flashcards_images/go home.jpg' },
      { text: 'do homework', zh: '寫功課', img: 'assets/V2_flashcards_images/do homework.jpg' },
      { text: 'eat dinner', zh: '吃晚餐', img: 'assets/V2_flashcards_images/eat dinner.jpg' },
      { text: 'take a bath', zh: '洗澡', img: 'assets/V2_flashcards_images/take a bath.jpg' },
      { text: 'go to bed', zh: '上床睡覺', img: 'assets/V2_flashcards_images/go to bed.jpg' },
      { text: 'go to sleep', zh: '去睡覺', img: 'assets/V2_flashcards_images/go to sleep.jpg' }
    ];

    const pronouns = [
      { subject: 'I', target: 'LEFT_OPEN', hint: '題目是 I ➔ 左邊張手 🖐️，右邊握拳 ✊' },
      { subject: 'You', target: 'RIGHT_OPEN', hint: '題目是 You ➔ 右邊張手 🖐️，左邊握拳 ✊' },
      { subject: 'We', target: 'BOTH_OPEN', hint: '題目是 We ➔ 雙人都要張手 🖐️ + 🖐️' }
    ];

    const list = [];
    pronouns.forEach(p => {
      actions.forEach(a => {
        list.push({
          sentence: `${p.subject} ${a.text}.`,
          subject: p.subject,
          actionText: a.text,
          actionZh: a.zh,
          img: a.img,
          targetGesture: p.target, // 'LEFT_OPEN', 'RIGHT_OPEN', 'BOTH_OPEN'
          ruleHint: p.hint
        });
      });
    });
    return list;
  }

  /**
   * 建立 Mode 2 題庫 (Day or Night?)
   */
  generateDayOrNightQuestions() {
    return [
      {
        sentence: 'wake up',
        actionZh: '起床',
        img: 'assets/V2_flashcards_images/wake up.jpg',
        targetGesture: 'LEFT_OPEN', // Day = Left Open, Right Fist
        ruleHint: 'wake up 是早晨作息 ➔ Day (左邊張手 🖐️，右邊握拳 ✊)'
      },
      {
        sentence: 'eat breakfast',
        actionZh: '吃早餐',
        img: 'assets/V2_flashcards_images/eat breakfast.jpg',
        targetGesture: 'LEFT_OPEN', // Day
        ruleHint: 'eat breakfast 是白天的作息 ➔ Day (左邊張手 🖐️，右邊握拳 ✊)'
      },
      {
        sentence: 'go to school',
        actionZh: '上學',
        img: 'assets/V2_flashcards_images/go to school.jpg',
        targetGesture: 'LEFT_OPEN', // Day
        ruleHint: 'go to school 是白天的行程 ➔ Day (左邊張手 🖐️，右邊握拳 ✊)'
      },
      {
        sentence: 'eat lunch',
        actionZh: '吃午餐',
        img: 'assets/V2_flashcards_images/eat lunch.jpg',
        targetGesture: 'LEFT_OPEN', // Day
        ruleHint: 'eat lunch 是中午時光 ➔ Day (左邊張手 🖐️，右邊握拳 ✊)'
      },
      {
        sentence: 'do homework',
        actionZh: '寫功課',
        img: 'assets/V2_flashcards_images/do homework.jpg',
        targetGesture: 'RIGHT_OPEN', // Night = Left Fist, Right Open
        ruleHint: 'do homework 放學課後作息 ➔ Night (左邊握拳 ✊，右邊張手 🖐️)'
      },
      {
        sentence: 'eat dinner',
        actionZh: '吃晚餐',
        img: 'assets/V2_flashcards_images/eat dinner.jpg',
        targetGesture: 'RIGHT_OPEN', // Night
        ruleHint: 'eat dinner 是晚上晚餐 ➔ Night (左邊握拳 ✊，右邊張手 🖐️)'
      },
      {
        sentence: 'take a bath',
        actionZh: '洗澡洗香香',
        img: 'assets/V2_flashcards_images/take a bath.jpg',
        targetGesture: 'RIGHT_OPEN', // Night
        ruleHint: 'take a bath 睡前沐浴 ➔ Night (左邊握拳 ✊，右邊張手 🖐️)'
      },
      {
        sentence: 'go to bed',
        actionZh: '上床就寢',
        img: 'assets/V2_flashcards_images/go to bed.jpg',
        targetGesture: 'RIGHT_OPEN', // Night
        ruleHint: 'go to bed 夜晚就寢 ➔ Night (左邊握拳 ✊，右邊張手 🖐️)'
      },
      {
        sentence: 'go to sleep',
        actionZh: '進入甜美夢鄉',
        img: 'assets/V2_flashcards_images/go to sleep.jpg',
        targetGesture: 'RIGHT_OPEN', // Night
        ruleHint: 'go to sleep 夜晚睡覺 ➔ Night (左邊握拳 ✊，右邊張手 🖐️)'
      }
    ];
  }

  /**
   * 快取 DOM 元素
   */
  cacheDom() {
    this.dom = {
      // 頁面畫面
      screenHome: document.getElementById('screen-home'),
      screenGame: document.getElementById('screen-game'),
      screenVictoryModal: document.getElementById('screen-victory-modal'),
      screenLeaderboardModal: document.getElementById('screen-leaderboard-modal'),
      screenCustomModal: document.getElementById('screen-custom-modal'),

      // 首頁控制項
      modeCardsContainer: document.getElementById('mode-cards-container'),
      countButtons: document.querySelectorAll('.btn-count-opt'),
      btnStartGame: document.getElementById('btn-start-game'),
      btnOpenLeaderboard: document.getElementById('btn-open-leaderboard'),
      btnOpenCustomEditor: document.getElementById('btn-open-custom-editor'),

      // 遊戲中頂部題目橫幅
      questionSentence: document.getElementById('question-sentence'),
      questionZh: document.getElementById('question-zh'),
      questionImage: document.getElementById('question-image'),
      questionImagePlaceholder: document.getElementById('question-image-placeholder'),
      btnSpeakQuestion: document.getElementById('btn-speak-question'),
      stopwatchText: document.getElementById('stopwatch-text'),
      progressBadge: document.getElementById('progress-badge'),
      ruleHintText: document.getElementById('rule-hint-text'),

      // 遊戲中左右半區標籤與狀態
      labelLeft: document.getElementById('zone-label-left'),
      labelRight: document.getElementById('zone-label-right'),
      statusBadgeLeft: document.getElementById('status-badge-left'),
      statusBadgeRight: document.getElementById('status-badge-right'),
      btnManualLeft: document.getElementById('btn-manual-left'),
      btnManualRight: document.getElementById('btn-manual-right'),

      // 蓄力環與反饋
      dwellRing: document.getElementById('dwell-ring-progress'),
      dwellContainer: document.getElementById('dwell-container'),
      feedbackOverlay: document.getElementById('feedback-overlay'),

      // 視訊與畫布
      webcamVideo: document.getElementById('webcam-video'),
      gestureCanvas: document.getElementById('gesture-canvas'),
      cameraStatusText: document.getElementById('camera-status-text'),
      btnExitGame: document.getElementById('btn-exit-game'),

      // 結算與排行榜彈窗
      finalTimeDisplay: document.getElementById('final-time-display'),
      teamNameInput: document.getElementById('team-name-input'),
      btnSaveScore: document.getElementById('btn-save-score'),
      btnPlayAgain: document.getElementById('btn-play-again'),
      btnBackHome: document.getElementById('btn-back-home'),
      leaderboardBody: document.getElementById('leaderboard-body'),
      btnCloseLeaderboard: document.getElementById('btn-close-leaderboard'),

      // 教師自訂題庫 DOM
      customLeftLabelInput: document.getElementById('custom-left-label'),
      customRightLabelInput: document.getElementById('custom-right-label'),
      customQuestionList: document.getElementById('custom-questions-list'),
      btnAddCustomQuestion: document.getElementById('btn-add-custom-question'),
      btnSaveCustomConfig: document.getElementById('btn-save-custom-config'),
      btnResetCustomConfig: document.getElementById('btn-reset-custom-config'),
      btnCloseCustomModal: document.getElementById('btn-close-custom-modal')
    };
  }

  /**
   * 初始化 MediaPipe 辨識引擎
   */
  async initGestureEngine() {
    if (!this.dom.webcamVideo || !this.dom.gestureCanvas) return;

    this.gestureEngine = new GestureEngine(this.dom.webcamVideo, this.dom.gestureCanvas, {
      onGestureUpdate: (state) => this.handleGestureUpdate(state),
      onCameraReady: () => {
        if (this.dom.cameraStatusText) {
          this.dom.cameraStatusText.textContent = '📸 視訊鏡頭已就緒（鏡像投影中）';
          this.dom.cameraStatusText.style.color = '#22c55e';
        }
      },
      onError: (err) => {
        console.warn('[GameApp] 鏡頭無法啟用，自動切換至鍵盤/點擊備援模式:', err);
        this.useManualInput = true;
        if (this.dom.cameraStatusText) {
          this.dom.cameraStatusText.textContent = '⚠️ 未偵測到鏡頭：已啟用 A/D 鍵與點擊備援操作';
          this.dom.cameraStatusText.style.color = '#f59e0b';
        }
      }
    });

    await this.gestureEngine.init();
  }

  /**
   * 事件監聽
   */
  bindEvents() {
    // 選擇題數按鈕
    this.dom.countButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        this.dom.countButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.getAttribute('data-count');
        this.questionCountSetting = val === 'all' ? 'all' : parseInt(val, 10);
      });
    });

    // 開始遊戲
    this.dom.btnStartGame.addEventListener('click', () => {
      this.sound.playClick();
      this.startGame();
    });

    // 重新發音
    this.dom.btnSpeakQuestion.addEventListener('click', () => {
      this.sound.playClick();
      this.speakCurrentQuestion();
    });

    // 退出遊戲
    this.dom.btnExitGame.addEventListener('click', () => {
      this.sound.playClick();
      this.exitToHome();
    });

    // 結算儲存分數
    this.dom.btnSaveScore.addEventListener('click', () => {
      this.sound.playClick();
      this.saveLeaderboardScore();
    });

    // 再玩一次
    this.dom.btnPlayAgain.addEventListener('click', () => {
      this.sound.playClick();
      this.dom.screenVictoryModal.classList.add('hidden');
      this.startGame();
    });

    // 返回首頁
    this.dom.btnBackHome.addEventListener('click', () => {
      this.sound.playClick();
      this.dom.screenVictoryModal.classList.add('hidden');
      this.exitToHome();
    });

    // 開啟與關閉排行榜
    this.dom.btnOpenLeaderboard.addEventListener('click', () => {
      this.sound.playClick();
      this.renderLeaderboard();
      this.dom.screenLeaderboardModal.classList.remove('hidden');
    });
    this.dom.btnCloseLeaderboard.addEventListener('click', () => {
      this.sound.playClick();
      this.dom.screenLeaderboardModal.classList.add('hidden');
    });

    // 教師自訂題庫彈窗
    this.dom.btnOpenCustomEditor.addEventListener('click', () => {
      this.sound.playClick();
      this.openCustomEditor();
    });
    this.dom.btnCloseCustomModal.addEventListener('click', () => {
      this.sound.playClick();
      this.dom.screenCustomModal.classList.add('hidden');
    });
    this.dom.btnAddCustomQuestion.addEventListener('click', () => {
      this.sound.playClick();
      this.addCustomQuestionRow();
    });
    this.dom.btnSaveCustomConfig.addEventListener('click', () => {
      this.sound.playClick();
      this.saveCustomQuestions();
    });
    this.dom.btnResetCustomConfig.addEventListener('click', () => {
      this.sound.playClick();
      this.resetCustomQuestions();
    });

    // 點擊備援手勢按鈕 (無相機時點擊切換)
    this.dom.btnManualLeft.addEventListener('click', () => {
      this.sound.playClick();
      this.toggleManualGesture('left');
    });
    this.dom.btnManualRight.addEventListener('click', () => {
      this.sound.playClick();
      this.toggleManualGesture('right');
    });

    // 鍵盤無障礙支援
    window.addEventListener('keydown', (e) => {
      if (!this.isGameActive) return;
      const key = e.key.toLowerCase();

      if (key === 'a') {
        this.toggleManualGesture('left');
      } else if (key === 'd') {
        this.toggleManualGesture('right');
      } else if (key === 'w') {
        // 雙張手
        this.manualOverride.left = 'OPEN';
        this.manualOverride.right = 'OPEN';
        this.useManualInput = true;
        this.updateManualUi();
        this.checkMatchCondition(this.manualOverride.left, this.manualOverride.right);
      } else if (key === 's') {
        // 雙握拳
        this.manualOverride.left = 'FIST';
        this.manualOverride.right = 'FIST';
        this.useManualInput = true;
        this.updateManualUi();
        this.checkMatchCondition(this.manualOverride.left, this.manualOverride.right);
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.speakCurrentQuestion();
      }
    });
  }

  /**
   * 手動切換備援手勢 (FIST ⇄ OPEN)
   */
  toggleManualGesture(side) {
    this.useManualInput = true;
    this.manualOverride[side] = this.manualOverride[side] === 'OPEN' ? 'FIST' : 'OPEN';
    this.updateManualUi();
    this.checkMatchCondition(this.manualOverride.left, this.manualOverride.right);
  }

  /**
   * 更新備援手勢 UI
   */
  updateManualUi() {
    const leftText = this.manualOverride.left === 'OPEN' ? '🖐️ 張手' : '✊ 握拳';
    const rightText = this.manualOverride.right === 'OPEN' ? '🖐️ 張手' : '✊ 握拳';
    this.dom.btnManualLeft.textContent = `左區: ${leftText} (A)`;
    this.dom.btnManualRight.textContent = `右區: ${rightText} (D)`;
    this.dom.statusBadgeLeft.textContent = leftText;
    this.dom.statusBadgeRight.textContent = rightText;
  }

  /**
   * 渲染首頁模式選擇卡片
   */
  renderModeCards() {
    const container = this.dom.modeCardsContainer;
    container.innerHTML = '';

    Object.keys(this.MODES).forEach(key => {
      const mode = this.MODES[key];
      const card = document.createElement('div');
      card.className = `mode-card ${key === this.currentModeKey ? 'active' : ''}`;
      card.setAttribute('data-mode', key);

      let icon = '🤝';
      if (key === 'after_school') icon = '🎒';
      if (key === 'day_or_night') icon = '☀️🌙';
      if (key === 'custom') icon = '✏️';

      card.innerHTML = `
        <div class="mode-card-icon">${icon}</div>
        <div class="mode-card-title">${mode.title}</div>
        <div class="mode-card-subtitle">${mode.subtitle}</div>
        <div class="mode-card-badge">${mode.items.length} 題目</div>
      `;

      card.addEventListener('click', () => {
        this.sound.playClick();
        container.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentModeKey = key;
      });

      container.appendChild(card);
    });
  }

  /**
   * 開始遊戲
   */
  async startGame() {
    const mode = this.MODES[this.currentModeKey];
    if (!mode.items || mode.items.length === 0) {
      alert('該模式題庫尚無題目，請先在「教師自訂題庫」中新增題目！');
      return;
    }

    // 啟動鏡頭串流
    if (this.gestureEngine && !this.gestureEngine.isRunning) {
      await this.gestureEngine.startCamera();
    }

    // 隨機洗牌並選取指定題數
    const shuffled = [...mode.items].sort(() => Math.random() - 0.5);
    const count = this.questionCountSetting === 'all' 
      ? shuffled.length 
      : Math.min(this.questionCountSetting, shuffled.length);

    this.playlist = shuffled.slice(0, count);
    this.currentIndex = 0;
    this.isGameActive = true;
    this.isDwellLocked = false;
    this.dwellStartTime = null;

    // 設定左右半區標籤文字
    this.dom.labelLeft.textContent = mode.leftLabel;
    this.dom.labelRight.textContent = mode.rightLabel;

    // 切換畫面
    this.dom.screenHome.classList.add('hidden');
    this.dom.screenGame.classList.remove('hidden');

    // 啟動極速碼錶
    this.startStopwatch();

    // 載入第一題
    this.loadQuestion(this.currentIndex);
  }

  /**
   * 載入單一題目
   */
  loadQuestion(index) {
    if (index >= this.playlist.length) {
      this.completeGame();
      return;
    }

    this.currentIndex = index;
    this.currentQuestion = this.playlist[index];
    this.isDwellLocked = false;
    this.dwellStartTime = null;
    this.resetDwellUi();

    // 更新題數進度徽章
    this.dom.progressBadge.textContent = `第 ${index + 1} / ${this.playlist.length} 關`;

    // 顯示題目文字
    this.dom.questionSentence.textContent = this.currentQuestion.sentence;
    this.dom.questionZh.textContent = this.currentQuestion.actionZh ? `(${this.currentQuestion.actionZh})` : '';
    this.dom.ruleHintText.textContent = this.currentQuestion.ruleHint || '';

    // 圖片展示
    if (this.currentQuestion.img) {
      this.dom.questionImage.src = this.currentQuestion.img;
      this.dom.questionImage.style.display = 'block';
      this.dom.questionImagePlaceholder.style.display = 'none';
    } else {
      this.dom.questionImage.style.display = 'none';
      this.dom.questionImagePlaceholder.style.display = 'flex';
      this.dom.questionImagePlaceholder.textContent = this.currentQuestion.actionZh || 'ESL Challenge';
    }

    // 自動以瀏覽器美語 TTS 發音
    this.speakCurrentQuestion();
  }

  /**
   * 播放題目美語 TTS
   */
  speakCurrentQuestion() {
    if (!this.currentQuestion) return;
    this.sound.speak(this.currentQuestion.sentence, { rate: 0.9, pitch: 1.05 });
  }

  /**
   * 啟動極速碼錶
   */
  startStopwatch() {
    clearInterval(this.timerInterval);
    this.timerStartTime = performance.now();
    this.elapsedMilliseconds = 0;

    this.timerInterval = setInterval(() => {
      this.elapsedMilliseconds = performance.now() - this.timerStartTime;
      this.dom.stopwatchText.textContent = this.formatTime(this.elapsedMilliseconds);
    }, 50);
  }

  /**
   * 停止極速碼錶
   */
  stopStopwatch() {
    clearInterval(this.timerInterval);
  }

  /**
   * 格式化時間 (分:秒.毫秒一維)
   */
  formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const decimal = Math.floor((ms % 1000) / 100);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}.${decimal}`;
  }

  /**
   * 接收 MediaPipe 手勢更新
   */
  handleGestureUpdate(state) {
    if (!this.isGameActive || this.useManualInput) return;

    const leftGesture = state.left.gesture; // 'OPEN', 'FIST', 'NONE', 'UNKNOWN'
    const rightGesture = state.right.gesture;

    // 即時更新左右徽章
    this.updateStatusBadge(this.dom.statusBadgeLeft, leftGesture);
    this.updateStatusBadge(this.dom.statusBadgeRight, rightGesture);

    // 檢查是否符合當前題目的目標手勢組合
    this.checkMatchCondition(leftGesture, rightGesture);
  }

  /**
   * 更新手勢狀態徽章
   */
  updateStatusBadge(element, gesture) {
    if (gesture === 'OPEN') {
      element.textContent = '🖐️ OPEN';
      element.className = 'status-badge open';
    } else if (gesture === 'FIST') {
      element.textContent = '✊ FIST';
      element.className = 'status-badge fist';
    } else {
      element.textContent = '⏳ 等待出手';
      element.className = 'status-badge waiting';
    }
  }

  /**
   * 核心判斷：手勢組合是否符合題目答案
   */
  checkMatchCondition(leftGesture, rightGesture) {
    if (!this.currentQuestion || this.isDwellLocked) return;

    const target = this.currentQuestion.targetGesture;
    let isMatched = false;

    // 比對規則：
    // LEFT_OPEN: 左邊張手 🖐️，右邊握拳 ✊
    // RIGHT_OPEN: 右邊張手 🖐️，左邊握拳 ✊
    // BOTH_OPEN: 兩邊皆張手 🖐️ + 🖐️
    if (target === 'LEFT_OPEN') {
      isMatched = (leftGesture === 'OPEN' && rightGesture === 'FIST');
    } else if (target === 'RIGHT_OPEN') {
      isMatched = (leftGesture === 'FIST' && rightGesture === 'OPEN');
    } else if (target === 'BOTH_OPEN') {
      isMatched = (leftGesture === 'OPEN' && rightGesture === 'OPEN');
    }

    const now = performance.now();

    if (isMatched) {
      if (!this.dwellStartTime) {
        this.dwellStartTime = now;
        this.sound.playHoldCharge();
      }

      const elapsed = now - this.dwellStartTime;
      const progress = Math.min(1.0, elapsed / this.dwellRequiredMs);
      this.updateDwellUi(progress);

      if (elapsed >= this.dwellRequiredMs) {
        // 蓄力完成！答對過關！
        this.triggerCorrectMatch();
      }
    } else {
      // 動作中斷，重設蓄力
      this.dwellStartTime = null;
      this.resetDwellUi();
    }
  }

  /**
   * 更新蓄力環 UI
   */
  updateDwellUi(progress) {
    if (this.dom.dwellContainer) {
      this.dom.dwellContainer.classList.add('active');
    }
    if (this.dom.dwellRing) {
      const strokeOffset = 188 - (188 * progress);
      this.dom.dwellRing.style.strokeDashoffset = strokeOffset;
    }
  }

  /**
   * 重設蓄力環
   */
  resetDwellUi() {
    if (this.dom.dwellContainer) {
      this.dom.dwellContainer.classList.remove('active');
    }
    if (this.dom.dwellRing) {
      this.dom.dwellRing.style.strokeDashoffset = 188;
    }
  }

  /**
   * 觸發正解過關反饋
   */
  triggerCorrectMatch() {
    this.isDwellLocked = true;
    this.sound.playCorrect();

    // 顯示 Bingo 慶祝特效
    this.dom.feedbackOverlay.classList.remove('hidden');
    this.dom.feedbackOverlay.classList.add('pop-animation');

    setTimeout(() => {
      this.dom.feedbackOverlay.classList.add('hidden');
      this.dom.feedbackOverlay.classList.remove('pop-animation');
      // 前進到下一題
      this.loadQuestion(this.currentIndex + 1);
    }, 650);
  }

  /**
   * 通關結算
   */
  completeGame() {
    this.isGameActive = false;
    this.stopStopwatch();
    this.sound.playVictory();

    const formattedTime = this.formatTime(this.elapsedMilliseconds);
    this.dom.finalTimeDisplay.textContent = formattedTime;

    // 彈出結算視窗
    this.dom.screenVictoryModal.classList.remove('hidden');
  }

  /**
   * 儲存成績至 LocalStorage 合作排行榜
   */
  saveLeaderboardScore() {
    const rawName = this.dom.teamNameInput.value.trim();
    const teamName = rawName || 'Super Duo 🌟';
    const modeKey = this.currentModeKey;
    const count = this.playlist.length;
    const timeMs = this.elapsedMilliseconds;
    const timeStr = this.formatTime(timeMs);
    const dateStr = new Date().toLocaleDateString('zh-TW');

    const key = `v2_duo_leaderboard_${modeKey}_${count}`;
    let records = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) records = JSON.parse(stored);
    } catch (e) {
      records = [];
    }

    records.push({
      name: teamName,
      timeMs: timeMs,
      timeStr: timeStr,
      date: dateStr
    });

    // 依通關耗時由快到慢排序 (毫秒越小越前)
    records.sort((a, b) => a.timeMs - b.timeMs);
    records = records.slice(0, 10); // 取前 10 名

    localStorage.setItem(key, JSON.stringify(records));

    // 隱藏勝利視窗，開啟排行榜展示
    this.dom.screenVictoryModal.classList.add('hidden');
    this.renderLeaderboard();
    this.dom.screenLeaderboardModal.classList.remove('hidden');
  }

  /**
   * 渲染排行榜清單
   */
  renderLeaderboard() {
    const modeKey = this.currentModeKey;
    const count = this.playlist.length || this.questionCountSetting;
    const key = `v2_duo_leaderboard_${modeKey}_${count}`;
    const tbody = this.dom.leaderboardBody;
    tbody.innerHTML = '';

    let records = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) records = JSON.parse(stored);
    } catch (e) {
      records = [];
    }

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 24px; color:#94a3b8;">尚無紀錄，快來挑戰成為第 1 名隊伍！</td></tr>`;
      return;
    }

    records.forEach((r, idx) => {
      const tr = document.createElement('tr');
      let medal = `#${idx + 1}`;
      if (idx === 0) medal = '🥇 1st';
      if (idx === 1) medal = '🥈 2nd';
      if (idx === 2) medal = '🥉 3rd';

      tr.innerHTML = `
        <td class="rank-col">${medal}</td>
        <td class="name-col">${this.escapeHtml(r.name)}</td>
        <td class="time-col font-bold text-emerald-400">${r.timeStr}</td>
        <td class="date-col text-slate-400">${r.date}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * 返回首頁
   */
  exitToHome() {
    this.isGameActive = false;
    this.stopStopwatch();
    this.dom.screenGame.classList.add('hidden');
    this.dom.screenVictoryModal.classList.add('hidden');
    this.dom.screenLeaderboardModal.classList.add('hidden');
    this.dom.screenCustomModal.classList.add('hidden');
    this.dom.screenHome.classList.remove('hidden');
  }

  /**
   * 載入教師自訂題庫 (LocalStorage)
   */
  loadCustomQuestions() {
    try {
      const saved = localStorage.getItem('v2_gesture_custom_config');
      if (saved) {
        const config = JSON.parse(saved);
        this.MODES.custom.leftLabel = config.leftLabel || 'Option A';
        this.MODES.custom.rightLabel = config.rightLabel || 'Option B';
        this.MODES.custom.items = config.items || [];
      } else {
        // 預設教師示範題目
        this.MODES.custom.leftLabel = 'Yes 👍';
        this.MODES.custom.rightLabel = 'No 👎';
        this.MODES.custom.items = [
          {
            sentence: 'Do you like apples?',
            actionZh: '你喜歡蘋果嗎？',
            targetGesture: 'LEFT_OPEN',
            ruleHint: '喜歡 ➔ Yes (左邊張手 🖐️，右邊握拳 ✊)'
          },
          {
            sentence: 'Is it cold outside?',
            actionZh: '外面天氣冷嗎？',
            targetGesture: 'RIGHT_OPEN',
            ruleHint: '不冷 ➔ No (左邊握拳 ✊，右邊張手 🖐️)'
          },
          {
            sentence: 'Are we good friends?',
            actionZh: '我們是好朋友嗎？',
            targetGesture: 'BOTH_OPEN',
            ruleHint: '當然是！➔ 雙人都要張手 🖐️ + 🖐️'
          }
        ];
      }
    } catch (e) {
      console.warn('[GameApp] 載入自訂題目失敗，重設為預設:', e);
    }
  }

  /**
   * 開啟教師自訂編輯彈窗
   */
  openCustomEditor() {
    this.dom.customLeftLabelInput.value = this.MODES.custom.leftLabel;
    this.dom.customRightLabelInput.value = this.MODES.custom.rightLabel;
    this.renderCustomQuestionRows();
    this.dom.screenCustomModal.classList.remove('hidden');
  }

  /**
   * 渲染自訂題庫列表
   */
  renderCustomQuestionRows() {
    const list = this.dom.customQuestionList;
    list.innerHTML = '';

    this.MODES.custom.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'custom-question-row';
      row.innerHTML = `
        <div class="row-num">#${index + 1}</div>
        <input type="text" class="custom-sentence-input" placeholder="英文題目 (例如: Do you like apples?)" value="${this.escapeHtml(item.sentence)}">
        <input type="text" class="custom-zh-input" placeholder="中文釋義 (例如: 你喜歡蘋果嗎？)" value="${this.escapeHtml(item.actionZh || '')}">
        <select class="custom-target-select">
          <option value="LEFT_OPEN" ${item.targetGesture === 'LEFT_OPEN' ? 'selected' : ''}>左張右握 (左選區)</option>
          <option value="RIGHT_OPEN" ${item.targetGesture === 'RIGHT_OPEN' ? 'selected' : ''}>左握右張 (右選區)</option>
          <option value="BOTH_OPEN" ${item.targetGesture === 'BOTH_OPEN' ? 'selected' : ''}>雙手張開 (雙人默契)</option>
        </select>
        <button class="btn-delete-row" title="刪除此題">🗑️</button>
      `;

      row.querySelector('.btn-delete-row').addEventListener('click', () => {
        this.sound.playClick();
        this.MODES.custom.items.splice(index, 1);
        this.renderCustomQuestionRows();
      });

      list.appendChild(row);
    });
  }

  /**
   * 新增一筆自訂題目
   */
  addCustomQuestionRow() {
    this.MODES.custom.items.push({
      sentence: 'New Question',
      actionZh: '新題目說明',
      targetGesture: 'LEFT_OPEN',
      ruleHint: '請比出正確手勢'
    });
    this.renderCustomQuestionRows();
  }

  /**
   * 儲存自訂題庫設定
   */
  saveCustomQuestions() {
    const leftLabel = this.dom.customLeftLabelInput.value.trim() || 'Option A';
    const rightLabel = this.dom.customRightLabelInput.value.trim() || 'Option B';
    const rows = this.dom.customQuestionList.querySelectorAll('.custom-question-row');

    const newItems = [];
    rows.forEach(row => {
      const sent = row.querySelector('.custom-sentence-input').value.trim();
      const zh = row.querySelector('.custom-zh-input').value.trim();
      const target = row.querySelector('.custom-target-select').value;
      if (sent) {
        newItems.push({
          sentence: sent,
          actionZh: zh,
          targetGesture: target,
          ruleHint: target === 'LEFT_OPEN' 
            ? `${leftLabel} ➔ 左邊張手 🖐️，右邊握拳 ✊` 
            : (target === 'RIGHT_OPEN' ? `${rightLabel} ➔ 左邊握拳 ✊，右邊張手 🖐️` : '雙人都要張手 🖐️ + 🖐️')
        });
      }
    });

    this.MODES.custom.leftLabel = leftLabel;
    this.MODES.custom.rightLabel = rightLabel;
    this.MODES.custom.items = newItems;

    const config = {
      leftLabel,
      rightLabel,
      items: newItems
    };

    localStorage.setItem('v2_gesture_custom_config', JSON.stringify(config));
    this.renderModeCards();
    this.dom.screenCustomModal.classList.add('hidden');
    alert('教師自訂題庫已成功儲存！');
  }

  /**
   * 重設自訂題庫
   */
  resetCustomQuestions() {
    if (confirm('確定要將自訂題庫重設為預設範例嗎？')) {
      localStorage.removeItem('v2_gesture_custom_config');
      this.loadCustomQuestions();
      this.openCustomEditor();
    }
  }

  /**
   * XSS 防護
   */
  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }
}

// 頁面就緒時啟動
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GameApp();
  window.app.init();
});
