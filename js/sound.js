// Web Audio API Procedural Synthesizer
// Provides instantaneous, zero-latency retro-arcade audio,
// futuristic HUD / sci-fi sound design (@chriscaudio style),
// and full website intro audio sequence inspired by Sound Ex Machina's "UI Sounds: Futuristic".

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('kura_muted') === 'true';
        this.activeSequenceTimers = [];
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('kura_muted', this.muted);
        return this.muted;
    }

    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.2) {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    // ==============================================================
    // SOUND EX MACHINA: "UI SOUNDS FUTURISTIC" - FULL INTRO SUITE
    // ==============================================================

    // 1. Heavy Sci-Fi Power Initialization
    synthDeepSystemAwaken(duration = 1.2) {
        if (this.muted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(38, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + duration);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(80, now);
            filter.frequency.exponentialRampToValueAtTime(650, now + duration);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.35, now + duration * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);

            // Layer with high-tech power hum
            this.playTone(440, 'triangle', 0.2, 0.1);
        } catch (e) {}
    }

    // 2. High-Tech Calculations & Data Processing Streams
    synthCalculationsStream(count = 18) {
        if (this.muted) return;
        this.init();
        for (let i = 0; i < count; i++) {
            const delay = i * 0.055 + (Math.random() * 0.02);
            setTimeout(() => {
                if (this.muted) return;
                const freqs = [1800, 2400, 3100, 3800, 4400];
                const freq = freqs[Math.floor(Math.random() * freqs.length)];
                this.playTone(freq, 'sine', 0.02, 0.08);
            }, delay * 1000);
        }
    }

    // 3. Resonant Holographic Projection Harmonic Drone
    synthHologramProjection(duration = 1.1) {
        if (this.muted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            // Harmonic chord stack (Cyber Glass)
            const freqs = [587.33, 880.00, 1174.66]; // D5, A5, D6
            freqs.forEach(f => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, now);
                gain.gain.setValueAtTime(0.01, now);
                gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + duration);
            });

            // Resonant bandpass filter whoosh
            const bufferSize = this.ctx.sampleRate * 0.5;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const bpf = this.ctx.createBiquadFilter();
            bpf.type = 'bandpass';
            bpf.Q.value = 5.0;
            bpf.frequency.setValueAtTime(300, now);
            bpf.frequency.exponentialRampToValueAtTime(3200, now + 0.45);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.18, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            noise.connect(bpf);
            bpf.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    // 4. Futuristic Notification & System Verified Bell Chime
    synthSciFiNotification() {
        if (this.muted) return;
        this.init();
        const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        chords.forEach((note, i) => {
            setTimeout(() => {
                this.playTone(note, 'sine', 0.28, 0.22);
            }, i * 80);
        });
    }

    // 5. Access Granted Heavy Sub-Bass Impact & Shutter Blast
    synthAccessGrantedSlam() {
        if (this.muted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(26, now + 0.85);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.9);

            // Airlock metallic pressure hiss
            this.playTone(1800, 'square', 0.05, 0.25);
            setTimeout(() => this.playTone(2400, 'triangle', 0.12, 0.2), 60);
        } catch (e) {}
    }

    // Full Synchronized Website Introduction Audio Timeline
    playWebsiteIntroSequence(onTimelineEvent) {
        this.stopActiveSequence();

        const scheduleEvent = (delayMs, eventName, audioFn) => {
            const id = setTimeout(() => {
                if (audioFn) audioFn();
                if (onTimelineEvent) onTimelineEvent(eventName);
            }, delayMs);
            this.activeSequenceTimers.push(id);
        };

        // Timeline calibrated perfectly with Sound Ex Machina's structure:
        // 0.0s: Power awakening
        scheduleEvent(0, 'AWAKEN', () => {
            this.synthDeepSystemAwaken(1.1);
        });

        // 1.1s: Data Calculations stream
        scheduleEvent(1100, 'CALCULATION', () => {
            this.synthCalculationsStream(20);
        });

        // 2.3s: Hologram Projection of Brand & Creator Credit
        scheduleEvent(2300, 'HOLOGRAM', () => {
            this.synthHologramProjection(1.2);
        });

        // 3.5s: System Verification / Notification Chimes
        scheduleEvent(3500, 'VERIFIED', () => {
            this.synthSciFiNotification();
        });

        // 4.6s: Access Granted Slam & Portal Entry
        scheduleEvent(4600, 'ACCESS_GRANTED', () => {
            this.synthAccessGrantedSlam();
        });
    }

    // ==============================================================
    // IN-GAME HUD AUDIO SEQUENCE (@chriscaudio)
    // ==============================================================
    playSciFiHudSequence(onTimelineEvent) {
        this.stopActiveSequence();

        const scheduleEvent = (delayMs, eventName, audioFn) => {
            const id = setTimeout(() => {
                if (audioFn) audioFn();
                if (onTimelineEvent) onTimelineEvent(eventName);
            }, delayMs);
            this.activeSequenceTimers.push(id);
        };

        scheduleEvent(0, 'BOOT', () => {
            this.synthDeepSystemAwaken(0.9);
            this.synthCalculationsStream(10);
        });

        scheduleEvent(800, 'SCAN', () => {
            this.synthHologramProjection(0.8);
            this.synthCalculationsStream(12);
        });

        scheduleEvent(1700, 'TACTICAL', () => {
            this.playTone(850, 'triangle', 0.06, 0.18);
            setTimeout(() => this.playTone(1150, 'triangle', 0.06, 0.18), 70);
            setTimeout(() => this.playTone(1450, 'triangle', 0.08, 0.2), 140);
        });

        scheduleEvent(2600, 'LOCK', () => {
            this.playTone(1350, 'triangle', 0.07, 0.25);
            setTimeout(() => this.playTone(2020, 'triangle', 0.1, 0.3), 90);
        });

        scheduleEvent(3300, 'ENGAGE', () => {
            this.synthAccessGrantedSlam();
        });
    }

    stopActiveSequence() {
        this.activeSequenceTimers.forEach(id => clearTimeout(id));
        this.activeSequenceTimers = [];
    }

    // ==============================================================
    // CORE RETRO SFX
    // ==============================================================
    playClick() {
        this.playTone(800, 'triangle', 0.04, 0.15);
    }

    playHover() {
        this.playTone(520, 'sine', 0.03, 0.05);
    }

    playScore() {
        if (this.muted) return;
        this.init();
        this.playTone(880, 'sine', 0.08, 0.2);
        setTimeout(() => this.playTone(1320, 'sine', 0.12, 0.2), 60);
    }

    playCrash() {
        if (this.muted) return;
        this.init();
        try {
            const bufferSize = this.ctx.sampleRate * 0.2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.2);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start();
        } catch (e) {}
    }

    playVictory() {
        if (this.muted) return;
        this.init();
        const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        chords.forEach((note, i) => {
            setTimeout(() => {
                this.playTone(note, 'triangle', 0.25, 0.25);
            }, i * 90);
        });
    }

    playLaser() {
        this.playTone(990, 'sawtooth', 0.12, 0.2);
    }

    playBounce() {
        this.playTone(320, 'sine', 0.1, 0.25);
    }

    playReflexTrigger() {
        this.playTone(1050, 'square', 0.25, 0.35);
        setTimeout(() => this.playTone(1400, 'square', 0.3, 0.35), 40);
    }
}

window.KuraSounds = new SoundEngine();
