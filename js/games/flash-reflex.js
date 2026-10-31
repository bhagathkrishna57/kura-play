// Game 3: Flash Reflex (Reaction Showdown)
// High-stakes millisecond reaction tester with randomized suspense cues and dual split-screen duel.

class FlashReflexGame {
    constructor(canvas, onEnd) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onEnd = onEnd;
        this.running = false;
        this.animId = null;

        this.meta = {
            id: 'flash-reflex',
            title: 'Flash Reflex',
            icon: '🎯',
            classification: 'SECTOR 03 // SYNAPTIC NEURO-SHOWDOWN',
            threatRating: 'MILLISECOND LATENCY',
            objective: 'Survive randomized suspense delays. Strike your neural trigger the exact millisecond the green visual pulse erupts. Premature presses incur foul penalties.',
            controls: [
                { key: 'SPACE / A', action: 'P1 STRIKE TRIGGER' },
                { key: 'ENTER / L', action: 'P2 STRIKE (2P)' },
                { key: 'MOUSE', action: 'TAP SCREEN TO STRIKE' }
            ]
        };

        this.state = 'WAITING';
        this.startTime = 0;
        this.reactionTime = 0;
        this.timeoutId = null;
        this.mode = 'solo';
        this.player1Time = null;
        this.player2Time = null;

