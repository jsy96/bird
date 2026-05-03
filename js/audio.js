class AudioManager {
    constructor() {
        this.ctx = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.bgmPlaying = false;
        this.bgmNodes = [];
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.15;
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.masterGain);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playFlap(intensity) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const vol = 0.2 + intensity * 0.3;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.value = 800 + intensity * 400;
        filter.Q.value = 2;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200 + intensity * 150, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.15);

        const noise = this.createNoise(0.08, vol * 0.5);
        noise.connect(this.sfxGain);
    }

    playScore() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.25);
        });
    }

    playHit() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const noise = this.createNoise(0.3, 0.5);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);

        noise.connect(filter);
        filter.connect(this.sfxGain);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    playGameOver() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const notes = [440, 415, 392, 370, 349, 330, 311, 294];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.25);
        });
    }

    startBGM() {
        if (!this.ctx || this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.playBGMLoop();
    }

    playBGMLoop() {
        if (!this.bgmPlaying) return;
        const now = this.ctx.currentTime;

        const melody = [
            { note: 261.63, dur: 0.4 },
            { note: 329.63, dur: 0.4 },
            { note: 392.00, dur: 0.4 },
            { note: 523.25, dur: 0.6 },
            { note: 392.00, dur: 0.3 },
            { note: 440.00, dur: 0.5 },
            { note: 392.00, dur: 0.4 },
            { note: 329.63, dur: 0.4 },
            { note: 293.66, dur: 0.6 },
            { note: 261.63, dur: 0.8 },
            { note: 0, dur: 0.3 },
            { note: 293.66, dur: 0.4 },
            { note: 329.63, dur: 0.4 },
            { note: 349.23, dur: 0.4 },
            { note: 392.00, dur: 0.6 },
            { note: 349.23, dur: 0.3 },
            { note: 329.63, dur: 0.5 },
            { note: 293.66, dur: 0.4 },
            { note: 261.63, dur: 0.6 },
            { note: 246.94, dur: 0.8 },
            { note: 0, dur: 0.5 },
        ];

        let time = now;
        const totalDur = melody.reduce((s, n) => s + n.dur, 0);

        melody.forEach(({ note, dur }) => {
            if (note > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = note;

                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.12, time + 0.03);
                gain.gain.setValueAtTime(0.12, time + dur * 0.7);
                gain.gain.linearRampToValueAtTime(0, time + dur * 0.95);

                osc.connect(gain);
                gain.connect(this.bgmGain);
                osc.start(time);
                osc.stop(time + dur);

                this.bgmNodes.push(osc);
            }
            time += dur;
        });

        setTimeout(() => {
            if (this.bgmPlaying) {
                this.playBGMLoop();
            }
        }, totalDur * 1000 - 100);
    }

    stopBGM() {
        this.bgmPlaying = false;
        this.bgmNodes.forEach(n => {
            try { n.stop(); } catch (e) {}
        });
        this.bgmNodes = [];
    }

    createNoise(duration, volume) {
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        source.connect(gain);
        source.start(now);
        source.stop(now + duration);

        return gain;
    }
}
