// Main Application Orchestrator for KURA Cyber-Arcade

class ArcadeHub {
    constructor() {
        this.currentGame = null;
        this.currentGameId = null;
        this.currentMode = 'solo';
        this.availableGames = ['aim-matrix', 'neon-dash', 'flash-reflex', 'cyber-slicer'];

        this.initDOM();
        this.initBackgroundCanvas();
        this.bindEvents();
        this.refreshStats();
        this.checkUrlRoom();
    }

    initDOM() {
        this.hubView = document.getElementById('main-hub-view');
        this.stageView = document.getElementById('game-stage-view');
        this.activeCanvas = document.getElementById('active-game-canvas');
        this.roundOverOverlay = document.getElementById('round-over-overlay');

        this.partyModal = document.getElementById('party-modal');
        this.leaderboardModal = document.getElementById('leaderboard-modal');
        this.pilotModal = document.getElementById('pilot-modal');
        this.currentLbSector = 'aim-matrix';

        this.playerNameInput = document.getElementById('player-name-input');
        if (this.playerNameInput && window.KuraMultiplayer) {
            this.playerNameInput.value = window.KuraMultiplayer.localPlayerName;
        }

        this.resizeActiveCanvas();
        window.addEventListener('resize', () => this.resizeActiveCanvas());
        this.initPilotAuth();
    }

    resizeActiveCanvas() {
        if (!this.activeCanvas) return;
        this.activeCanvas.width = window.innerWidth;
        this.activeCanvas.height = window.innerHeight;
    }