        this.bindEvents();
    }

    bindEvents() {
        this.handleKeyDown = (e) => {
            if (!this.running || this.state === 'FINISHED' || this.state === 'FOUL') return;
            if (e.code === 'KeyA' || e.code === 'Space') {
                e.preventDefault();
                this.triggerPlayer(1);
            }
            if (e.code === 'KeyL' || e.code === 'Enter') {
                e.preventDefault();
                this.triggerPlayer(2);
            }
        };

        this.handlePointerDown = (e) => {
            if (!this.running) return;
            if (this.mode === 'local_2p') {
                const rect = this.canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                if (clickX < this.canvas.width / 2) {
                    this.triggerPlayer(1);
                } else {
                    this.triggerPlayer(2);
                }
            } else {
                this.triggerPlayer(1);
            }
        };

        window.addEventListener('keydown', this.handleKeyDown);
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    }

    destroy() {
        this.running = false;
        clearTimeout(this.timeoutId);
        cancelAnimationFrame(this.animId);
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    }

    start(options = {}) {
        this.running = true;
        this.mode = options.mode || 'solo';
        this.state = 'WAITING';
        this.player1Time = null;
        this.player2Time = null;

        const delay = 1800 + Math.random() * 2700;
        this.timeoutId = setTimeout(() => {
            if (!this.running || this.state !== 'WAITING') return;
            this.state = 'SIGNAL_ACTIVE';
            this.startTime = performance.now();
            if (window.KuraSounds) window.KuraSounds.playReflexTrigger();
        }, delay);

        this.loop();
    }

    triggerPlayer(playerNum) {
        if (this.state === 'WAITING') {
            this.state = 'FOUL';
            if (window.KuraSounds) window.KuraSounds.playCrash();
            clearTimeout(this.timeoutId);

            setTimeout(() => {
                if (this.onEnd) {
                    this.onEnd({
                        won: false,
                        title: `TOO EARLY! FOUL!`,
                        score: `You pressed before the flash. Relax and wait!`
                    });
                }
            }, 1000);
            return;
        }

        if (this.state === 'SIGNAL_ACTIVE') {
            const timeTaken = Math.round(performance.now() - this.startTime);

            if (playerNum === 1 && this.player1Time === null) {
                this.player1Time = timeTaken;
            } else if (playerNum === 2 && this.player2Time === null) {
                this.player2Time = timeTaken;
            }

            if (this.mode === 'solo' || (this.player1Time !== null && this.player2Time !== null)) {
                this.finishRound();
            }
        }
    }

    finishRound() {
        this.state = 'FINISHED';
        if (window.KuraSounds) window.KuraSounds.playScore();

        let title = '';
        let scoreText = '';
        let won = false;

        if (this.mode === 'solo') {
            const ms = this.player1Time;
            let isNewRecord = false;
            let stats = { bestMs: 9999 };
            if (window.KuraLeaderboard) {
                const res = window.KuraLeaderboard.recordGameResult('flash-reflex', ms);
                isNewRecord = res.isNewRecord;
                stats = res.stats;
            }

            won = ms < 250;
            if (won && window.KuraSounds) window.KuraSounds.playVictory();

            let rank = 'MORTAL';
            if (ms < 170) rank = 'CYBER GOD';
            else if (ms < 200) rank = 'PRO ESPORTS';
            else if (ms < 250) rank = 'FAST REFLEX';

            title = `${ms} ms - ${rank}!`;
            scoreText = isNewRecord ? `NEW RECORD! (BEST: ${stats.bestMs}ms)` : `BEST: ${stats.bestMs}ms`;
        } else {
            const p1 = this.player1Time || 9999;
            const p2 = this.player2Time || 9999;
            won = p1 < p2;
            title = p1 < p2 ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!';
            scoreText = `P1: ${p1}ms vs P2: ${p2}ms`;
            if (won && window.KuraSounds) window.KuraSounds.playVictory();
        }

        setTimeout(() => {
            if (this.onEnd) {
                this.onEnd({ won, title, score: scoreText });
            }
        }, 1200);
    }

    render() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        this.ctx.clearRect(0, 0, w, h);

        if (this.state === 'WAITING') {
            this.ctx.fillStyle = '#1A080D';
            this.ctx.fillRect(0, 0, w, h);

            this.ctx.save();
            this.ctx.fillStyle = '#FF3366';
            this.ctx.font = 'bold 36px "Space Grotesk", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#FF3366';
            this.ctx.shadowBlur = 18;
            this.ctx.fillText('WAIT FOR GREEN SIGNAL...', cx, cy - 20);

            this.ctx.font = '16px "JetBrains Mono", monospace';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText('DO NOT PRESS YET! RANDOM DELAY IN PROGRESS', cx, cy + 30);
            this.ctx.restore();
        } else if (this.state === 'SIGNAL_ACTIVE') {
            this.ctx.fillStyle = '#00F5A0';
            this.ctx.fillRect(0, 0, w, h);

            this.ctx.save();
            this.ctx.fillStyle = '#07080C';
            this.ctx.font = '900 68px "Space Grotesk", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CLICK NOW!', cx, cy + 15);
            this.ctx.restore();
        } else if (this.state === 'FOUL') {
            this.ctx.fillStyle = '#FF3366';
            this.ctx.fillRect(0, 0, w, h);

            this.ctx.save();
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '900 52px "Space Grotesk", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('EARLY CLICK! FOUL!', cx, cy + 15);
            this.ctx.restore();
        } else if (this.state === 'FINISHED') {
            this.ctx.fillStyle = '#08090D';
            this.ctx.fillRect(0, 0, w, h);

            this.ctx.save();
            this.ctx.fillStyle = '#00D9F5';
            this.ctx.font = '900 60px "Space Grotesk", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#00D9F5';
            this.ctx.shadowBlur = 20;
            this.ctx.fillText(`${this.player1Time} ms`, cx, cy);
            this.ctx.restore();
        }

        if (this.mode === 'local_2p') {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
            this.ctx.font = '14px "JetBrains Mono", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('P1: [A] or Left Click | P2: [L] or Right Click', cx, h - 35);
            this.ctx.restore();
        }
    }

    loop() {
        if (!this.running) return;
        this.render();
        this.animId = requestAnimationFrame(() => this.loop());
    }
}

window.KuraGames = window.KuraGames || {};
window.KuraGames['flash-reflex'] = FlashReflexGame;
