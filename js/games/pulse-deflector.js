// Game 5: Pulse Deflector (360° Kinetic Shield & Overdrive EMP)
// Architected for KURA Cyber-Arcade by Bhagath Krishna.M

class PulseDeflectorGame {
    constructor(canvas, onEnd) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onEnd = onEnd;
        this.running = false;
        this.animId = null;

        this.meta = {
            id: 'pulse-deflector',
            title: 'Pulse Deflector',
            icon: '🛡️',
            classification: 'SECTOR 05 // 360° KINETIC SHIELD DEFLECTOR',
            threatRating: 'OMNIDIRECTIONAL BARRAGE',
            objective: 'Rotate your quantum shield to deflect incoming cyber-orbs and kinetic lasers before they breach the core. Deflecting charges your OVERDRIVE EMP shockwave [SPACE]!',
            controls: [
                { key: 'MOUSE / TOUCH', action: 'AIM / ROTATE SHIELD' },
                { key: 'A / D or ◄ / ►', action: 'ROTATE SHIELD (KEYBOARD)' },
                { key: 'SPACE / RIGHT-CLICK', action: 'FIRE OVERDRIVE EMP BLAST' }
            ]
        };

        this.mode = 'solo';
        this.coreHp = 100;
        this.maxCoreHp = 100;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.empEnergy = 0; // 0 to 100%
        this.shieldAngle = 0; // Radians
        this.shieldArc = Math.PI * 0.42; // Shield width (~75 deg)
        this.shieldRadius = 85;

        // 2-Player Mode shields
        this.p2ShieldAngle = Math.PI;
        this.p2ShieldRadius = 135;

        this.projectiles = [];
        this.particles = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.spawnTimer = 0;
        this.difficultyTimer = 0;
        this.baseSpawnInterval = 1100; // ms

