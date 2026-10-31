// Card Previews & 3D Parallax Tilt Engine
// Renders live micro-canvases on each game card and applies tactile 3D perspective physics.

class CardPreviewEngine {
    constructor() {
        this.cards = document.querySelectorAll('.game-console-card');
        this.canvases = {};
        this.animId = null;
        this.initPreviews();
        this.init3DParallax();
    }

    initPreviews() {
        this.cards.forEach(card => {
            const gameId = card.getAttribute('data-game');
            const canvas = card.querySelector('.card-mini-canvas');
            if (canvas) {
                canvas.width = canvas.offsetWidth || 280;
                canvas.height = canvas.offsetHeight || 140;
                this.canvases[gameId] = {
                    canvas,
                    ctx: canvas.getContext('2d'),
                    time: Math.random() * 100
                };
            }
        });

        window.addEventListener('resize', () => {
            this.cards.forEach(card => {
                const gameId = card.getAttribute('data-game');
                if (this.canvases[gameId]) {
                    const c = this.canvases[gameId].canvas;
                    if (c.offsetWidth && c.offsetHeight) {
                        c.width = c.offsetWidth;
                        c.height = c.offsetHeight;
                    }
                }
            });
        });

        const loop = () => {
            this.renderAll();
            this.animId = requestAnimationFrame(loop);
        };
        this.animId = requestAnimationFrame(loop);
    }

    renderAll() {
        const now = performance.now() * 0.001;

        // 1. Aim Matrix Mini Canvas
        if (this.canvases['aim-matrix']) {
            const { ctx, canvas } = this.canvases['aim-matrix'];
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            // Tech grid
            ctx.strokeStyle = 'rgba(0, 217, 245, 0.08)';
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 30) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }

            // Crosshair hunting targets
            const cx = w * 0.5 + Math.sin(now * 2) * 50;
            const cy = h * 0.5 + Math.cos(now * 1.5) * 30;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.strokeStyle = '#00D9F5';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#00D9F5';
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-24, 0); ctx.lineTo(-10, 0);
            ctx.moveTo(10, 0); ctx.lineTo(24, 0);
            ctx.moveTo(0, -24); ctx.lineTo(0, -10);
            ctx.moveTo(0, 10); ctx.lineTo(0, 24);
            ctx.stroke();

            // Center target pip
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#FFE600';
            ctx.fill();
            ctx.restore();
        }

        // 2. Neon Dash Mini Canvas
        if (this.canvases['neon-dash']) {
            const { ctx, canvas } = this.canvases['neon-dash'];
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            // Laser rails
            ctx.strokeStyle = '#00F5A0';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00F5A0';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(0, 25); ctx.lineTo(w, 25);
            ctx.moveTo(0, h - 25); ctx.lineTo(w, h - 25);
            ctx.stroke();

            // Inverting cube
            const isCeiling = Math.sin(now * 3) > 0;
            const cubeY = isCeiling ? 28 : h - 44;

            ctx.fillStyle = '#00D9F5';
            ctx.shadowColor = '#00D9F5';
            ctx.fillRect(w * 0.35, cubeY, 16, 16);

            // Scrolling spikes
            const scrollOffset = (now * 90) % 50;
            ctx.fillStyle = '#FF3366';
            ctx.shadowColor = '#FF3366';
            for (let x = w - scrollOffset; x > 0; x -= 50) {
                ctx.fillRect(x, h - 45, 12, 20);
            }
        }

        // 3. Flash Reflex Mini Canvas
        if (this.canvases['flash-reflex']) {
            const { ctx, canvas } = this.canvases['flash-reflex'];
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            // Synaptic reaction wave (ECG pulse)
            ctx.strokeStyle = '#FF2E55';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#FF2E55';
            ctx.shadowBlur = 10;
            ctx.beginPath();

            const cy = h * 0.5;
            ctx.moveTo(0, cy);
            for (let x = 0; x < w; x += 3) {
                const waveProg = (x + now * 120) % w;
                let y = cy;
                if (waveProg > 100 && waveProg < 150) {
                    y = cy - Math.sin((waveProg - 100) / 50 * Math.PI) * 45;
                }
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // 4. Cyber Slicer Mini Canvas
        if (this.canvases['cyber-slicer']) {
            const { ctx, canvas } = this.canvases['cyber-slicer'];
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            // Slicing neon ribbon arc
            const bladeX = w * 0.5 + Math.sin(now * 2.5) * 60;
            const bladeY = h * 0.5 + Math.cos(now * 2.5) * 35;

            ctx.strokeStyle = '#A855F7';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#A855F7';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(bladeX - 35, bladeY - 25);
            ctx.lineTo(bladeX + 35, bladeY + 25);
            ctx.stroke();

            // Sliced sparks
            for (let i = 0; i < 4; i++) {
                const sparkAngle = now * 4 + (i * Math.PI) / 2;
                ctx.fillStyle = '#00F5A0';
                ctx.beginPath();
                ctx.arc(bladeX + Math.cos(sparkAngle) * 20, bladeY + Math.sin(sparkAngle) * 20, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    init3DParallax() {
        this.cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -9;
                const rotateY = ((x - centerX) / centerX) * 9;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
            });
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.cardPreviews = new CardPreviewEngine();
});
