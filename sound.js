/**
 * sound.js - ESL V2 Gesture Showdown 音效與語音朗讀核心模組
 * 包含：
 * 1. Web Audio API 即時合成音效（手勢充能音、正解叮咚、答錯警示、通關大號角）
 * 2. 瀏覽器 Web Speech API (TTS) 題目英文道地發音朗讀
 * 3. 節奏感強烈的對決背景音樂合成器
 */

class ShowdownSoundSystem {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.bgmTimer = null;
    this.speechSynth = window.speechSynthesis || null;
    this.preferredVoice = null;

    if (this.speechSynth) {
      this.initVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  // 初始化音訊環境
  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  initVoices() {
    if (!this.speechSynth) return;
    const voices = this.speechSynth.getVoices();
    this.preferredVoice =
      voices.find(v => v.lang === 'en-US' && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny'))) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.speechSynth) this.speechSynth.cancel();
      this.stopBgm();
    }
    return this.isMuted;
  }

  // 朗讀題目英文 (Web Speech API TTS)
  speakEnglish(text, onEnded = null) {
    if (this.isMuted || !this.speechSynth) {
      if (onEnded) setTimeout(onEnded, 300);
      return;
    }

    this.speechSynth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.92;
    utter.pitch = 1.05;

    if (this.preferredVoice) {
      utter.voice = this.preferredVoice;
    }

    utter.onend = () => { if (onEnded) onEnded(); };
    utter.onerror = () => { if (onEnded) onEnded(); };
    this.speechSynth.speak(utter);
  }

  // 朗讀中文 (備用)
  speakChinese(text, onEnded = null) {
    if (this.isMuted || !this.speechSynth) {
      if (onEnded) setTimeout(onEnded, 300);
      return;
    }
    this.speechSynth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-TW';
    utter.rate = 0.95;
    utter.onend = () => { if (onEnded) onEnded(); };
    utter.onerror = () => { if (onEnded) onEnded(); };
    this.speechSynth.speak(utter);
  }

  // 手勢鎖定充能音 (Charging Dwell Sound)
  playChargeTick(progress = 0) {
    if (this.isMuted || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    // 隨著充能進度頻率上升 (400Hz -> 880Hz)
    osc.frequency.setValueAtTime(400 + progress * 480, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  // 答對成功過關音 (Success Chime)
  playSuccessSound() {
    if (this.isMuted || !this.audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.audioCtx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.18, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.26);
    });
  }

  // 答錯提示音 (Wrong Sound)
  playWrongSound() {
    if (this.isMuted || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.22);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  // 通關大號角 (Victory Fanfare)
  playVictoryFanfare() {
    if (this.isMuted || !this.audioCtx) return;
    const melody = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.50, d: 0.38 }
    ];
    let offset = 0;
    const now = this.audioCtx.currentTime;

    melody.forEach(m => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(m.f, now + offset);

      gain.gain.setValueAtTime(0.22, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + m.d);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + m.d + 0.05);
      offset += m.d;
    });
  }

  // 輕快背景音
  startBgm() {
    if (this.isMuted || !this.audioCtx || this.bgmTimer) return;
    const bassline = [130.81, 146.83, 164.81, 174.61]; // C3, D3, E3, F3
    let step = 0;

    const playBeat = () => {
      if (this.isMuted || !this.audioCtx) return;
      const freq = bassline[step % bassline.length];
      const now = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.42);

      step++;
      this.bgmTimer = setTimeout(playBeat, 500);
    };

    playBeat();
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

window.soundSystem = new ShowdownSoundSystem();
