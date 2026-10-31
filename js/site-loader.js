// KURA Cinematic Website Loading & Game Introduction System
// Architected & Handcrafted by Bhagath Krishna.M
// GitHub: https://github.com/bhagathkrishna57/kura-play.git

(function () {
    'use strict';

    class KuraSiteLoader {
        constructor() {
            this.currentSlide = 0;
            this.totalSlides = 3;
            this.slideDuration = 7000; // 7 seconds per slide for relaxed reading
            this.isPaused = false;
            this.isDismissed = false;
            this.slideStartTime = 0;
            this.timerInterval = null;
            this.canvasAnimId = null;

            this.init();
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.buildDOM());
            } else {
                this.buildDOM();
            }
        }

        buildDOM() {
            const overlay = document.createElement('div');
            overlay.id = 'kura-site-intro';
            overlay.className = 'kura-site-intro';
            overlay.innerHTML = `
                <!-- Background Particle & Grid Canvas -->
                <canvas id="intro-starfield-canvas"></canvas>

                <!-- Cinematic Opening Shutters -->
                <div class="intro-curtain intro-curtain-top"></div>
                <div class="intro-curtain intro-curtain-bottom"></div>

                <!-- Main Intro Viewport -->
                <div class="intro-content-container">
                    <!-- Top Telemetry Bar -->
                    <div class="intro-top-bar">
                        <div class="intro-status-pill">
                            <span class="intro-blinking-led"></span>
                            <span class="intro-status-text">INITIALIZING KURA ARCADE OS // PROTOCOL ACTIVE</span>
                        </div>
                        <div class="intro-top-actions">
                            <a href="https://github.com/bhagathkrishna57/kura-play.git" target="_blank" rel="noopener" class="intro-github-link" title="Open Official GitHub Repository">
                                <svg class="github-svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                                </svg>
                                <span>GITHUB: bhagathkrishna57/kura-play</span>
                            </a>
                            <button class="intro-skip-btn" id="intro-skip-btn" title="Skip Intro Directly to Hub">
                                SKIP TO HUB [ESC]
                            </button>
                        </div>
                    </div>

                    <!-- Center Showcase Card (With Slides) -->
                    <div class="intro-card-wrapper" id="intro-card-wrapper">
                        <!-- Navigation Header with Tabs -->
                        <div class="intro-card-nav">
                            <button class="intro-tab-btn active" data-slide="0">
                                <span class="tab-number">01</span>
                                <span class="tab-label">THE ARCHITECT</span>
                            </button>
                            <button class="intro-tab-btn" data-slide="1">
                                <span class="tab-number">02</span>
                                <span class="tab-label">THE 4 GAMES</span>
                            </button>
                            <button class="intro-tab-btn" data-slide="2">
                                <span class="tab-number">03</span>
                                <span class="tab-label">SYSTEM SPECS</span>
                            </button>
                        </div>

                        <!-- SLIDE 0: Creator Introduction -->
                        <div class="intro-slide active" id="intro-slide-0">
                            <div class="slide-creator-content">
                                <div class="creator-badge-row">
                                    <div class="creator-monolith-emblem">
                                        <span>K</span>
                                    </div>
                                    <div class="creator-title-block">
                                        <div class="creator-label-tag">LEAD ARCHITECT & CREATOR</div>
                                        <h2 class="creator-name-headline">BHAGATH KRISHNA.M</h2>
                                        <div class="creator-sub-spec">INDEPENDENT GAME DEVELOPER & DESIGNER</div>
                                    </div>
                                </div>

                                <div class="creator-manifesto-box">
                                    <p class="manifesto-lead">
                                        "KURA was born from a simple obsession: <strong>destroy boredom instantly</strong>."
                                    </p>
                                    <p class="manifesto-body">
                                        Crafted by <strong>Bhagath Krishna.M</strong> from pure handcrafted code — no bloated game engines, no slow loading screens, and zero unnecessary fluff. Every mechanic is engineered directly on the browser canvas to deliver <strong>0.1ms input latency</strong>, electric visuals, and immediate reflex dopamine.
                                    </p>
                                    <div class="manifesto-tags">
                                        <span class="manifesto-tag">100% PURE JAVASCRIPT</span>
                                        <span class="manifesto-tag">ZERO LATENCY</span>
                                        <span class="manifesto-tag">HIGH REACTION TRAINING</span>
                                        <span class="manifesto-tag">OFFLINE READY</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- SLIDE 1: The 4 Games Introduction -->
                        <div class="intro-slide" id="intro-slide-1">
                            <div class="slide-games-content">
                                <div class="games-intro-header">
                                    <h3 class="games-headline">THE TACTICAL MATRIX: 4 BESPOKE BATTLE SECTORS</h3>
                                    <p class="games-subhead">Engineered for pure kinetic flow. Zero tutorials required — launch and dominate.</p>
                                </div>

                                <div class="intro-games-grid">
                                    <div class="intro-game-item" style="--accent-color: #00D9F5;">
                                        <div class="igi-header">
                                            <span class="igi-icon">🎯</span>
                                            <span class="igi-sector">[SECTOR 01]</span>
                                        </div>
                                        <h4 class="igi-title">AIM MATRIX</h4>
                                        <p class="igi-desc">Flick & tracking precision accuracy tester. Destroy collapsing holographic targets before their perimeter rings shatter.</p>
                                    </div>

                                    <div class="intro-game-item" style="--accent-color: #00F5A0;">
                                        <div class="igi-header">
                                            <span class="igi-icon">⚡</span>
                                            <span class="igi-sector">[SECTOR 02]</span>
                                        </div>
                                        <h4 class="igi-title">NEON DASH</h4>
                                        <p class="igi-desc">Adrenaline relativistic runner. Invert gravity between ceiling and floor at 70+ KM/H through lethal laser hazards.</p>
                                    </div>

                                    <div class="intro-game-item" style="--accent-color: #FF2E55;">
                                        <div class="igi-header">
                                            <span class="igi-icon">⚡</span>
                                            <span class="igi-sector">[SECTOR 03]</span>
                                        </div>
                                        <h4 class="igi-title">FLASH REFLEX</h4>
                                        <p class="igi-desc">Sub-millisecond synaptic reaction showdown. Hold through nerve-wracking tension and strike the moment the visual cue flashes.</p>
                                    </div>

                                    <div class="intro-game-item" style="--accent-color: #A855F7;">
                                        <div class="igi-header">
                                            <span class="igi-icon">⚔️</span>
                                            <span class="igi-sector">[SECTOR 04]</span>
                                        </div>
                                        <h4 class="igi-title">CYBER SLICER</h4>
                                        <p class="igi-desc">Kinetic neon laser blade slasher. Slice launched energy cores, build exponential score combos, and evade volatile explosive mines.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- SLIDE 2: Battle Specs & Controls -->
                        <div class="intro-slide" id="intro-slide-2">
                            <div class="slide-specs-content">
                                <div class="specs-header">
                                    <h3 class="specs-headline">CONTROLS & ARCHITECTURE OVERVIEW</h3>
                                    <p class="specs-subhead">Designed for seamless keyboard, mouse, and local/online party sessions.</p>
                                </div>

                                <div class="specs-cards-row">
                                    <div class="spec-card">
                                        <div class="spec-card-icon">⌨️</div>
                                        <h4 class="spec-card-title">RAPID HOTKEYS</h4>
                                        <ul class="spec-list">
                                            <li><span class="key-badge">[N]</span> Jump to next game instantly</li>
                                            <li><span class="key-badge">[SPACE]</span> Action / Jump / Play Again</li>
                                            <li><span class="key-badge">[ESC]</span> Return to Games Hub</li>
                                        </ul>
                                    </div>

                                    <div class="spec-card">
                                        <div class="spec-card-icon">👥</div>
                                        <h4 class="spec-card-title">MULTI-MODE PLAY</h4>
                                        <p class="spec-card-desc">
                                            Play solo or toggle <strong>2-PLAYER MODE</strong> on the same keyboard. Or open <strong>PARTY LOBBY</strong> to generate a WebRTC room code and invite friends!
                                        </p>
                                    </div>

                                    <div class="spec-card">
                                        <div class="spec-card-icon">🏆</div>
                                        <h4 class="spec-card-title">PERSISTENT STATS</h4>
                                        <p class="spec-card-desc">
                                            Your reaction times, survival distances, and high scores are automatically calculated and stored in local hardware telemetry.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Card Footer Controls -->
                        <div class="intro-card-footer">
                            <div class="intro-stepper-controls">
                                <button class="stepper-arrow-btn" id="intro-prev-btn" title="Previous Slide">‹ PREV</button>
                                <div class="stepper-dots" id="intro-stepper-dots">
                                    <span class="step-dot active" data-dot="0"></span>
                                    <span class="step-dot" data-dot="1"></span>
                                    <span class="step-dot" data-dot="2"></span>
                                </div>
                                <button class="stepper-arrow-btn" id="intro-next-btn" title="Next Slide">NEXT ›</button>
                            </div>

                            <!-- Pacing Progress Bar with Pause Note -->
                            <div class="intro-reading-timer-wrap" title="Progress timer (Hover to pause and read comfortably)">
                                <div class="intro-reading-timer-bar" id="intro-timer-bar"></div>
                            </div>

                            <!-- Big Cinematic Enter Button -->
                            <button class="intro-enter-hub-btn" id="intro-enter-btn">
                                <span class="btn-glow-layer"></span>
                                <span class="btn-text">ENTER KURA ARCADE</span>
                                <span class="btn-keyhint">[SPACE / CLICK]</span>
                            </button>
                        </div>
                    </div>

                    <!-- Bottom Status Bar -->
                    <div class="intro-bottom-bar">
                        <div class="intro-bottom-left">
                            <span>CREATOR: <strong>BHAGATH KRISHNA.M</strong></span>
                            <span class="dot-separator">•</span>
                            <span>SOURCE: <strong>GITHUB / KURA-PLAY</strong></span>
                        </div>
                        <div class="intro-bottom-right">
                            <span class="pause-indicator" id="pause-indicator">READING MODE: AUTO-PACED (HOVER TO PAUSE)</span>
                        </div>
                    </div>
                </div>
            `;

            document.body.prepend(overlay);

            this.initBackgroundCanvas();
            this.bindEvents();
            this.startSlideTimer();

            // Try awakening sound safely
            if (window.KuraSounds) {
                window.KuraSounds.synthDeepSystemAwaken(1.0);
            }
        }

        initBackgroundCanvas() {
            const canvas = document.getElementById('intro-starfield-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let w = (canvas.width = window.innerWidth);
            let h = (canvas.height = window.innerHeight);

            window.addEventListener('resize', () => {
                w = canvas.width = window.innerWidth;
                h = canvas.height = window.innerHeight;
            });

            // Cyber star particles
            const stars = [];
            for (let i = 0; i < 90; i++) {
                stars.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    size: Math.random() * 2 + 0.5,
                    alpha: Math.random() * 0.6 + 0.2,
                    color: i % 3 === 0 ? '0, 245, 160' : i % 3 === 1 ? '0, 217, 245' : '168, 85, 247'
                });
            }

            const render = () => {
                if (this.isDismissed) return;
                ctx.clearRect(0, 0, w, h);

                // Subtle perspective grid lines
                ctx.strokeStyle = 'rgba(0, 217, 245, 0.035)';
                ctx.lineWidth = 1;
                const gridSize = 60;
                for (let x = 0; x < w; x += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, h);
                    ctx.stroke();
                }
                for (let y = 0; y < h; y += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(w, y);
                    ctx.stroke();
                }

                // Star rendering & motion
                for (let i = 0; i < stars.length; i++) {
                    const s = stars[i];
                    s.x += s.vx;
                    s.y += s.vy;
                    if (s.x < 0) s.x = w;
                    if (s.x > w) s.x = 0;
                    if (s.y < 0) s.y = h;
                    if (s.y > h) s.y = 0;

                    ctx.fillStyle = `rgba(${s.color}, ${s.alpha})`;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                this.canvasAnimId = requestAnimationFrame(render);
            };

            this.canvasAnimId = requestAnimationFrame(render);
        }

        bindEvents() {
            // Tab buttons
            const tabs = document.querySelectorAll('.intro-tab-btn');
            tabs.forEach((tab) => {
                tab.addEventListener('click', (e) => {
                    const slideIdx = parseInt(tab.getAttribute('data-slide'), 10);
                    this.goToSlide(slideIdx);
                    if (window.KuraSounds) window.KuraSounds.playClick();
                });
            });

            // Arrow buttons
            const prevBtn = document.getElementById('intro-prev-btn');
            const nextBtn = document.getElementById('intro-next-btn');
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    this.goToSlide((this.currentSlide - 1 + this.totalSlides) % this.totalSlides);
                    if (window.KuraSounds) window.KuraSounds.playClick();
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    this.goToSlide((this.currentSlide + 1) % this.totalSlides);
                    if (window.KuraSounds) window.KuraSounds.playClick();
                });
            }

            // Stepper dots
            const dots = document.querySelectorAll('.step-dot');
            dots.forEach((dot) => {
                dot.addEventListener('click', () => {
                    const dotIdx = parseInt(dot.getAttribute('data-dot'), 10);
                    this.goToSlide(dotIdx);
                    if (window.KuraSounds) window.KuraSounds.playClick();
                });
            });

            // Enter button
            const enterBtn = document.getElementById('intro-enter-btn');
            if (enterBtn) {
                enterBtn.addEventListener('click', () => this.dismissIntro());
            }

            // Skip button
            const skipBtn = document.getElementById('intro-skip-btn');
            if (skipBtn) {
                skipBtn.addEventListener('click', () => this.dismissIntro());
            }

            // Hover to pause reading timer
            const cardWrapper = document.getElementById('intro-card-wrapper');
            const pauseIndicator = document.getElementById('pause-indicator');
            if (cardWrapper) {
                cardWrapper.addEventListener('mouseenter', () => {
                    this.isPaused = true;
                    if (pauseIndicator) pauseIndicator.textContent = 'READING MODE: PAUSED (TAKE YOUR TIME)';
                });
                cardWrapper.addEventListener('mouseleave', () => {
                    this.isPaused = false;
                    if (pauseIndicator) pauseIndicator.textContent = 'READING MODE: AUTO-PACED (HOVER TO PAUSE)';
                });
            }

            // Keyboard listeners (Space / Enter / Arrows / Esc)
            this.handleKeydown = (e) => {
                if (this.isDismissed) return;

                if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
                    e.preventDefault();
                    this.dismissIntro();
                } else if (e.code === 'Escape') {
                    e.preventDefault();
                    this.dismissIntro();
                } else if (e.code === 'ArrowRight') {
                    e.preventDefault();
                    this.goToSlide((this.currentSlide + 1) % this.totalSlides);
                } else if (e.code === 'ArrowLeft') {
                    e.preventDefault();
                    this.goToSlide((this.currentSlide - 1 + this.totalSlides) % this.totalSlides);
                }
            };
            window.addEventListener('keydown', this.handleKeydown);
        }

        goToSlide(index) {
            this.currentSlide = index;

            // Update slide visibility
            document.querySelectorAll('.intro-slide').forEach((slide, idx) => {
                slide.classList.toggle('active', idx === index);
            });

            // Update tabs
            document.querySelectorAll('.intro-tab-btn').forEach((tab, idx) => {
                tab.classList.toggle('active', idx === index);
            });

            // Update dots
            document.querySelectorAll('.step-dot').forEach((dot, idx) => {
                dot.classList.toggle('active', idx === index);
            });

            // Reset slide timer
            this.slideStartTime = performance.now();
            const bar = document.getElementById('intro-timer-bar');
            if (bar) bar.style.width = '0%';

            // Play delicate sci-fi transition sound
            if (window.KuraSounds) {
                if (index === 1) window.KuraSounds.synthCalculationsStream(10);
                else if (index === 2) window.KuraSounds.synthHologramProjection(0.8);
                else window.KuraSounds.playClick();
            }
        }

        startSlideTimer() {
            this.slideStartTime = performance.now();
            if (this.timerInterval) clearInterval(this.timerInterval);

            this.timerInterval = setInterval(() => {
                if (this.isDismissed) {
                    clearInterval(this.timerInterval);
                    return;
                }

                if (!this.isPaused) {
                    const elapsed = performance.now() - this.slideStartTime;
                    const pct = Math.min((elapsed / this.slideDuration) * 100, 100);
                    const bar = document.getElementById('intro-timer-bar');
                    if (bar) bar.style.width = pct + '%';

                    if (elapsed >= this.slideDuration) {
                        // Advance to next slide
                        const next = (this.currentSlide + 1) % this.totalSlides;
                        this.goToSlide(next);
                    }
                } else {
                    // Update start time to preserve remaining time when unpaused
                    this.slideStartTime += 100;
                }
            }, 50);
        }

        dismissIntro() {
            if (this.isDismissed) return;
            this.isDismissed = true;

            if (this.timerInterval) clearInterval(this.timerInterval);
            if (this.canvasAnimId) cancelAnimationFrame(this.canvasAnimId);
            window.removeEventListener('keydown', this.handleKeydown);

            // Play grand access granted audio
            if (window.KuraSounds) {
                window.KuraSounds.synthAccessGrantedSlam();
                setTimeout(() => window.KuraSounds.synthSciFiNotification(), 120);
            }

            const overlay = document.getElementById('kura-site-intro');
            if (!overlay) return;

            // Trigger shutter & content exit animations
            overlay.classList.add('dismissed');

            // Add hub-ready trigger so arcade cards stagger reveal with glow
            document.body.classList.add('hub-ready');

            // Remove from DOM once transition concludes
            setTimeout(() => {
                overlay.remove();
            }, 850);
        }
    }

    // Initialize globally
    window.KuraSiteLoaderInstance = new KuraSiteLoader();
})();
