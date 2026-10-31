// Game: Aim Matrix (Precision Mouse Accuracy & Flick Trainer)
// High-intensity target acquisition testing spatial reflexes, click precision, and micro-flicks.

class AimMatrixGame {
    constructor(canvas, onEnd) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onEnd = onEnd;
        this.running = false;
        this.animId = null;

        this.meta = {
            id: 'aim-matrix',
            title: 'Aim Matrix',
            icon: '🎯',
            classification: 'SECTOR 01 // NEURAL AIM & PRECISION FLICK',
            threatRating: 'PRECISION REFLEX',
            objective: 'Acquire and neutralize holographic targets. Click targets before perimeter countdown rings collapse to chain combos.',
            controls: [
                { key: 'LEFT CLICK', action: 'FIRE PRECISION SHOT' },
                { key: 'MOUSE MOVE', action: 'RAPID TARGET TRACKING' }
            ]
        };

        this.targets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.timeRemaining = 35.0; // 35-second round
        this.maxTargets = 4;
        this.nextSpawnTime = 0;

        this.bindEvents();
    }

    bindEvents() {
        this.handlePointerDown = (e) => {
            if (!this.running) return;
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            this.registerShot(clickX, clickY);
        };

        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    }

    destroy() {
        this.running = false;
        cancelAnimationFrame(this.animId);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    }

    start() {
        this.running = true;
        this.targets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.timeRemaining = 35.0;

        // Spawn initial targets
        for (let i = 0; i < 3; i++) {
            this.spawnTarget();
        }

        this.lastTime = performance.now();
        this.loop();
    }

    spawnTarget() {
        const padding = 90;
        const x = padding + Math.random() * (this.canvas.width - padding * 2);
        const y = padding + 40 + Math.random() * (this.canvas.height - padding * 2 - 40);
        const maxRadius = 32;
        const lifespan = Math.max(1.1, 2.2 - (35 - this.timeRemaining) * 0.03); // gets faster

        // Moving target chance
        const isMoving = Math.random() > 0.6;
        const vx = isMoving ? (Math.random() - 0.5) * 120 : 0;
        const vy = isMoving ? (Math.random() - 0.5) * 120 : 0;

        this.targets.push({
            x,
            y,
            vx,
            vy,
            radius: maxRadius,
            maxRadius,
            lifespan,
            remainingLife: lifespan,
            color: Math.random() > 0.5 ? '#00D9F5' : '#00F5A0',
            innerRingAngle: 0
        });
    }

    registerShot(x, y) {
        this.shotsFired++;
        let hitIndex = -1;

        // Check from top-most (newest) target
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            const dist = Math.hypot(x - t.x, y - t.y);
            if (dist <= t.radius) {
                hitIndex = i;
                break;
            }
        }

        if (hitIndex !== -1) {
            // Hit!
            const t = this.targets[hitIndex];
            this.shotsHit++;
            this.streak++;
            if (this.streak > this.maxStreak) this.maxStreak = this.streak;

            const distFromCenter = Math.hypot(x - t.x, y - t.y);
            const isBullseye = distFromCenter <= t.radius * 0.35;

            const basePoints = isBullseye ? 200 : 100;
            const streakBonus = this.streak * 15;
            const pointsAwarded = basePoints + streakBonus;
            this.score += pointsAwarded;

            if (window.KuraSounds) {
                if (isBullseye) {
                    window.KuraSounds.playScore();
                } else {
                    window.KuraSounds.playTone(900 + this.streak * 30, 'triangle', 0.06, 0.2);
                }
            }

            this.createExplosion(t.x, t.y, t.color, isBullseye);
            this.addFloatingText(t.x, t.y, isBullseye ? `BULLSEYE! +${pointsAwarded}` : `+${pointsAwarded}`, isBullseye ? '#FFE600' : '#00F5A0');

            this.targets.splice(hitIndex, 1);
            this.spawnTarget();
        } else {
            // Miss
            this.streak = 0;
            if (window.KuraSounds) window.KuraSounds.playTone(220, 'sawtooth', 0.08, 0.15);
            this.addFloatingText(x, y, 'MISS', '#FF3366');
            this.createMissSparks(x, y);
        }
    }

    createExplosion(x, y, color, isBullseye) {
        const count = isBullseye ? 24 : 14;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * (isBullseye ? 8 : 5) + 2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: isBullseye ? '#FFE600' : color,
                life: 1.0,
                decay: 0.05,
                size: isBullseye ? 4 : 2.5
            });
        }
    }

    createMissSparks(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: '#FF3366',
                life: 1.0,
                decay: 0.08,
                size: 2
            });
        }
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({
            x,
            y,
            text,
            color,
            alpha: 1.0,
            vy: -1.5
        });
    }

    update(dt) {
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            this.finishGame();
            return;
        }

        // Update targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.remainingLife -= dt;
            t.innerRingAngle += 3.5 * dt;

            // Move target if moving
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            if (t.x < 60 || t.x > this.canvas.width - 60) t.vx *= -1;
            if (t.y < 100 || t.y > this.canvas.height - 60) t.vy *= -1;

            // Target expired without being clicked
            if (t.remainingLife <= 0) {
                this.streak = 0;
                this.createMissSparks(t.x, t.y);
                this.targets.splice(i, 1);
                this.spawnTarget();
            }
        }

        // Maintain target count
        while (this.targets.length < this.maxTargets) {
            this.spawnTarget();
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= pt.decay;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 1.8 * dt;
            if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    finishGame() {
        this.running = false;
        const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
        let rank = 'SHARPSHOOTER';
        if (accuracy > 92 && this.score > 4000) rank = 'CYBER AIMBOT';
        else if (accuracy > 85) rank = 'ELITE SNIPER';
        else if (accuracy < 60) rank = 'NEEDS RE-CALIBRATION';

        if (window.KuraSounds) window.KuraSounds.playVictory();

        let isNewRecord = false;
        let stats = { highScore: 0 };
        if (window.KuraLeaderboard) {
            const res = window.KuraLeaderboard.recordGameResult('aim-matrix', this.score);
            isNewRecord = res.isNewRecord;
            stats = res.stats;
        }

        setTimeout(() => {
            if (this.onEnd) {
                this.onEnd({
                    won: accuracy >= 70,
                    title: isNewRecord ? `NEW RECORD: ${this.score} PTS!` : `${rank}!`,
                    score: `SCORE: ${this.score} | ACCURACY: ${accuracy}% | HITS: ${this.shotsHit}/${this.shotsFired}`,
                    numericScore: this.score
                });
            }
        }, 600);
    }

    render() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        // Subtle Target Grid Lines
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 217, 245, 0.04)';
        this.ctx.lineWidth = 1;
        const step = 80;
        for (let x = 0; x < w; x += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
        this.ctx.restore();

        // Targets
        this.targets.forEach(t => {
            const lifeFraction = Math.max(0, t.remainingLife / t.lifespan);

            this.ctx.save();
            this.ctx.translate(t.x, t.y);

            // Shrinking Outer Countdown Ring
            this.ctx.beginPath();
            this.ctx.arc(0, 0, t.radius * (1 + (1 - lifeFraction) * 0.8), 0, Math.PI * 2 * lifeFraction);
            this.ctx.strokeStyle = lifeFraction > 0.35 ? t.color : '#FF3366';
            this.ctx.lineWidth = 2.5;
            this.ctx.shadowColor = this.ctx.strokeStyle;
            this.ctx.shadowBlur = 10;
            this.ctx.stroke();

            // Main Target Disc
            this.ctx.beginPath();
            this.ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(14, 18, 27, 0.9)';
            this.ctx.strokeStyle = t.color;
            this.ctx.lineWidth = 2;
            this.ctx.fill();
            this.ctx.stroke();

            // Rotating Reticle Crosshairs inside target
            this.ctx.rotate(t.innerRingAngle);
            this.ctx.beginPath();
            this.ctx.moveTo(-t.radius * 0.7, 0);
            this.ctx.lineTo(t.radius * 0.7, 0);
            this.ctx.moveTo(0, -t.radius * 0.7);
            this.ctx.lineTo(0, t.radius * 0.7);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            // Bullseye Core
            this.ctx.beginPath();
            this.ctx.arc(0, 0, t.radius * 0.35, 0, Math.PI * 2);
            this.ctx.fillStyle = t.color;
            this.ctx.shadowColor = t.color;
            this.ctx.shadowBlur = 12;
            this.ctx.fill();

            this.ctx.restore();
        });

        // Particles
        this.particles.forEach(pt => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, pt.life);
            this.ctx.fillStyle = pt.color;
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // Floating Hit Text
        this.floatingTexts.forEach(ft => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, ft.alpha);
            this.ctx.fillStyle = ft.color;
            this.ctx.font = 'bold 15px "JetBrains Mono", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = ft.color;
            this.ctx.shadowBlur = 8;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        });

        // Top HUD Stats
        const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 100;
        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 22px "Space Grotesk", sans-serif';
        this.ctx.fillText(`SCORE: ${this.score}`, 40, 50);

        this.ctx.font = '14px "JetBrains Mono", monospace';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillText(`ACCURACY: ${accuracy}% | STREAK: ${this.streak} 🔥`, 40, 75);

        // Time Countdown
        this.ctx.textAlign = 'right';
        this.ctx.font = '900 28px "Space Grotesk", sans-serif';
        this.ctx.fillStyle = this.timeRemaining < 10 ? '#FF3366' : '#00F5A0';
        this.ctx.fillText(`${Math.ceil(this.timeRemaining)}s`, w - 40, 50);

        this.ctx.font = '12px "JetBrains Mono", monospace';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fillText('CLICK TARGETS RAPIDLY', w - 40, 75);
        this.ctx.restore();
    }

    loop() {
        if (!this.running) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.render();
        this.animId = requestAnimationFrame(() => this.loop());
    }
}

window.KuraGames = window.KuraGames || {};
window.KuraGames['aim-matrix'] = AimMatrixGame;