        this.keys = {};
        this.mousePos = { x: 0, y: 0 };
        this.bindEvents();
    }

    bindEvents() {
        this.handlePointerMove = (e) => {
            if (!this.running) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = rect.width ? (this.canvas.width / rect.width) : 1;
            const scaleY = rect.height ? (this.canvas.height / rect.height) : 1;
            this.mousePos.x = (e.clientX - rect.left) * scaleX;
            this.mousePos.y = (e.clientY - rect.top) * scaleY;

            const cx = this.canvas.width / 2;
            const cy = this.canvas.height / 2;
            const angle = Math.atan2(this.mousePos.y - cy, this.mousePos.x - cx);

            if (this.mode === 'local_2p') {
                if (e.clientX < window.innerWidth / 2) {
                    this.shieldAngle = angle;
                } else {
                    this.p2ShieldAngle = angle;
                }
            } else {
                this.shieldAngle = angle;
            }
        };

        this.handleKeyDown = (e) => {
            if (!this.running) return;
            this.keys[e.code] = true;

            if (e.code === 'Space') {
                e.preventDefault();
                this.triggerEmpBlast();
            }
        };

        this.handleKeyUp = (e) => {
            this.keys[e.code] = false;
        };

        this.handleContextMenu = (e) => {
            if (this.running) {
                e.preventDefault();
                this.triggerEmpBlast();
            }
        };

        this.lastTapTime = 0;
        this.handlePointerDown = (e) => {
            if (!this.running) return;
            this.handlePointerMove(e);
            const now = Date.now();
            if (now - this.lastTapTime < 340) {
                this.triggerEmpBlast();
                this.lastTapTime = 0;
            } else {
                this.lastTapTime = now;
            }
        };

        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.canvas.addEventListener('contextmenu', this.handleContextMenu);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    destroy() {
        this.running = false;
        if (this.animId) cancelAnimationFrame(this.animId);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }

    handleResize(w, h) {
        const minDim = Math.min(w, h);
        this.shieldRadius = Math.min(85, Math.max(55, minDim * 0.2));
        this.p2ShieldRadius = Math.min(135, Math.max(85, minDim * 0.32));
    }

    start(options = {}) {
        this.mode = options.mode || 'solo';
        this.running = true;
        this.coreHp = 100;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.empEnergy = 35; // Start with some EMP ready
        this.projectiles = [];
        this.particles = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.spawnTimer = 0;
        this.difficultyTimer = 0;
        this.shieldAngle = -Math.PI / 2;
        this.p2ShieldAngle = Math.PI / 2;

        this.lastTime = performance.now();
        this.loop();
    }

    triggerEmpBlast() {
        if (this.empEnergy < 50) {
            this.addFloatingText('EMP CHARGING...', this.canvas.width / 2, this.canvas.height / 2 - 50, '#FF4B72');
            if (window.KuraSounds) window.KuraSounds.playTone(220, 'sawtooth', 0.1, 0.15);
            return;
        }

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Shockwave effect
        this.shockwaves.push({
            x: cx,
            y: cy,
            radius: this.shieldRadius,
            maxRadius: Math.max(this.canvas.width, this.canvas.height) * 0.75,
            speed: 1200, // px per sec
            alpha: 1.0,
            color: '#00F5A0'
        });

        // Obliterate or deflect all active projectiles
        let destroyedCount = 0;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dist = Math.hypot(p.x - cx, p.y - cy);
            if (dist < Math.max(this.canvas.width, this.canvas.height)) {
                this.spawnSparks(p.x, p.y, p.color, 14);
                this.projectiles.splice(i, 1);
                destroyedCount++;
            }
        }

        const bonus = destroyedCount * 50;
        this.score += bonus + 100;
        this.empEnergy = 0;

        if (window.KuraSounds) {
            window.KuraSounds.playEmpBlast();
        }

        this.addFloatingText(`⚡ OVERDRIVE EMP! +${bonus + 100}`, cx, cy - 80, '#00F5A0');
    }

    spawnProjectile() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Spawn outside screen radius
        const spawnDistance = Math.hypot(this.canvas.width, this.canvas.height) / 2 + 50;
        const angle = Math.random() * Math.PI * 2;
        const x = cx + Math.cos(angle) * spawnDistance;
        const y = cy + Math.sin(angle) * spawnDistance;

        // Random types
        const types = ['photon', 'photon', 'laser', 'splinter'];
        const type = types[Math.floor(Math.random() * types.length)];

        let speed = 190 + Math.min(this.difficultyTimer * 4.5, 260);
        let color = '#00D9F5';
        let radius = 9;
        let damage = 15;
        let points = 10;

        if (type === 'laser') {
            speed *= 1.35;
            color = '#A855F7';
            radius = 6;
            damage = 25;
            points = 25;
        } else if (type === 'splinter') {
            speed *= 0.85;
            color = '#FF8C00';
            radius = 12;
            damage = 30;
            points = 35;
        }

        const targetAngle = Math.atan2(cy - y, cx - x);
        const vx = Math.cos(targetAngle) * speed;
        const vy = Math.sin(targetAngle) * speed;

        this.projectiles.push({
            type,
            x,
            y,
            vx,
            vy,
            color,
            radius,
            damage,
            points,
            angle: targetAngle,
            trail: []
        });
    }

    spawnSparks(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 220 + 60;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size: Math.random() * 3 + 1.5,
                alpha: 1.0,
                decay: Math.random() * 1.8 + 1.2
            });
        }
    }

    addFloatingText(text, x, y, color = '#00D9F5') {
        this.floatingTexts.push({
            text,
            x,
            y,
            vy: -45,
            color,
            alpha: 1.0
        });
    }

    update(dt) {
        if (!this.running) return;

        this.difficultyTimer += dt;
        this.spawnTimer += dt * 1000;

        // Progressive spawn rate
        const currentInterval = Math.max(380, this.baseSpawnInterval - this.difficultyTimer * 12);
        if (this.spawnTimer >= currentInterval) {
            this.spawnTimer = 0;
            this.spawnProjectile();
            if (this.difficultyTimer > 25 && Math.random() > 0.6) {
                setTimeout(() => { if (this.running) this.spawnProjectile(); }, 160);
            }
        }

        // Keyboard rotation controls
        const rotSpeed = 4.2 * dt;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.shieldAngle -= rotSpeed;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.shieldAngle += rotSpeed;
        if (this.mode === 'local_2p') {
            if (this.keys['KeyJ']) this.p2ShieldAngle -= rotSpeed;
            if (this.keys['KeyL']) this.p2ShieldAngle += rotSpeed;
        }

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed * dt;
            sw.alpha -= dt * 1.6;
            if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Update Projectiles & Check Collisions
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Store trail
            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 5) p.trail.pop();

            const distToCore = Math.hypot(p.x - cx, p.y - cy);
            const projAngle = Math.atan2(p.y - cy, p.x - cx);

            // 1. Check Shield Deflection
            const checkDeflection = (shieldAngle, shieldRadius, isP2 = false) => {
                const distToShield = Math.abs(distToCore - shieldRadius);
                if (distToShield <= p.radius + 14) {
                    let diffAngle = Math.abs(projAngle - shieldAngle);
                    while (diffAngle > Math.PI) diffAngle = Math.abs(diffAngle - Math.PI * 2);

                    if (diffAngle <= this.shieldArc / 2) {
                        // Deflection Success!
                        this.combo++;
                        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                        const pts = p.points * (1 + Math.min(this.combo, 5) * 0.2);
                        this.score += Math.round(pts);
                        this.empEnergy = Math.min(100, this.empEnergy + 12);

                        this.spawnSparks(p.x, p.y, isP2 ? '#FFE600' : '#00F5A0', 16);
                        this.addFloatingText(`+${Math.round(pts)}`, p.x, p.y - 10, isP2 ? '#FFE600' : '#00F5A0');

                        if (window.KuraSounds) {
                            window.KuraSounds.playDeflect();
                            if (this.combo % 3 === 0) window.KuraSounds.playCombo(this.combo);
                        }

                        // Splinter missile splits if deflected
                        if (p.type === 'splinter') {
                            this.spawnSparks(p.x, p.y, '#FF8C00', 20);
                        }

                        this.projectiles.splice(i, 1);
                        return true;
                    }
                }
                return false;
            };

            const deflectedP1 = checkDeflection(this.shieldAngle, this.shieldRadius, false);
            if (deflectedP1) continue;

            if (this.mode === 'local_2p') {
                const deflectedP2 = checkDeflection(this.p2ShieldAngle, this.p2ShieldRadius, true);
                if (deflectedP2) continue;
            }

            // 2. Check Core Impact
            if (distToCore <= 32) {
                // Core breach!
                this.coreHp = Math.max(0, this.coreHp - p.damage);
                this.combo = 0;
                this.spawnSparks(p.x, p.y, '#FF4B72', 22);
                this.addFloatingText(`-${p.damage} HP`, cx, cy - 40, '#FF4B72');

                if (window.KuraSounds) window.KuraSounds.playCrash();

                this.projectiles.splice(i, 1);

                if (this.coreHp <= 0) {
                    this.gameOver();
                    return;
                }
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.alpha -= pt.decay * dt;
            if (pt.alpha <= 0) this.particles.splice(i, 1);
        }

        // Update Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.alpha -= dt * 1.5;
            if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    gameOver() {
        this.running = false;
        cancelAnimationFrame(this.animId);

        if (window.KuraSounds) {
            if (this.score >= 250) window.KuraSounds.playVictory();
            else window.KuraSounds.playCrash();
        }

        if (this.onEnd) {
            this.onEnd({
                title: this.score >= 250 ? 'SECTOR PRESERVED' : 'CORE BREACHED',
                won: this.score >= 250,
                score: `${this.score} pts`,
                numericScore: this.score,
                combo: this.maxCombo
            });
        }
    }

    render() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);

        // Cyber Grid Background concentric rings
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 217, 245, 0.07)';
        ctx.lineWidth = 1;
        for (let r = 80; r < Math.max(w, h); r += 70) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Radar crosshairs
        ctx.beginPath();
        ctx.moveTo(cx - 150, cy);
        ctx.lineTo(cx + 150, cy);
        ctx.moveTo(cx, cy - 150);
        ctx.lineTo(cx, cy + 150);
        ctx.stroke();
        ctx.restore();

        // Render Shockwaves
        this.shockwaves.forEach(sw => {
            ctx.save();
            ctx.strokeStyle = `rgba(0, 245, 160, ${sw.alpha})`;
            ctx.lineWidth = 8;
            ctx.shadowColor = '#00F5A0';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        // Render Central Core
        const hpPct = Math.max(0, this.coreHp / this.maxCoreHp);
        const corePulse = Math.sin(performance.now() * 0.006) * 3;
        const coreRadius = 26 + corePulse;

        ctx.save();
        ctx.shadowColor = hpPct > 0.35 ? '#00D9F5' : '#FF4B72';
        ctx.shadowBlur = 24;
        ctx.fillStyle = hpPct > 0.35 ? 'rgba(0, 217, 245, 0.25)' : 'rgba(255, 75, 114, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = hpPct > 0.35 ? '#00D9F5' : '#FF4B72';
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius - 4, 0, Math.PI * 2);
        ctx.stroke();

        // Core Reactor Icon
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 15px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', cx, cy);
        ctx.restore();

        // Render Deflector Shields
        const drawShield = (angle, radius, color, glowColor, label) => {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 20;

            const startAngle = angle - this.shieldArc / 2;
            const endAngle = angle + this.shieldArc / 2;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.stroke();

            // Inner harmonic shield arc
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle + 0.08, endAngle - 0.08);
            ctx.stroke();

            // Direction reticle tip
            const tipX = cx + Math.cos(angle) * (radius + 12);
            const tipY = cy + Math.sin(angle) * (radius + 12);
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        // P1 Shield (Cyan/Green)
        drawShield(this.shieldAngle, this.shieldRadius, '#00D9F5', '#00F5A0', 'P1');

        // P2 Shield if 2P mode
        if (this.mode === 'local_2p') {
            drawShield(this.p2ShieldAngle, this.p2ShieldRadius, '#FFE600', '#FF8C00', 'P2');
        }

        // Render Projectiles
        this.projectiles.forEach(p => {
            ctx.save();
            // Trail
            if (p.trail.length > 1) {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }

            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = p.color;

            if (p.type === 'laser') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.fillRect(-14, -3, 28, 6);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        // Render Particles
        this.particles.forEach(pt => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.alpha);
            ctx.fillStyle = pt.color;
            ctx.shadowColor = pt.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Render Floating Text
        this.floatingTexts.forEach(ft => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.fillStyle = ft.color;
            ctx.font = '900 16px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 12;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });

        // HUD OVERLAYS
        this.renderHUD(cx, cy, w, h);
    }

    renderHUD(cx, cy, w, h) {
        const ctx = this.ctx;
        const isMobile = w < 600;
        ctx.save();

        // 1. Core Health Bar (Top Center)
        const barW = Math.min(240, Math.max(140, w - 120));
        const barH = isMobile ? 8 : 10;
        const barX = cx - barW / 2;
        const barY = isMobile ? 65 : 85;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(barX, barY, barW, barH);

        const hpPct = Math.max(0, this.coreHp / this.maxCoreHp);
        ctx.fillStyle = hpPct > 0.35 ? '#00D9F5' : '#FF4B72';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.fillRect(barX, barY, barW * hpPct, barH);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = isMobile ? '700 10px "JetBrains Mono", monospace' : '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`CORE // ${this.coreHp}%`, cx, barY - 6);

        // 2. EMP Overdrive Gauge (Bottom Center)
        const empW = Math.min(200, Math.max(120, w - 80));
        const empH = isMobile ? 6 : 8;
        const empX = cx - empW / 2;
        const empY = h - (isMobile ? 32 : 55);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(empX, empY, empW, empH);

        const empPct = this.empEnergy / 100;
        ctx.fillStyle = this.empEnergy >= 50 ? '#00F5A0' : '#FF8C00';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fillRect(empX, empY, empW * empPct, empH);

        ctx.fillStyle = this.empEnergy >= 50 ? '#00F5A0' : 'rgba(255,255,255,0.6)';
        ctx.font = isMobile ? '900 10px "Space Grotesk", sans-serif' : '900 12px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.empEnergy >= 50 ? (isMobile ? '⚡ EMP READY [DOUBLE-TAP]' : '⚡ OVERDRIVE EMP READY [SPACE]') : `CHARGE: ${Math.round(this.empEnergy)}%`,
            cx,
            empY - 7
        );

        // 3. Score & Combo Counter (Top Left / Right)
        ctx.fillStyle = '#00D9F5';
        ctx.font = isMobile ? '900 18px "Space Grotesk", sans-serif' : '900 28px "Space Grotesk", sans-serif';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#00D9F5';
        ctx.shadowBlur = 14;
        ctx.fillText(`${this.score}`, isMobile ? 16 : 30, isMobile ? 65 : 95);

        if (!isMobile) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.fillText('TACTICAL DEFLECT SCORE', 30, 115);
        }

        if (this.combo > 1) {
            ctx.fillStyle = '#00F5A0';
            ctx.font = isMobile ? '900 13px "Space Grotesk", sans-serif' : '900 18px "Space Grotesk", sans-serif';
            ctx.fillText(`${this.combo}X STREAK!`, isMobile ? 16 : 30, isMobile ? 84 : 140);
        }

        ctx.restore();
    }

    loop() {
        if (!this.running) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) * 0.001, 0.05); // cap delta
        this.lastTime = now;

        this.update(dt);
        this.render();

        this.animId = requestAnimationFrame(() => this.loop());
    }
}

window.KuraGames = window.KuraGames || {};
window.KuraGames['pulse-deflector'] = PulseDeflectorGame;
