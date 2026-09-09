/**
 * sound.js - ESL V2 Gesture Showdown 音效與語音朗讀核心模組
 * 包含：
 * 1. Web Audio API 即時合成音效（手勢充能音、正解叮咚、通關大號角）
 * 2. 瀏覽器 Web Speech API (TTS) 題目英文道地發音朗讀
 * 3. 雙類別別名 (GameSound & ShowdownSoundSystem) 保證向後相容
 */

class GameSound {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.speechSynth = window.speechSynthesis || null;
    this.preferredVoice = null;
    this.chargeOsc = null;

    if (this.speechSynth) {
      this.initVoices();
      if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
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

  // 播放點擊音效
  playClick() {
    this.initAudioContext();
    if (this.isMuted || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, this.audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.08);
    } catch (e) {
      // 靜默處理
    }
  }

  // 播放蓄力充能微音
  playHoldCharge(progress = 0.5) {
    this.initAudioContext();
    if (this.isMuted || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      const baseFreq = 440 + (progress * 300);
      osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.06);
    } catch (e) {
      // 靜默處理
    }
  }

  // 答對過關音效 (清脆二段叮咚鈴聲)
  playCorrect() {
    this.initAudioContext();
    if (this.isMuted || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;

      // 第一音：高音 E5 (659Hz)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // 第二音：超高音 B5 (987Hz)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.1);
      gain2.gain.setValueAtTime(0.3, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.45);
    } catch (e) {
      // 靜默處理
    }
  }

  // 勝利通關大號角
  playVictory() {
    this.initAudioContext();
    if (this.isMuted || !this.audioCtx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.audioCtx.currentTime;

      notes.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0.25, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      });
    } catch (e) {
      // 靜默處理
    }
  }

  // 題目美語 TTS 發音
  speak(text, options = {}) {
    if (this.isMuted || !this.speechSynth || !text) return;
    try {
      this.speechSynth.cancel(); // 停止先前的朗讀
      const cleanText = text.replace(/[\(\)（）\/\.]/g, ' ').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1.05;

      if (!this.preferredVoice) this.initVoices();
      if (this.preferredVoice) utterance.voice = this.preferredVoice;

      this.speechSynth.speak(utterance);
    } catch (e) {
      console.warn('[GameSound] TTS 朗讀失敗:', e);
    }
  }

  speakEnglish(text, cb) {
    this.speak(text);
    if (cb) setTimeout(cb, 500);
  }
}

// 註冊至全域
window.GameSound = GameSound;
window.ShowdownSoundSystem = GameSound;
window.soundSystem = new GameSound();
