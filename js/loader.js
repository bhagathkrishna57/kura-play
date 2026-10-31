// Futuristic HUD/UI Loading Screen Engine
// Inspired by Square Studio Design graphics and @chriscaudio's futuristic HUD audio design.
// Perfectly synchronizes telemetry animations, rotating reticles, and game briefing with procedural sound cues.

class SciFiHudLoader {
    constructor() {
        this.overlay = null;
        this.canvas = null;
        this.ctx = null;
        this.animId = null;
        this.onComplete = null;
        this.currentMeta = null;

        this.reticleAngle = 0;
        this.scanlineY = 0;
        this.audioLevel = 0.5;
        this.hudPhase = 'BOOT'; // 'BOOT', 'SCAN', 'TACTICAL', 'LOCK', 'ENGAGE'
        this.progress = 0; // 0 to 100%

        this.initDOM();
    }

    initDOM() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'scifi-hud-loader';
        this.overlay.className = 'scifi-hud-overlay hidden';

        this.overlay.innerHTML = `
            <canvas id="hud-bg-canvas"></canvas>
            
            <div class="hud-frame-container">
                <!-- Top Diagnostics Bar -->
                <div class="hud-top-telemetry">
                    <div class="hud-diag-item"><span class="hud-dot green"></span> SYS_CORE: ONLINE</div>
                    <div class="hud-diag-item">PROTOCOL: KURA-NEURAL-LINK</div>
                    <div class="hud-diag-item">AUDIO: SYNCHRONIZED [48kHz]</div>
                    <div class="hud-diag-item" id="hud-status-phase">STATUS: INITIALIZING...</div>
                </div>

                <!-- Center Tactical Hologram Briefing Card -->
                <div class="hud-briefing-card" id="hud-center-card">
                    <div class="hud-bracket tl"></div>
                    <div class="hud-bracket tr"></div>
                    <div class="hud-bracket bl"></div>
                    <div class="hud-bracket br"></div>

                    <!-- Header -->
                    <div class="hud-card-header">
                        <span class="hud-sector-tag" id="hud-sector-tag">SECTOR // PROTOCOL ACTIVE</span>
                        <span class="hud-threat-badge" id="hud-threat-badge">THREAT: CRITICAL</span>
                    </div>

                    <!-- Game Title & Icon -->
                    <div class="hud-title-row">
                        <div class="hud-game-icon" id="hud-icon">🪐</div>
                        <div>
                            <div class="hud-mission-label">INITIALIZING MISSION //</div>
                            <h1 class="hud-game-title" id="hud-title">ORBIT CLASH</h1>
                        </div>
                    </div>

                    <!-- Mission Objective Lore -->
                    <div class="hud-objective-box">
                        <div class="hud-obj-title">TACTICAL DIRECTIVE:</div>
                        <p class="hud-obj-text" id="hud-objective">Push hostile kinetic orbs beyond the perimeter.</p>
                    </div>

                    <!-- Tactical Controls Schematic -->
                    <div class="hud-controls-schematic">
                        <div class="hud-schematic-title">CONTROL SCHEMATICS //</div>
                        <div class="hud-keys-row" id="hud-keys-container">
                            <!-- Populated with keycap graphics -->
                        </div>
                    </div>

                    <!-- Progress & Lock Gauge -->
                    <div class="hud-lock-bar-container">
                        <div class="hud-lock-bar" id="hud-progress-fill"></div>
                    </div>

                    <div class="hud-card-footer">
                        <span class="hud-telemetry-text" id="hud-telemetry-left">MEM_ALLOC: 0x8FA4-STABLE</span>
                        <span class="hud-telemetry-text" id="hud-lock-status">ENGAGING PROTOCOL...</span>
                    </div>
                </div>

                <!-- Bottom Telemetry Streams & Waveform -->
                <div class="hud-bottom-telemetry">
                    <div class="hud-hex-stream" id="hud-hex-stream">0x4E 0x45 0x4F 0x4E // BUFFER_OK // LINK: 120FPS</div>
                    <div class="hud-skip-hint">PRESS [N] TO SKIP TO NEXT SECTOR</div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.canvas = document.getElementById('hud-bg-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start(gameMeta, onReady) {
        this.currentMeta = gameMeta;
        this.onComplete = onReady;
        this.resize();

        // Populate DOM with rich tactical metadata
        document.getElementById('hud-title').textContent = gameMeta.title.toUpperCase();
        document.getElementById('hud-icon').textContent = gameMeta.icon || '⚡';
        document.getElementById('hud-sector-tag').textContent = gameMeta.classification || 'SECTOR // ACTIVE SIMULATION';
        document.getElementById('hud-threat-badge').textContent = gameMeta.threatRating || 'THREAT: ADRENALINE';
        document.getElementById('hud-objective').textContent = gameMeta.objective || gameMeta.instructions;

        // Render animated control keys
        const keysContainer = document.getElementById('hud-keys-container');
        const controls = gameMeta.controls || [
            { key: 'SPACE', action: 'PRIMARY ACTION' },
            { key: 'CLICK', action: 'DIRECT INPUT' }
        ];

        keysContainer.innerHTML = controls.map(c => `
            <div class="hud-key-unit">
                <span class="hud-keycap">${c.key}</span>
                <span class="hud-keyaction">${c.action}</span>
            </div>
        `).join('');

        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('active');

        this.hudPhase = 'BOOT';
        this.progress = 0;
        this.scanlineY = 0;
        this.reticleAngle = 0;

        const card = document.getElementById('hud-center-card');
        card.classList.remove('locked', 'engage-impact');

        // Play Synchronized Sound Design Timeline
        if (window.KuraSounds) {
            window.KuraSounds.playSciFiHudSequence((phase) => {
                this.handlePhaseEvent(phase);
            });
        }

        // Start render loop
        let running = true;
        const render = () => {
            if (!running) return;
            this.renderCanvas();
            this.animId = requestAnimationFrame(render);
        };
        this.animId = requestAnimationFrame(render);

        // Progress bar smooth interpolation
        const startTime = performance.now();
        const duration = 3400; // 3.4 seconds total loading sequence

        const updateProgress = () => {
            if (!running) return;
            const elapsed = performance.now() - startTime;
            this.progress = Math.min(100, (elapsed / duration) * 100);

            const fillEl = document.getElementById('hud-progress-fill');
            if (fillEl) fillEl.style.width = `${this.progress}%`;

            if (elapsed < duration) {
                requestAnimationFrame(updateProgress);
            }
        };
        requestAnimationFrame(updateProgress);

        this.cancel = () => {
            running = false;
            cancelAnimationFrame(this.animId);
            if (window.KuraSounds) window.KuraSounds.stopActiveSequence();
            this.overlay.classList.remove('active');
            this.overlay.classList.add('hidden');
        };
    }

    handlePhaseEvent(phase) {
        this.hudPhase = phase;
        const statusEl = document.getElementById('hud-status-phase');
        const lockStatusEl = document.getElementById('hud-lock-status');
        const card = document.getElementById('hud-center-card');

        if (phase === 'BOOT') {
            statusEl.textContent = 'STATUS: CORE MATRIX BOOTING...';
            lockStatusEl.textContent = 'DECRYPTING SECTOR DATA...';
        } else if (phase === 'SCAN') {
            statusEl.textContent = 'STATUS: HOLOGRAPHIC SCAN COMPLETE';
            lockStatusEl.textContent = 'CALIBRATING KINETICS...';
            card.classList.add('scanning');
        } else if (phase === 'TACTICAL') {
            statusEl.textContent = 'STATUS: CONTROLS SYNCHRONIZED';
            lockStatusEl.textContent = 'TARGET LOCKED // STANDBY';
        } else if (phase === 'LOCK') {
            statusEl.textContent = 'STATUS: TARGET LOCK ACQUIRED (100%)';
            statusEl.style.color = '#00F5A0';
            lockStatusEl.textContent = 'READY FOR COMBAT ENGAGEMENT';
            card.classList.add('locked');
        } else if (phase === 'ENGAGE') {
            statusEl.textContent = 'STATUS: ENGAGING WARP DROP!';
            card.classList.add('engage-impact');

            // Complete transition smoothly
            setTimeout(() => {
                cancelAnimationFrame(this.animId);
                this.overlay.classList.remove('active');
                this.overlay.classList.add('hidden');
                if (this.onComplete) {
                    this.onComplete();
                    this.onComplete = null;
                }
            }, 300);
        }
    }

    renderCanvas() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        this.ctx.clearRect(0, 0, w, h);

        // Tech grid backdrop
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 217, 245, 0.05)';
        this.ctx.lineWidth = 1;
        const gridSize = 60;
        for (let x = 0; x < w; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
        this.ctx.restore();

        // Rotating Reticles (Square Studio Design HUD circle)
        this.reticleAngle += 0.02;
        this.ctx.save();
        this.ctx.translate(cx, cy);

        // Outer Reticle Circle
        const radius = Math.min(w, h) * 0.38;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 245, 160, 0.15)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 12]);
        this.ctx.stroke();

        // Inner Rotating Segmented Arc
        this.ctx.rotate(this.reticleAngle);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius + 20, 0, Math.PI * 0.4);
        this.ctx.strokeStyle = '#00D9F5';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#00D9F5';
        this.ctx.shadowBlur = 12;
        this.ctx.setLineDash([]);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius + 20, Math.PI, Math.PI * 1.4);
        this.ctx.strokeStyle = '#00F5A0';
        this.ctx.shadowColor = '#00F5A0';
        this.ctx.stroke();

        // Counter-rotating ring
        this.ctx.rotate(-this.reticleAngle * 2);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius - 25, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 51, 102, 0.2)';
        this.ctx.setLineDash([20, 40]);
        this.ctx.stroke();

        this.ctx.restore();

        // Audio Frequency Equalizer Visualizer (Bottom)
        const numBars = 36;
        const barW = 6;
        const startX = cx - (numBars * 12) / 2;
        this.ctx.save();
        for (let i = 0; i < numBars; i++) {
            const hBar = (Math.sin(performance.now() * 0.01 + i * 0.4) * 0.5 + 0.5) * 35 + 8;
            this.ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 245, 160, 0.6)' : 'rgba(0, 217, 245, 0.6)';
            this.ctx.fillRect(startX + i * 12, h - 85 - hBar, barW, hBar);
        }
        this.ctx.restore();

        // Scanning line sweep
        this.scanlineY = (this.scanlineY + 6) % h;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 217, 245, 0.08)';
        this.ctx.fillRect(0, this.scanlineY, w, 3);
        this.ctx.restore();
    }
}

window.KuraLoader = new SciFiHudLoader();