    initBackgroundCanvas() {
        const bgCanvas = document.getElementById('bg-canvas');
        if (!bgCanvas) return;
        const ctx = bgCanvas.getContext('2d');

        let w = (bgCanvas.width = window.innerWidth);
        let h = (bgCanvas.height = window.innerHeight);

        window.addEventListener('resize', () => {
            w = bgCanvas.width = window.innerWidth;
            h = bgCanvas.height = window.innerHeight;
        });

        const particles = [];
        const count = 65;
        let mouseX = w / 2;
        let mouseY = h / 2;

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                size: Math.random() * 2 + 1,
                color: i % 3 === 0 ? 'rgba(0, 245, 160, 0.4)' : 'rgba(0, 217, 245, 0.3)'
            });
        }

        window.addEventListener('pointermove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        const renderBg = () => {
            ctx.clearRect(0, 0, w, h);

            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                p1.x += p1.vx;
                p1.y += p1.vy;

                if (p1.x < 0) p1.x = w;
                if (p1.x > w) p1.x = 0;
                if (p1.y < 0) p1.y = h;
                if (p1.y > h) p1.y = 0;

                const dmx = p1.x - mouseX;
                const dmy = p1.y - mouseY;
                const dMouse = Math.hypot(dmx, dmy);
                if (dMouse < 120) {
                    p1.x += (dmx / dMouse) * 1.5;
                    p1.y += (dmy / dMouse) * 1.5;
                }

                ctx.fillStyle = p1.color;
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    if (dist < 110) {
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(0, 217, 245, ${0.15 * (1 - dist / 110)})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(renderBg);
        };

        renderBg();
    }

    bindEvents() {
        const soundBtn = document.getElementById('toggle-sound-btn');
        const soundIcon = document.getElementById('sound-icon');
        if (soundBtn && window.KuraSounds) {
            soundBtn.addEventListener('click', () => {
                const isMuted = window.KuraSounds.toggleMute();
                soundIcon.textContent = isMuted ? '🔇' : '🔊';
            });
        }

        // Return to Hub / Go Back
        document.getElementById('nav-brand-btn').addEventListener('click', () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            this.goBack();
        });

        const backButtons = [
            document.getElementById('corner-back-btn'),
            document.getElementById('hud-back-btn'),
            document.getElementById('go-hub-btn')
        ];
        backButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    if (window.KuraSounds) window.KuraSounds.playClick();
                    this.goBack();
                });
            }
        });

        // Browser Native Back/Forward Button Integration
        window.addEventListener('popstate', (e) => {
            if (this.partyModal && this.partyModal.classList.contains('active')) {
                this.partyModal.classList.remove('active');
                return;
            }
            if (this.leaderboardModal && this.leaderboardModal.classList.contains('active')) {
                this.leaderboardModal.classList.remove('active');
                return;
            }
            if (this.currentGameId) {
                this.showHub(false);
            }
        });

        const skipBtns = [
            document.getElementById('global-skip-btn'),
            document.getElementById('hud-skip-btn'),
            document.getElementById('go-next-btn')
        ];
        skipBtns.forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.skipToNextGame());
        });

        const retryBtns = [
            document.getElementById('hud-retry-btn'),
            document.getElementById('go-retry-btn')
        ];
        retryBtns.forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.retryGame());
        });

        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            // R to Try Again / Restart game anytime
            if (e.key === 'r' || e.key === 'R') {
                if (this.currentGameId) {
                    e.preventDefault();
                    this.retryGame();
                    return;
                }
            }

            // Space / Enter to Try Again when game over screen is showing
            if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
                if (this.roundOverOverlay && this.roundOverOverlay.classList.contains('active')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.retryGame();
                    return;
                }
            }

            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                this.skipToNextGame();
            } else if (e.key === 'Escape' || e.key === 'Backspace') {
                this.goBack();
            }
        });

        document.querySelectorAll('.game-console-card, .game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameId = card.getAttribute('data-game');
                if (window.KuraSounds) window.KuraSounds.playClick();
                this.launchGame(gameId);
            });
        });

        document.getElementById('hud-hub-btn').addEventListener('click', () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            this.showHub();
        });

        document.getElementById('hud-mode-toggle').addEventListener('click', (e) => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            this.currentMode = this.currentMode === 'solo' ? 'local_2p' : 'solo';
            e.currentTarget.textContent = `MODE: ${this.currentMode === 'solo' ? 'SOLO' : '2-PLAYER'}`;
            if (this.currentGameId) {
                this.launchGame(this.currentGameId);
            }
        });

        document.getElementById('go-retry-btn').addEventListener('click', () => {
            this.retryGame();
        });

        document.getElementById('go-hub-btn').addEventListener('click', () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            this.showHub();
        });

        document.getElementById('open-party-btn').addEventListener('click', () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            this.openPartyModal();
        });

        document.getElementById('close-party-modal').addEventListener('click', () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            this.partyModal.classList.remove('active');
        });

        document.getElementById('btn-create-room').addEventListener('click', () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            this.createPartyRoom();
        });

        document.getElementById('btn-join-room').addEventListener('click', () => {
            const input = document.getElementById('join-room-input');
            if (input && input.value) {
                if (window.KuraSounds) window.KuraSounds.playClick();
                this.joinPartyRoom(input.value);
            }
        });

        if (this.playerNameInput) {
            this.playerNameInput.addEventListener('change', () => {
                if (window.KuraMultiplayer) window.KuraMultiplayer.setPlayerName(this.playerNameInput.value);
            });
        }

        document.getElementById('open-leaderboard-btn').addEventListener('click', () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            this.openLeaderboardModal();
        });

        document.getElementById('close-leaderboard-modal').addEventListener('click', () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            this.leaderboardModal.classList.remove('active');
        });
    }

    goBack() {
        if (this.pilotModal && this.pilotModal.classList.contains('active')) {
            this.pilotModal.classList.remove('active');
            return;
        }
        if (this.partyModal && this.partyModal.classList.contains('active')) {
            this.partyModal.classList.remove('active');
            return;
        }
        if (this.leaderboardModal && this.leaderboardModal.classList.contains('active')) {
            this.leaderboardModal.classList.remove('active');
            return;
        }
        if (this.currentGameId) {
            if (window.history.length > 1 && window.location.hash) {
                window.history.back();
            } else {
                this.showHub(true);
            }
        }
    }

    retryGame() {
        if (!this.currentGameId) return;
        if (window.KuraSounds) window.KuraSounds.playClick();
        if (this.roundOverOverlay) {
            this.roundOverOverlay.classList.remove('active');
            this.roundOverOverlay.style.display = 'none';
        }
        this.launchGame(this.currentGameId);
    }

    showHub(updateHistory = true) {
        if (this.currentGame) {
            this.currentGame.destroy();
            this.currentGame = null;
        }
        this.currentGameId = null;
        if (this.roundOverOverlay) {
            this.roundOverOverlay.classList.remove('active');
            this.roundOverOverlay.style.display = 'none';
        }
        this.stageView.classList.add('hidden');
        this.hubView.classList.remove('hidden');
        this.refreshStats();

        if (updateHistory && window.location.hash) {
            history.pushState({ view: 'hub' }, '', window.location.pathname);
        }
    }

    launchGame(gameId) {
        const GameClass = window.KuraGames ? window.KuraGames[gameId] : null;
        if (!GameClass) return;

        if (this.currentGame) {
            this.currentGame.destroy();
            this.currentGame = null;
        }

        this.currentGameId = gameId;
        if (this.roundOverOverlay) {
            this.roundOverOverlay.classList.remove('active');
            this.roundOverOverlay.style.display = 'none';
        }
        this.hubView.classList.add('hidden');
        this.stageView.classList.remove('hidden');
        this.resizeActiveCanvas();

        // Push state for browser Back button support
        try {
            history.pushState({ view: 'game', gameId }, '', '#' + gameId);
        } catch (e) {}

        const instance = new GameClass(this.activeCanvas, (result) => this.handleGameOver(result));

        document.getElementById('current-game-title').textContent = instance.meta.title.toUpperCase();
        document.getElementById('current-game-icon').textContent = instance.meta.icon;

        // Start game instantly — no loading animation
        this.currentGame = instance;
        instance.start({ mode: this.currentMode });
    }

    skipToNextGame() {
        if (window.KuraSounds) window.KuraSounds.playClick();
        if (this.roundOverOverlay) {
            this.roundOverOverlay.classList.remove('active');
            this.roundOverOverlay.style.display = 'none';
        }
        let nextIndex = 0;
        if (this.currentGameId) {
            const curIdx = this.availableGames.indexOf(this.currentGameId);
            nextIndex = (curIdx + 1) % this.availableGames.length;
        } else {
            nextIndex = Math.floor(Math.random() * this.availableGames.length);
        }
        const nextGameId = this.availableGames[nextIndex];
        this.launchGame(nextGameId);
    }

    async handleGameOver(result) {
        const goOverlay = this.roundOverOverlay;
        const titleEl = document.getElementById('go-title');
        const scoreEl = document.getElementById('go-score');
        const srvStatusEl = document.getElementById('go-server-status');
        const srvMsgEl = document.getElementById('go-server-msg');

        titleEl.textContent = result.title;
        titleEl.className = `game-over-title ${result.won ? 'win' : 'lose'}`;
        scoreEl.textContent = result.score;

        // Parse clean numeric score
        let numericScore = 0;
        if (result.numericScore !== undefined) {
            numericScore = result.numericScore;
        } else {
            const match = String(result.score).match(/(\d+(\.\d+)?)/);
            numericScore = match ? parseFloat(match[1]) : 0;
        }

        const scoreDisplay = this.currentGameId === 'neon-dash' ? `${numericScore}m` : this.currentGameId === 'flash-reflex' ? `${numericScore}ms` : `${numericScore} pts`;

        if (srvStatusEl && srvMsgEl) {
            const user = window.KuraServer ? window.KuraServer.currentUser : null;
            if (user) {
                srvStatusEl.className = 'go-server-status-pill saved';
                srvMsgEl.textContent = `SYNCING SCORE AS [${user.username}]...`;
                const submitRes = await window.KuraServer.submitScore(this.currentGameId, numericScore);
                if (submitRes && submitRes.success) {
                    srvMsgEl.textContent = `✓ RECORDED TO GLOBAL LEADERBOARD AS [${user.username}]`;
                } else {
                    srvMsgEl.textContent = `✓ SCORE RECORDED AS [${user.username}]`;
                }
            } else {
                srvStatusEl.className = 'go-server-status-pill prompt';
                srvMsgEl.textContent = `🔒 NOT LOGGED IN: Log in to save score (${scoreDisplay}) to Global Leaderboard!`;
                srvStatusEl.onclick = () => {
                    this.openPilotModal();
                };
            }
        }

        if (goOverlay) {
            goOverlay.style.display = 'flex';
            // Force reflow before adding active for instant transition
            void goOverlay.offsetWidth;
            goOverlay.classList.add('active');
        }
        this.refreshStats();
    }

    refreshStats() {
        if (!window.KuraLeaderboard) return;
        const stats = window.KuraLeaderboard.localStats;
        const statAim = document.getElementById('stat-aim-matrix');
        const statNeon = document.getElementById('stat-neon-dash');
        const statFlash = document.getElementById('stat-flash-reflex');
        const statSlicer = document.getElementById('stat-cyber-slicer');

        if (statAim && stats['aim-matrix']) statAim.textContent = `SCORE: ${stats['aim-matrix'].highScore || 0}`;
        if (statNeon && stats['neon-dash']) statNeon.textContent = `BEST: ${stats['neon-dash'].highScore || 0}m`;
        if (statFlash && stats['flash-reflex']) {
            const ms = stats['flash-reflex'].bestMs;
            statFlash.textContent = `BEST: ${ms && ms !== 9999 ? ms + 'ms' : '--'}`;
        }
        if (statSlicer && stats['cyber-slicer']) statSlicer.textContent = `SCORE: ${stats['cyber-slicer'].highScore || 0}`;
    }

    openPartyModal() {
        this.partyModal.classList.add('active');
        const displayCode = document.getElementById('display-room-code');
        if (window.KuraMultiplayer && window.KuraMultiplayer.roomId) {
            displayCode.textContent = window.KuraMultiplayer.roomId;
        }
    }

    createPartyRoom() {
        if (!window.KuraMultiplayer) return;
        window.KuraMultiplayer.createRoom((res) => {
            if (res.success) {
                const displayCode = document.getElementById('display-room-code');
                displayCode.textContent = res.roomId;

                const btn = document.getElementById('btn-create-room');
                btn.textContent = 'COPIED CODE!';
                navigator.clipboard.writeText(res.roomId).catch(() => {});
                setTimeout(() => { btn.textContent = 'COPY CODE'; }, 2000);

                this.updatePeersList();
            }
        });
    }

    joinPartyRoom(code) {
        if (!window.KuraMultiplayer) return;
        window.KuraMultiplayer.joinRoom(code, (res) => {
            if (res.success) {
                document.getElementById('display-room-code').textContent = code.toUpperCase();
                alert(`Connected to Room: ${code.toUpperCase()}!`);
                this.updatePeersList();
            } else {
                alert(`Join Failed: ${res.error}`);
            }
        });
    }

    updatePeersList() {
        const container = document.getElementById('peers-list-container');
        const countEl = document.getElementById('player-count');
        if (!container || !window.KuraMultiplayer) return;

        const mp = window.KuraMultiplayer;
        const players = mp.peersList.length ? mp.peersList : [{ name: mp.localPlayerName, isHost: true }];
        countEl.textContent = players.length;

        container.innerHTML = players.map(p => `
            <div class="peer-chip">
                <span>${p.name} ${p.isHost ? '(Host)' : ''}</span>
                <span style="color: var(--neon-green); font-size: 11px;">CONNECTED</span>
            </div>
        `).join('');
    }

    // ==============================================================
    // PILOT AUTHENTICATION & GLOBAL LEADERBOARD INTEGRATION
    // ==============================================================
    initPilotAuth() {
        const openAuthBtn = document.getElementById('open-auth-btn');
        const closeAuthBtn = document.getElementById('close-pilot-modal');
        const tabLoginBtn = document.getElementById('tab-login-btn');
        const tabRegBtn = document.getElementById('tab-register-btn');
        const formLogin = document.getElementById('form-pilot-login');
        const formReg = document.getElementById('form-pilot-register');
        const errorBanner = document.getElementById('auth-error-msg');
        const gateLoginBtn = document.getElementById('gate-open-login-btn');
        const googleBtn = document.getElementById('btn-google-signin');
        const gateGoogleBtn = document.getElementById('gate-google-signin-btn');

        const triggerGoogleAuth = async () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            
            let defaultName = 'Bhagath Krishna';
            let googleName = prompt('Enter your Google Account Name / Callsign:', defaultName);
            if (!googleName) return;

            const res = await window.KuraServer.loginWithGoogle({
                name: googleName,
                email: `${googleName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`,
                picture: 'https://lh3.googleusercontent.com/a/default-user'
            });

            if (res.success) {
                if (window.KuraSounds) window.KuraSounds.synthAccessGrantedSlam();
                this.closePilotModal();
                this.updateAuthUI();
                if (this.leaderboardModal && this.leaderboardModal.classList.contains('active')) {
                    this.openLeaderboardModal();
                }
            }
        };

        if (googleBtn) googleBtn.addEventListener('click', triggerGoogleAuth);
        if (gateGoogleBtn) gateGoogleBtn.addEventListener('click', triggerGoogleAuth);

        if (openAuthBtn) {
            openAuthBtn.addEventListener('click', () => {
                const user = window.KuraServer ? window.KuraServer.currentUser : null;
                if (user) {
                    if (confirm(`Logged in as [${user.username}]. Do you want to log out?`)) {
                        window.KuraServer.logout();
                        this.updateAuthUI();
                    }
                } else {
                    this.openPilotModal();
                }
            });
        }

        if (closeAuthBtn) {
            closeAuthBtn.addEventListener('click', () => this.closePilotModal());
        }

        if (gateLoginBtn) {
            gateLoginBtn.addEventListener('click', () => {
                this.leaderboardModal.classList.remove('active');
                this.openPilotModal();
            });
        }

        if (tabLoginBtn && tabRegBtn) {
            tabLoginBtn.addEventListener('click', () => {
                tabLoginBtn.classList.add('active');
                tabRegBtn.classList.remove('active');
                formLogin.classList.remove('hidden');
                formReg.classList.add('hidden');
                if (errorBanner) errorBanner.classList.add('hidden');
            });

            tabRegBtn.addEventListener('click', () => {
                tabRegBtn.classList.add('active');
                tabLoginBtn.classList.remove('active');
                formReg.classList.remove('hidden');
                formLogin.classList.add('hidden');
                if (errorBanner) errorBanner.classList.add('hidden');
            });
        }

        // Handle Login Submission
        if (formLogin) {
            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const u = document.getElementById('login-username').value;
                const p = document.getElementById('login-password').value;
                if (!u || !p) return;

                const res = await window.KuraServer.login(u, p);
                if (res.success) {
                    if (window.KuraSounds) window.KuraSounds.synthAccessGrantedSlam();
                    this.closePilotModal();
                    this.updateAuthUI();
                } else {
                    if (errorBanner) {
                        errorBanner.textContent = res.error || 'Authentication failed.';
                        errorBanner.classList.remove('hidden');
                    }
                }
            });
        }

        // Handle Registration Submission
        if (formReg) {
            formReg.addEventListener('submit', async (e) => {
                e.preventDefault();
                const u = document.getElementById('reg-username').value;
                const p = document.getElementById('reg-password').value;
                const s = document.getElementById('reg-sector').value;
                if (!u || !p) return;

                const res = await window.KuraServer.register(u, p, s);
                if (res.success) {
                    if (window.KuraSounds) window.KuraSounds.synthSciFiNotification();
                    this.closePilotModal();
                    this.updateAuthUI();
                } else {
                    if (errorBanner) {
                        errorBanner.textContent = res.error || 'Registration failed.';
                        errorBanner.classList.remove('hidden');
                    }
                }
            });
        }

        // Leaderboard Sector Tabs
        const lbTabs = document.querySelectorAll('.lb-tab');
        lbTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                lbTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentLbSector = tab.getAttribute('data-game');
                this.renderLeaderboardSector(this.currentLbSector);
                if (window.KuraSounds) window.KuraSounds.playClick();
            });
        });

        // Listen for Auth changes
        if (window.KuraServer) {
            window.KuraServer.onAuthChange(() => this.updateAuthUI());
        }

        this.updateAuthUI();
        this.updateServerStatusBadge();
    }

    async updateServerStatusBadge() {
        const led = document.getElementById('server-status-led');
        const text = document.getElementById('server-status-text');
        if (!led || !text) return;

        const isOnline = await window.KuraServer.checkServerHealth();
        if (isOnline) {
            led.style.background = 'var(--neon-green)';
            led.style.boxShadow = '0 0 10px var(--neon-green)';
            text.textContent = 'CONNECTED: LOCAL ARCADE SERVER (PORT 3000)';
        } else {
            led.style.background = 'var(--neon-cyan)';
            led.style.boxShadow = '0 0 10px var(--neon-cyan)';
            text.textContent = 'CONNECTED: GLOBAL CLOUD NETWORK (GITHUB SYNC)';
        }
    }

    updateAuthUI() {
        const user = window.KuraServer ? window.KuraServer.currentUser : null;
        const navLabel = document.getElementById('pilot-nav-label');
        const navLed = document.getElementById('pilot-nav-led');
        const lbPilotName = document.getElementById('lb-pilot-name');

        if (user) {
            const providerTag = user.provider === 'google' ? ' [G-VERIFIED]' : '';
            if (navLabel) navLabel.textContent = `PILOT: ${user.username}${providerTag}`;
            if (navLed) {
                navLed.style.background = 'var(--neon-green)';
                navLed.style.boxShadow = '0 0 10px var(--neon-green)';
            }
            if (lbPilotName) lbPilotName.textContent = `PILOT: ${user.username}${providerTag}`;

            // Update Multiplayer callsign
            if (window.KuraMultiplayer) {
                window.KuraMultiplayer.setPlayerName(user.username);
            }
            if (this.playerNameInput) {
                this.playerNameInput.value = user.username;
            }
        } else {
            if (navLabel) navLabel.textContent = 'PILOT LOGIN';
            if (navLed) {
                navLed.style.background = 'var(--neon-coral)';
                navLed.style.boxShadow = '0 0 8px var(--neon-coral)';
            }
            if (lbPilotName) lbPilotName.textContent = 'GUEST (NOT LOGGED IN)';
        }
    }

    openPilotModal() {
        if (this.pilotModal) {
            this.pilotModal.classList.add('active');
            if (window.KuraSounds) window.KuraSounds.playClick();
        }
    }

    closePilotModal() {
        if (this.pilotModal) {
            this.pilotModal.classList.remove('active');
        }
    }

    async openLeaderboardModal() {
        if (!this.leaderboardModal) return;
        this.leaderboardModal.classList.add('active');
        if (window.KuraSounds) window.KuraSounds.playClick();

        const user = window.KuraServer ? window.KuraServer.currentUser : null;
        const authGate = document.getElementById('lb-auth-gate');
        const contentArea = document.getElementById('lb-content-area');

        // Require user login to view and participate in the leaderboard
        if (!user) {
            if (authGate) authGate.classList.remove('hidden');
            if (contentArea) contentArea.classList.add('hidden');
            return;
        }

        if (authGate) authGate.classList.add('hidden');
        if (contentArea) contentArea.classList.remove('hidden');

        await this.renderLeaderboardSector(this.currentLbSector || 'aim-matrix');
    }

    async renderLeaderboardSector(gameId) {
        const tbody = document.getElementById('leaderboard-table-body');
        if (!tbody || !window.KuraServer) return;

        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 20px;">FETCHING SERVER RANKINGS...</td></tr>`;

        const scores = await window.KuraServer.fetchLeaderboard(gameId);
        const currentUser = window.KuraServer.currentUser;

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 20px;">NO RECORDED SCORES YET. BE THE FIRST!</td></tr>`;
            return;
        }

        tbody.innerHTML = scores.map((item, idx) => {
            const isCurrent = currentUser && currentUser.username === item.username;
            const rankBadge = idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`;
            const statText = gameId === 'flash-reflex' ? `${item.score} ms` : gameId === 'neon-dash' ? `${item.score}m` : `${item.score} pts`;

            return `
                <tr class="${isCurrent ? 'lb-current-pilot-row' : ''}">
                    <td><strong style="color: ${idx < 3 ? 'var(--neon-green)' : 'var(--text-muted)'}; font-family: 'JetBrains Mono', monospace;">${rankBadge}</strong></td>
                    <td>
                        <strong style="color: ${isCurrent ? 'var(--neon-cyan)' : '#FFFFFF'}; font-family: 'Space Grotesk', sans-serif;">${item.username}</strong>
                        ${item.title ? `<span style="font-size: 9px; color: var(--neon-emerald); margin-left: 6px; padding: 2px 6px; border: 1px solid var(--neon-emerald); border-radius: 4px;">${item.title}</span>` : ''}
                    </td>
                    <td style="color: var(--neon-cyan); font-family: 'JetBrains Mono', monospace; font-weight: 700;">${statText}</td>
                    <td style="color: var(--neon-emerald); font-family: 'JetBrains Mono', monospace; font-size: 11px;">✓ VERIFIED</td>
                </tr>
            `;
        }).join('');
    }

    checkUrlRoom() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('room');
        if (roomCode) {
            this.openPartyModal();
            const joinInput = document.getElementById('join-room-input');
            if (joinInput) joinInput.value = roomCode;
            this.joinPartyRoom(roomCode);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.kuraArcade = new ArcadeHub();
});
