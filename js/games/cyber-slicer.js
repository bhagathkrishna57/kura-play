// Game: Cyber Slicer (Neon Blade Energy Slicer)
// High-octane kinetic slicing action. Drag mouse to cast your neon laser blade through airborne energy cores.

class CyberSlicerGame {
    constructor(canvas, onEnd) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onEnd = onEnd;
        this.running = false;
        this.animId = null;

        this.meta = {
            id: 'cyber-slicer',
            title: 'Cyber Slicer',
            icon: '⚔️',
            classification: 'SECTOR 04 // KINETIC NEON BLADE',
            threatRating: 'HYPER-KINETIC',
            objective: 'Drag your cursor to cast the laser blade. Slice airborne energy cores in mid-air and avoid slicing volatile red hazard mines.',
            controls: [
                { key: 'MOUSE DRAG', action: 'SWIPE TO SLICE CORES' },
                { key: 'MULTI-SLICE', action: 'CHAIN COMBOS IN ONE SWIPE' }
            ]
        };

        this.cores = [];
        this.slicedPieces = [];
        this.bladeTrail = [];
        this.particles = [];
        this.floatingTexts = [];

        this.score = 0;
        this.comboCount = 0;
        this.lives = 3;
        this.isPointerDown = false;
        this.lastSpawnTime = 0;
        this.difficultyTimer = 0;

