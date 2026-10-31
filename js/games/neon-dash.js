// Game 2: Neon Dash (Gravity Warp Runner)
// Instant-reflex one-button gravity flipper with dynamic laser obstacles and escalating speeds.

class NeonDashGame {
    constructor(canvas, onEnd) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onEnd = onEnd;
        this.running = false;
        this.animId = null;

        this.meta = {
            id: 'neon-dash',
            title: 'Neon Dash',
            icon: '⚡',
            classification: 'SECTOR 02 // RELATIVISTIC RUNNER',
            threatRating: 'HYPER-VELOCITY',
            objective: 'Invert localized gravity instantly between ceiling and floor to evade high-voltage laser arrays and collect bonus crystals.',
            controls: [
                { key: 'SPACE', action: 'FLIP GRAVITY' },
                { key: 'MOUSE', action: 'TAP SCREEN TO FLIP' }
            ]
        };

        this.player = null;
        this.obstacles = [];
        this.coins = [];
        this.particles = [];
        this.floorY = 0;
        this.ceilingY = 0;
        this.speed = 6.5;
        this.distance = 0;
        this.score = 0;
        this.lastObstacleSpawn = 0;

        this.bindEvents();
    }

    bindEvents() {
        this.handleAction = (e) => {
            if (!this.running || !this.player || !this.player.alive) return;
            if (e.code === 'Space' || e.type === 'pointerdown') {
                if (e.preventDefault) e.preventDefault();
                this.flipGravity();
            }
        };

        window.addEventListener('keydown', this.handleAction);
        this.canvas.addEventListener('pointerdown', this.handleAction);
    }

    handleResize(w, h) {
        const padY = h < 550 ? 55 : 80;
        this.ceilingY = padY;
        this.floorY = h - padY;
        if (this.player) {
            this.player.x = Math.max(60, Math.min(140, w * 0.2));
            if (this.player.gravityDir === 1) {
                this.player.y = Math.min(this.player.y, this.floorY - this.player.height);
            } else {
                this.player.y = Math.max(this.player.y, this.ceilingY);
            }
        }
    }

    destroy() {
        this.running = false;
        cancelAnimationFrame(this.animId);
        window.removeEventListener('keydown', this.handleAction);
        this.canvas.removeEventListener('pointerdown', this.handleAction);
    }

    flipGravity() {
        if (!this.running || !this.player || !this.player.alive) return;
        this.player.gravityDir *= -1;
        this.player.vy = this.player.gravityDir * 3;
        if (window.KuraSounds) window.KuraSounds.playBounce();

        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.player.x,
                y: this.player.y + (this.player.gravityDir === 1 ? -10 : 10),
                vx: -Math.random() * 4 - 2,
                vy: (Math.random() - 0.5) * 6,
                color: '#00D9F5',
                life: 1.0,
                decay: 0.08,
                size: 3
            });
        }
    }

    start() {
        this.running = true;
        const padY = this.canvas.height < 550 ? 55 : 80;
        this.ceilingY = padY;
        this.floorY = this.canvas.height - padY;
        this.speed = 7;
        this.distance = 0;
        this.score = 0;
        this.obstacles = [];
        this.coins = [];
        this.particles = [];

        this.player = {
            x: Math.max(60, Math.min(140, this.canvas.width * 0.2)),
            y: this.floorY - 24,
            width: 24,
            height: 24,
            vy: 0,
            gravityDir: 1,
            alive: true,
            trail: []
        };

        this.lastTime = performance.now();
        this.lastObstacleSpawn = performance.now();
        this.loop();
    }

    spawnObstacle() {
        const isCeiling = Math.random() > 0.5;
        const width = 28 + Math.random() * 15;
        const height = 65 + Math.random() * 55;
        const y = isCeiling ? this.ceilingY : this.floorY - height;

        this.obstacles.push({
            x: this.canvas.width + 50,
            y,
            width,
            height,
            isCeiling,
            passed: false
        });

        if (Math.random() > 0.4) {
            this.coins.push({
                x: this.canvas.width + 50 + width + 40,
                y: (this.ceilingY + this.floorY) / 2 + (Math.random() - 0.5) * 80,
                size: 10,
                collected: false
            });
        }
    }

    update(dt) {
        if (!this.player.alive) return;

        this.speed += 0.25 * dt;
        this.distance += this.speed * 60 * dt;
        this.score = Math.floor(this.distance / 10);

        const gravityStrength = 38;
        this.player.vy += this.player.gravityDir * gravityStrength * dt;
        this.player.y += this.player.vy;

        if (this.player.gravityDir === 1 && this.player.y + this.player.height >= this.floorY) {
            this.player.y = this.floorY - this.player.height;
            this.player.vy = 0;
        } else if (this.player.gravityDir === -1 && this.player.y <= this.ceilingY) {
            this.player.y = this.ceilingY;
            this.player.vy = 0;
        }

        this.player.trail.push({ x: this.player.x, y: this.player.y, alpha: 0.6 });
        if (this.player.trail.length > 8) this.player.trail.shift();

        const spawnInterval = Math.max(900, 1800 - this.speed * 50);
        if (performance.now() - this.lastObstacleSpawn > spawnInterval) {
            this.spawnObstacle();
            this.lastObstacleSpawn = performance.now();
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed * 60 * dt;

            if (this.checkCollision(this.player, obs)) {
                this.crashPlayer();
                return;
            }

            if (obs.x + obs.width < 0) {
                this.obstacles.splice(i, 1);
            }
        }

        for (let i = this.coins.length - 1; i >= 0; i--) {
            const c = this.coins[i];
            c.x -= this.speed * 60 * dt;

            const dx = (this.player.x + this.player.width / 2) - c.x;
            const dy = (this.player.y + this.player.height / 2) - c.y;
            if (Math.hypot(dx, dy) < 26) {
                if (window.KuraSounds) window.KuraSounds.playScore();
                this.score += 50;
                this.distance += 500;
                for (let k = 0; k < 10; k++) {
                    this.particles.push({
                        x: c.x,
                        y: c.y,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        color: '#FFE600',
                        life: 1.0,
                        decay: 0.05,
                        size: 3
                    });
                }
                this.coins.splice(i, 1);
            } else if (c.x < -20) {
                this.coins.splice(i, 1);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= pt.decay;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }
    }

    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    crashPlayer() {
        this.player.alive = false;
        if (window.KuraSounds) {
            window.KuraSounds.playCrash();
            window.KuraSounds.playLaser();
        }

        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 9 + 2;
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: i % 2 === 0 ? '#00D9F5' : '#FF3366',
                life: 1.0,
                decay: 0.04,
                size: 4
            });
        }

        let isNewRecord = false;
        let stats = { highScore: 0 };
        if (window.KuraLeaderboard) {
            const res = window.KuraLeaderboard.recordGameResult('neon-dash', this.score);
            isNewRecord = res.isNewRecord;
            stats = res.stats;
        }

        setTimeout(() => {
            if (this.onEnd) {
                this.onEnd({
                    won: false,
                    title: isNewRecord ? 'NEW HIGH SCORE!' : 'CRASHED!',
                    score: `DISTANCE: ${this.score}m (BEST: ${stats.highScore}m)`,
                    numericScore: this.score
                });
            }
        }, 800);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.strokeStyle = '#00F5A0';
        this.ctx.shadowColor = '#00F5A0';
        this.ctx.shadowBlur = 12;
        this.ctx.lineWidth = 3;

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.ceilingY);
        this.ctx.lineTo(this.canvas.width, this.ceilingY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.floorY);
        this.ctx.lineTo(this.canvas.width, this.floorY);
        this.ctx.stroke();
        this.ctx.restore();

        this.particles.forEach(pt => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, pt.life);
            this.ctx.fillStyle = pt.color;
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        this.coins.forEach(c => {
            this.ctx.save();
            this.ctx.shadowColor = '#FFE600';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#FFE600';
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        this.obstacles.forEach(obs => {
            this.ctx.save();
            this.ctx.shadowColor = '#FF3366';
            this.ctx.shadowBlur = 14;
            this.ctx.fillStyle = '#FF3366';
            this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(obs.x + 3, obs.y, obs.width - 6, obs.height);
            this.ctx.restore();
        });

        if (this.player.alive) {
            this.player.trail.forEach(t => {
                this.ctx.save();
                this.ctx.globalAlpha = t.alpha;
                this.ctx.fillStyle = '#00D9F5';
                this.ctx.fillRect(t.x, t.y, this.player.width, this.player.height);
                this.ctx.restore();
            });

            this.ctx.save();
            this.ctx.shadowColor = '#00D9F5';
            this.ctx.shadowBlur = 16;
            this.ctx.fillStyle = '#00D9F5';
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(this.player.x + 6, this.player.y + 6, this.player.width - 12, this.player.height - 12);
            this.ctx.restore();
        }

        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 20px "Space Grotesk", sans-serif';
        this.ctx.fillText(`${this.score}m`, 40, 50);

        this.ctx.font = '14px "JetBrains Mono", monospace';
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.fillText(`SPEED: ${(this.speed * 10).toFixed(0)} KM/H`, 40, 72);
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
window.KuraGames['neon-dash'] = NeonDashGame;
