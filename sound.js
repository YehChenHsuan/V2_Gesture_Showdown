/**
 * sound.js - ESL V2 Gesture Showdown 音效與語音朗讀核心模組
 * 包含：
 * 1. Web Audio API 即時合成音效（手勢充能音、正解叮咚、通關大號角）
 * 2. 瀏覽器 Web Speech API (TTS) 題目英文道地發音朗讀
 * 3. 雙類別別名 (GameSound & ShowdownSoundSystem) 並涵蓋所有相容方法別名
 */

class GameSound {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.speechSynth = window.speechSynthesis || null;
    this.preferredVoice = null;

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

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.speechSynth) {
      this.speechSynth.cancel();
    }
    return this.isMuted;
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
    } catch (e) {}
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
    } catch (e) {}
  }

  playChargeTick(progress = 0.5) {
    this.playHoldCharge(progress);
  }

  // 答對過關音效 (清脆二段叮咚鈴聲)
  playCorrect() {
    this.initAudioContext();
    if (this.isMuted || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;

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
    } catch (e) {}
  }

  playSuccessSound() {
    this.playCorrect();
  }

  // 勝利通關大號角
  playVictory() {
    this.initAudioContext();
    if (this.isMuted || !this.audioCtx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
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
    } catch (e) {}
  }

  playVictoryFanfare() {
    this.playVictory();
  }

  playWrong() {
    this.initAudioContext();
    if (this.isMuted || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playWrongSound() {
    this.playWrong();
  }

  // 題目美語語音播放 (使用 Google Cloud Neural2 最高級預錄音檔)
  speak(text, options = {}) {
    if (this.isMuted || !text) return;
    try {
      const audioMap = {
        "I go home.": "audios/questions/m1_i_go_home.mp3",
        "I do homework.": "audios/questions/m1_i_do_homework.mp3",
        "I eat dinner.": "audios/questions/m1_i_eat_dinner.mp3",
        "I take a bath.": "audios/questions/m1_i_take_a_bath.mp3",
        "I go to bed.": "audios/questions/m1_i_go_to_bed.mp3",
        "I go to sleep.": "audios/questions/m1_i_go_to_sleep.mp3",
        "You go home.": "audios/questions/m1_you_go_home.mp3",
        "You do homework.": "audios/questions/m1_you_do_homework.mp3",
        "You eat dinner.": "audios/questions/m1_you_eat_dinner.mp3",
        "You take a bath.": "audios/questions/m1_you_take_a_bath.mp3",
        "You go to bed.": "audios/questions/m1_you_go_to_bed.mp3",
        "You go to sleep.": "audios/questions/m1_you_go_to_sleep.mp3",
        "We go home.": "audios/questions/m1_we_go_home.mp3",
        "We do homework.": "audios/questions/m1_we_do_homework.mp3",
        "We eat dinner.": "audios/questions/m1_we_eat_dinner.mp3",
        "We take a bath.": "audios/questions/m1_we_take_a_bath.mp3",
        "We go to bed.": "audios/questions/m1_we_go_to_bed.mp3",
        "We go to sleep.": "audios/questions/m1_we_go_to_sleep.mp3",
        "wake up": "audios/questions/m2_wake_up.mp3",
        "eat breakfast": "audios/questions/m2_eat_breakfast.mp3",
        "go to school": "audios/questions/m2_go_to_school.mp3",
        "eat lunch": "audios/questions/m2_eat_lunch.mp3",
        "do homework": "audios/questions/m2_do_homework.mp3",
        "eat dinner": "audios/questions/m2_eat_dinner.mp3",
        "take a bath": "audios/questions/m2_take_a_bath.mp3",
        "go to bed": "audios/questions/m2_go_to_bed.mp3",
        "go to sleep": "audios/questions/m2_go_to_sleep.mp3"
      };

      const cleanText = text.trim();
      const audioPath = audioMap[cleanText] || audioMap[cleanText.replace(/\./g, '')];

      if (audioPath) {
        if (this.currentVoiceAudio) {
          this.currentVoiceAudio.pause();
          this.currentVoiceAudio.currentTime = 0;
        }
        const audio = new Audio(audioPath);
        this.currentVoiceAudio = audio;
        audio.play().catch(() => {});
      }
    } catch (e) {
      console.warn('[GameSound] 音檔播放失敗:', e);
    }
  }

  speakEnglish(text, cb) {
    this.speak(text);
    if (cb) setTimeout(cb, 600);
  }
}

// 註冊至全域
window.GameSound = GameSound;
window.ShowdownSoundSystem = GameSound;
window.soundSystem = new GameSound();