        this.bindEvents();
    }

    bindEvents() {
        this.handlePointerDown = (e) => {
            if (!this.running) return;
            this.isPointerDown = true;
            this.bladeTrail = [];
            this.addTrailPoint(e);
        };

        this.handlePointerMove = (e) => {
            if (!this.running) return;
            // Always track trail if mouse is moving across canvas
            this.addTrailPoint(e);
            this.checkSliceCollisions();
        };

        this.handlePointerUp = () => {
            this.isPointerDown = false;
            this.comboCount = 0;
        };

        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
    }

    destroy() {
        this.running = false;
        cancelAnimationFrame(this.animId);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
    }

    addTrailPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width ? (this.canvas.width / rect.width) : 1;
        const scaleY = rect.height ? (this.canvas.height / rect.height) : 1;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        this.bladeTrail.push({ x, y, life: 1.0 });
        if (this.bladeTrail.length > 12) {
            this.bladeTrail.shift();
        }
    }

    start() {
        this.running = true;
        this.cores = [];
        this.slicedPieces = [];
        this.bladeTrail = [];
        this.particles = [];
        this.floatingTexts = [];
        this.score = 0;
        this.lives = 3;
        this.difficultyTimer = 0;

        this.lastTime = performance.now();
        this.lastSpawnTime = performance.now();
        this.loop();
    }

    spawnWave() {
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const isBomb = Math.random() < 0.18;
            const x = this.canvas.width * 0.2 + Math.random() * (this.canvas.width * 0.6);
            const y = this.canvas.height + 40;

            // Launch physics towards center with relaxed, comfortable speed
            const targetX = this.canvas.width * 0.3 + Math.random() * (this.canvas.width * 0.4);
            const vx = (targetX - x) * (0.5 + Math.random() * 0.3) / 42;
            const vy = -(Math.random() * 3 + 10.5); // reduced upward velocity for a smooth, readable arc

            const colorPool = ['#00D9F5', '#00F5A0', '#FFE600', '#B537F2'];
            const color = isBomb ? '#FF3366' : colorPool[Math.floor(Math.random() * colorPool.length)];

            this.cores.push({
                x,
                y,
                vx,
                vy,
                radius: isBomb ? 26 : 28,
                color,
                isBomb,
                rotation: 0,
                rotSpeed: (Math.random() - 0.5) * 3.5,
                sliced: false
            });
        }
    }

    checkSliceCollisions() {
        if (this.bladeTrail.length < 2) return;
        const p1 = this.bladeTrail[this.bladeTrail.length - 2];
        const p2 = this.bladeTrail[this.bladeTrail.length - 1];

        let slicedInThisMotion = 0;

        for (let i = this.cores.length - 1; i >= 0; i--) {
            const c = this.cores[i];
            if (c.sliced) continue;

            if (this.lineIntersectsCircle(p1, p2, c, c.radius)) {
                c.sliced = true;

                if (c.isBomb) {
                    // Bomb sliced!
                    this.lives--;
                    if (window.KuraSounds) window.KuraSounds.playCrash();
                    this.createExplosion(c.x, c.y, '#FF3366', 35);
                    this.addFloatingText(c.x, c.y, 'HAZARD HIT! -1 LIFE', '#FF3366');
                    this.cores.splice(i, 1);

                    if (this.lives <= 0) {
                        this.gameOver();
                        return;
                    }
                } else {
                    // Core sliced!
                    slicedInThisMotion++;
                    this.comboCount++;
                    const comboMultiplier = Math.max(1, this.comboCount);
                    const points = 100 * comboMultiplier;
                    this.score += points;

                    if (window.KuraSounds) {
                        window.KuraSounds.playTone(850 + this.comboCount * 70, 'sawtooth', 0.05, 0.22);
                    }

                    this.createSlicePieces(c, p1, p2);
                    this.createExplosion(c.x, c.y, c.color, 18);

                    const label = this.comboCount > 1 ? `COMBO x${this.comboCount}! +${points}` : `+${points}`;
                    this.addFloatingText(c.x, c.y, label, this.comboCount > 1 ? '#FFE600' : c.color);

                    this.cores.splice(i, 1);
                }
            }
        }
    }

    lineIntersectsCircle(p1, p2, c, radius) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return Math.hypot(p1.x - c.x, p1.y - c.y) <= radius;

        const u = ((c.x - p1.x) * dx + (c.y - p1.y) * dy) / (len * len);
        const clampedU = Math.max(0, Math.min(1, u));
        const nearestX = p1.x + clampedU * dx;
        const nearestY = p1.y + clampedU * dy;

        return Math.hypot(c.x - nearestX, c.y - nearestY) <= radius;
    }

    createSlicePieces(c, p1, p2) {
        // Two halves flying apart
        const sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const perpX = Math.cos(sliceAngle + Math.PI / 2);
        const perpY = Math.sin(sliceAngle + Math.PI / 2);

        this.slicedPieces.push({
            x: c.x,
            y: c.y,
            vx: c.vx + perpX * 4,
            vy: c.vy + perpY * 4,
            radius: c.radius,
            color: c.color,
            angle: c.rotation,
            rotSpeed: 8,
            half: 1,
            life: 1.0
        });

        this.slicedPieces.push({
            x: c.x,
            y: c.y,
            vx: c.vx - perpX * 4,
            vy: c.vy - perpY * 4,
            radius: c.radius,
            color: c.color,
            angle: c.rotation,
            rotSpeed: -8,
            half: 2,
            life: 1.0
        });
    }

    createExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 7 + 2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color,
                life: 1.0,
                decay: 0.05,
                size: Math.random() * 3 + 2
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
            vy: -1.6
        });
    }

    update(dt) {
        const gravity = 13; // calibrated gravity for a floaty, satisfying arc
        this.difficultyTimer += dt;

        // Spawn logic with comfortable pacing
        const spawnDelay = Math.max(1200, 2400 - this.difficultyTimer * 15);
        if (performance.now() - this.lastSpawnTime > spawnDelay) {
            this.spawnWave();
            this.lastSpawnTime = performance.now();
        }

        // Update active cores
        for (let i = this.cores.length - 1; i >= 0; i--) {
            const c = this.cores[i];
            c.vy += gravity * dt;
            c.x += c.vx;
            c.y += c.vy;
            c.rotation += c.rotSpeed * dt;

            // Dropped off screen
            if (c.y > this.canvas.height + 60 && c.vy > 0) {
                if (!c.isBomb) {
                    this.lives--;
                    this.comboCount = 0;
                    this.addFloatingText(c.x, this.canvas.height - 30, 'MISSED!', '#FF3366');
                    if (this.lives <= 0) {
                        this.gameOver();
                        return;
                    }
                }
                this.cores.splice(i, 1);
            }
        }

        // Update sliced halves
        for (let i = this.slicedPieces.length - 1; i >= 0; i--) {
            const p = this.slicedPieces[i];
            p.vy += gravity * dt;
            p.x += p.vx;
            p.y += p.vy;
            p.angle += p.rotSpeed * dt;
            p.life -= 0.8 * dt;

            if (p.life <= 0 || p.y > this.canvas.height + 60) {
                this.slicedPieces.splice(i, 1);
            }
        }

        // Decay blade trail
        for (let i = this.bladeTrail.length - 1; i >= 0; i--) {
            this.bladeTrail[i].life -= 2.8 * dt;
            if (this.bladeTrail[i].life <= 0) {
                this.bladeTrail.splice(i, 1);
            }
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
            ft.alpha -= 1.6 * dt;
            if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    gameOver() {
        this.running = false;
        if (window.KuraSounds) window.KuraSounds.playCrash();

        let isNewRecord = false;
        let stats = { highScore: 0 };
        if (window.KuraLeaderboard) {
            const res = window.KuraLeaderboard.recordGameResult('cyber-slicer', this.score);
            isNewRecord = res.isNewRecord;
            stats = res.stats;
        }

        setTimeout(() => {
            if (this.onEnd) {
                this.onEnd({
                    won: this.score > 2500,
                    title: isNewRecord ? `NEW RECORD: ${this.score} PTS!` : 'BLADE OVERHEATED!',
                    score: `FINAL SCORE: ${this.score} | (BEST: ${stats.highScore})`, numericScore: this.score
                });
            }
        }, 700);
    }

    render() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        // Render Sliced Halves
        this.slicedPieces.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.angle);
            this.ctx.globalAlpha = Math.max(0, p.life);

            this.ctx.beginPath();
            if (p.half === 1) {
                this.ctx.arc(0, 0, p.radius, 0, Math.PI);
            } else {
                this.ctx.arc(0, 0, p.radius, Math.PI, Math.PI * 2);
            }
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 14;
            this.ctx.fill();
            this.ctx.restore();
        });

        // Render Intact Cores
        this.cores.forEach(c => {
            this.ctx.save();
            this.ctx.translate(c.x, c.y);
            this.ctx.rotate(c.rotation);

            this.ctx.shadowColor = c.color;
            this.ctx.shadowBlur = 18;
            this.ctx.fillStyle = c.color;

            if (c.isBomb) {
                // Hazard Core
                this.ctx.beginPath();
                this.ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#FF3366';
                this.ctx.fill();

                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.font = 'bold 18px "Space Grotesk", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('⚡', 0, 6);
            } else {
                // Energy Core
                this.ctx.beginPath();
                this.ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
                this.ctx.fill();

                // Inner core ring
                this.ctx.beginPath();
                this.ctx.arc(0, 0, c.radius * 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fill();
            }

            this.ctx.restore();
        });

        // Render Particles
        this.particles.forEach(pt => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, pt.life);
            this.ctx.fillStyle = pt.color;
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // Render Glowing Neon Blade Ribbon Trail
        if (this.bladeTrail.length > 1) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(this.bladeTrail[0].x, this.bladeTrail[0].y);
            for (let i = 1; i < this.bladeTrail.length; i++) {
                this.ctx.lineTo(this.bladeTrail[i].x, this.bladeTrail[i].y);
            }
            this.ctx.strokeStyle = '#00F5A0';
            this.ctx.shadowColor = '#00F5A0';
            this.ctx.shadowBlur = 20;
            this.ctx.lineWidth = 6;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();

            // Inner white-hot laser core
            this.ctx.lineWidth = 2.5;
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Floating Text
        this.floatingTexts.forEach(ft => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, ft.alpha);
            this.ctx.fillStyle = ft.color;
            this.ctx.font = 'bold 16px "JetBrains Mono", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = ft.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        });

        // Top HUD
        this.ctx.save();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 22px "Space Grotesk", sans-serif';
        this.ctx.fillText(`SCORE: ${this.score}`, 40, 50);

        // Lives Indicator
        this.ctx.textAlign = 'right';
        let lifeStr = '';
        for (let i = 0; i < 3; i++) {
            lifeStr += i < this.lives ? '❤️ ' : '🖤 ';
        }
        this.ctx.font = '20px sans-serif';
        this.ctx.fillText(lifeStr, w - 40, 50);

        this.ctx.font = '12px "JetBrains Mono", monospace';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.fillText('SWIPE TO SLICE | DODGE RED HAZARDS', w - 40, 75);
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
window.KuraGames['cyber-slicer'] = CyberSlicerGame;
