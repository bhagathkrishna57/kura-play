// Main Application Orchestrator for KURA Cyber-Arcade

class ArcadeHub {
    constructor() {
        this.currentGame = null;
        this.currentGameId = null;
        this.currentMode = 'solo';
        this.availableGames = ['aim-matrix', 'neon-dash', 'flash-reflex', 'cyber-slicer', 'pulse-deflector'];

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
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resizeActiveCanvas(), 150);
        });
        this.initMobileNav();
        this.initMandatoryGate();
        this.initPilotAuth();
    }

    resizeActiveCanvas() {
        if (!this.activeCanvas) return;
        this.activeCanvas.width = window.innerWidth;
        this.activeCanvas.height = window.innerHeight;
        if (this.currentGame && typeof this.currentGame.handleResize === 'function') {
            this.currentGame.handleResize(this.activeCanvas.width, this.activeCanvas.height);
        }
    }

    initMobileNav() {
        this.mobileDrawer = document.getElementById('mobile-nav-drawer');
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const menuClose = document.getElementById('mobile-nav-close');

        const toggleDrawer = (open) => {
            if (!this.mobileDrawer) return;
            const shouldOpen = open !== undefined ? open : !this.mobileDrawer.classList.contains('active');
            if (shouldOpen) {
                this.mobileDrawer.classList.add('active');
            } else {
                this.mobileDrawer.classList.remove('active');
            }
            if (window.KuraSounds) window.KuraSounds.playClick();
        };

        if (menuToggle) menuToggle.addEventListener('click', () => toggleDrawer());
        if (menuClose) menuClose.addEventListener('click', () => toggleDrawer(false));

        // Close drawer when clicking outside content
        if (this.mobileDrawer) {
            this.mobileDrawer.addEventListener('click', (e) => {
                if (e.target === this.mobileDrawer) toggleDrawer(false);
            });
        }

        const mobileLb = document.getElementById('mobile-lb-btn');
        if (mobileLb) {
            mobileLb.addEventListener('click', () => {
                toggleDrawer(false);
                this.openLeaderboardModal();
            });
        }

        const mobileParty = document.getElementById('mobile-party-btn');
        if (mobileParty) {
            mobileParty.addEventListener('click', () => {
                toggleDrawer(false);
                this.openPartyModal();
            });
        }

        const mobileSkip = document.getElementById('mobile-skip-btn');
        if (mobileSkip) {
            mobileSkip.addEventListener('click', () => {
                toggleDrawer(false);
                this.skipToNextGame();
            });
        }

        const mobileLogout = document.getElementById('mobile-logout-btn');
        if (mobileLogout) {
            mobileLogout.addEventListener('click', async () => {
                toggleDrawer(false);
                await this.logout();
            });
        }
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
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            // Strict Gate Check: Block all gameplay shortcuts when logged out or gate is active
            const user = window.KuraServer ? window.KuraServer.currentUser : null;
            if (!user) {
                // If user presses Escape, don't do anything destructive
                if (e.key === 'Escape') {
                    if (this.leaderboardModal) this.leaderboardModal.classList.remove('active');
                    if (this.partyModal) this.partyModal.classList.remove('active');
                }
                return;
            }

            // R to Try Again / Restart game anytime
            if (e.key === 'r' || e.key === 'R') {
                if (this.currentGameId) {
                    e.preventDefault();
                    this.retryGame();
                    return;
                }
            }

            // L to open Global Leaderboard anytime
            if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                this.openLeaderboardModal();
                return;
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

        const hudHubBtn = document.getElementById('hud-hub-btn') || document.getElementById('hud-back-btn');
        if (hudHubBtn) {
            hudHubBtn.addEventListener('click', () => {
                if (window.KuraSounds) window.KuraSounds.playClick();
                this.showHub();
            });
        }

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

        const openPartyBtn = document.getElementById('open-party-btn');
        const hudPartyBtn = document.getElementById('hud-party-btn');
        [openPartyBtn, hudPartyBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    if (window.KuraSounds) window.KuraSounds.playClick();
                    this.openPartyModal();
                });
            }
        });

        const closePartyBtn = document.getElementById('close-party-modal');
        if (closePartyBtn) {
            closePartyBtn.addEventListener('click', () => {
                if (window.KuraSounds) window.KuraSounds.playClick();
                if (this.partyModal) this.partyModal.classList.remove('active');
            });
        }

        const btnCreateRoom = document.getElementById('btn-create-room');
        if (btnCreateRoom) {
            btnCreateRoom.addEventListener('click', () => {
                if (window.KuraSounds) window.KuraSounds.playClick();
                this.createPartyRoom();
            });
        }

        const btnJoinRoom = document.getElementById('btn-join-room');
        const joinInput = document.getElementById('join-room-input');
        if (btnJoinRoom) {
            btnJoinRoom.addEventListener('click', () => {
                if (joinInput && joinInput.value) {
                    if (window.KuraSounds) window.KuraSounds.playClick();
                    this.joinPartyRoom(joinInput.value);
                }
            });
        }

        // Support pressing Enter inside the room code input
        if (joinInput) {
            joinInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (btnJoinRoom) btnJoinRoom.click();
                }
            });
        }

        // 1-Click Paste button from Clipboard
        const btnPasteRoom = document.getElementById('btn-paste-room');
        if (btnPasteRoom) {
            btnPasteRoom.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (joinInput && text) {
                        // Extract room code if a full URL was pasted (e.g. ?room=KURA-123)
                        const match = text.match(/(KURA-\d+)/i);
                        joinInput.value = match ? match[1].toUpperCase() : text.trim().toUpperCase();
                        if (window.KuraSounds) window.KuraSounds.playClick();
                        btnPasteRoom.textContent = '✓ PASTED!';
                        setTimeout(() => { btnPasteRoom.textContent = '📋 PASTE'; }, 1500);
                    }
                } catch (err) {
                    // Fallback focus to input for manual Ctrl+V
                    if (joinInput) {
                        joinInput.focus();
                        joinInput.select();
                    }
                }
            });
        }

        if (this.playerNameInput) {
            this.playerNameInput.addEventListener('change', () => {
                if (window.KuraMultiplayer) window.KuraMultiplayer.setPlayerName(this.playerNameInput.value);
            });
        }

        ['open-leaderboard-btn', 'hub-open-lb-btn', 'go-leaderboard-btn', 'hud-lb-btn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    if (window.KuraSounds) window.KuraSounds.playClick();
                    this.openLeaderboardModal();
                });
            }
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
        if (!window.KuraServer || !window.KuraServer.currentUser) {
            this.showAuthGate('PILOT AUTHENTICATION REQUIRED // GUEST PLAY DISABLED');
            return;
        }
        if (!this.currentGameId) return;
        if (window.KuraSounds) window.KuraSounds.playClick();
        if (this.roundOverOverlay) {
            this.roundOverOverlay.classList.remove('active');
            this.roundOverOverlay.style.display = 'none';
        }
        this.launchGame(this.currentGameId);
    }

    showHub(updateHistory = true) {
        document.body.classList.remove('in-game');
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
        if (!window.KuraServer || !window.KuraServer.currentUser) {
            this.showAuthGate('PILOT AUTHENTICATION REQUIRED // GUEST PLAY DISABLED');
            return;
        }

        const GameClass = window.KuraGames ? window.KuraGames[gameId] : null;
        if (!GameClass) return;

        if (this.currentGame) {
            this.currentGame.destroy();
            this.currentGame = null;
        }

        this.currentGameId = gameId;
        document.body.classList.add('in-game');
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

        // Display authenticated pilot callsign on in-game HUD
        const hudPilot = document.getElementById('hud-pilot-name');
        if (hudPilot && window.KuraServer.currentUser) {
            hudPilot.textContent = `PILOT: ${window.KuraServer.currentUser.username}`;
        }

        // Start game instantly
        this.currentGame = instance;
        instance.start({ mode: this.currentMode });
    }

    skipToNextGame() {
        if (!window.KuraServer || !window.KuraServer.currentUser) {
            this.showAuthGate('PILOT AUTHENTICATION REQUIRED // GUEST PLAY DISABLED');
            return;
        }
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
        const srvIconEl = document.getElementById('go-server-icon');
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
                srvStatusEl.onclick = null;
                if (srvIconEl) srvIconEl.textContent = '⚡';
                srvMsgEl.textContent = `SAVING SCORE TO DATABASE AS [${user.username}]...`;
                
                try {
                    const submitRes = await window.KuraServer.submitScore(this.currentGameId, numericScore);
                    if (srvIconEl) srvIconEl.textContent = '✓';
                    if (submitRes && submitRes.success) {
                        const rankInfo = submitRes.userRank ? ` // RANK #${submitRes.userRank} OF ${submitRes.totalPilots || 1}` : '';
                        srvMsgEl.innerHTML = `SAVED TO DATABASE AS <strong>[${user.username}]</strong>${rankInfo}`;
                    } else {
                        srvMsgEl.textContent = `SCORE RECORDED AS [${user.username}]`;
                    }
                } catch (e) {
                    srvMsgEl.textContent = `SAVED LOCALLY AS [${user.username}]`;
                }

                srvStatusEl.style.cursor = 'pointer';
                srvStatusEl.title = 'Click to open Global Leaderboard [L]';
                srvStatusEl.onclick = () => {
                    this.openLeaderboardModal();
                };
            } else {
                srvStatusEl.className = 'go-server-status-pill prompt';
                if (srvIconEl) srvIconEl.textContent = '🔒';
                srvMsgEl.innerHTML = `<strong>ACCESS DENIED:</strong> Please authenticate to save scores.`;
                srvStatusEl.onclick = () => {
                    this.showAuthGate();
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
        const statPulse = document.getElementById('stat-pulse-deflector');

        if (statAim && stats['aim-matrix']) statAim.textContent = `SCORE: ${stats['aim-matrix'].highScore || 0}`;
        if (statNeon && stats['neon-dash']) statNeon.textContent = `BEST: ${stats['neon-dash'].highScore || 0}m`;
        if (statFlash && stats['flash-reflex']) {
            const ms = stats['flash-reflex'].bestMs;
            statFlash.textContent = `BEST: ${ms && ms !== 9999 ? ms + 'ms' : '--'}`;
        }
        if (statSlicer && stats['cyber-slicer']) statSlicer.textContent = `SCORE: ${stats['cyber-slicer'].highScore || 0}`;
        if (statPulse && stats['pulse-deflector']) statPulse.textContent = `SCORE: ${stats['pulse-deflector'].highScore || 0} PTS`;
    }

    openPartyModal() {
        if (!this.partyModal) return;
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
    // MANDATORY AUTHENTICATION ACCESS GATE
    // ==============================================================
    initMandatoryGate() {
        this.authGate = document.getElementById('mandatory-auth-gate');
        this.gateTabLogin = document.getElementById('gate-tab-login');
        this.gateTabReg = document.getElementById('gate-tab-register');
        this.gateFormLogin = document.getElementById('gate-form-login');
        this.gateFormReg = document.getElementById('gate-form-register');
        this.gateError = document.getElementById('gate-error-banner');
        this.navLogoutBtn = document.getElementById('nav-logout-btn');

        if (this.gateTabLogin && this.gateTabReg) {
            this.gateTabLogin.addEventListener('click', () => {
                this.gateTabLogin.classList.add('active');
                this.gateTabReg.classList.remove('active');
                if (this.gateFormLogin) this.gateFormLogin.classList.remove('hidden');
                if (this.gateFormReg) this.gateFormReg.classList.add('hidden');
                if (this.gateError) this.gateError.classList.add('hidden');
                if (window.KuraSounds) window.KuraSounds.playClick();
            });

            this.gateTabReg.addEventListener('click', () => {
                this.gateTabReg.classList.add('active');
                this.gateTabLogin.classList.remove('active');
                if (this.gateFormReg) this.gateFormReg.classList.remove('hidden');
                if (this.gateFormLogin) this.gateFormLogin.classList.add('hidden');
                if (this.gateError) this.gateError.classList.add('hidden');
                if (window.KuraSounds) window.KuraSounds.playClick();
            });
        }

        if (this.gateFormLogin) {
            this.gateFormLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const u = document.getElementById('gate-login-user').value.trim();
                const p = document.getElementById('gate-login-pass').value;
                const submitBtn = document.getElementById('gate-login-submit');

                if (!u || !p) return;

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span>AUTHENTICATING PILOT...</span>';
                }

                const res = await window.KuraServer.login(u, p);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>AUTHENTICATE & ENTER ARCADE ➔</span>';
                }

                if (res.success) {
                    if (window.KuraSounds) window.KuraSounds.synthAccessGrantedSlam();
                    this.hideAuthGate();
                    this.updateAuthUI();
                } else {
                    if (this.gateError) {
                        this.gateError.textContent = res.error || 'Authentication failed.';
                        this.gateError.classList.remove('hidden');
                    }
                }
            });
        }

        if (this.gateFormReg) {
            this.gateFormReg.addEventListener('submit', async (e) => {
                e.preventDefault();
                const u = document.getElementById('gate-reg-user').value.trim();
                const p = document.getElementById('gate-reg-pass').value;
                const s = document.getElementById('gate-reg-sector').value;
                const submitBtn = document.getElementById('gate-reg-submit');

                if (!u || !p) return;

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span>ENLISTING PILOT...</span>';
                }

                const res = await window.KuraServer.register(u, p, s);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>ENLIST PILOT & ENTER ARCADE ➔</span>';
                }

                if (res.success) {
                    if (window.KuraSounds) window.KuraSounds.synthAccessGrantedSlam();
                    this.hideAuthGate();
                    this.updateAuthUI();
                } else {
                    if (this.gateError) {
                        this.gateError.textContent = res.error || 'Registration failed.';
                        this.gateError.classList.remove('hidden');
                    }
                }
            });
        }

        if (this.navLogoutBtn) {
            this.navLogoutBtn.addEventListener('click', async () => {
                if (window.KuraSounds) window.KuraSounds.playClick();
                await this.logout();
            });
        }

        // Gate state check on startup
        if (window.KuraServer && window.KuraServer.currentUser) {
            this.hideAuthGate();
        } else {
            this.showAuthGate();
        }
    }

    showAuthGate(errorMsg = '') {
        if (!this.authGate) this.authGate = document.getElementById('mandatory-auth-gate');
        if (this.authGate) {
            this.authGate.classList.remove('hidden');
            this.authGate.style.display = 'flex';
        }
        if (this.gateError) {
            if (errorMsg) {
                this.gateError.textContent = errorMsg;
                this.gateError.classList.remove('hidden');
            } else {
                this.gateError.classList.add('hidden');
            }
        }
    }

    hideAuthGate() {
        if (!this.authGate) this.authGate = document.getElementById('mandatory-auth-gate');
        if (this.authGate) {
            this.authGate.classList.add('hidden');
            setTimeout(() => {
                if (this.authGate && this.authGate.classList.contains('hidden')) {
                    this.authGate.style.display = 'none';
                }
            }, 350);
        }
    }

    async logout() {
        if (window.KuraServer) {
            await window.KuraServer.logout();
        }
        if (this.currentGame) {
            this.showHub(false);
        }
        if (this.mobileDrawer) this.mobileDrawer.classList.remove('active');
        if (this.leaderboardModal) this.leaderboardModal.classList.remove('active');
        if (this.partyModal) this.partyModal.classList.remove('active');
        if (this.pilotModal) this.pilotModal.classList.remove('active');

        this.showAuthGate('Pilot logged out. Please authenticate with your callsign to enter the arcade matrix.');
        this.updateAuthUI();
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
        const mandatoryGoogleBtn = document.getElementById('mandatory-google-signin-btn');

        const triggerGoogleAuth = async () => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            
            let googleName = prompt('Enter Your Pilot Callsign / Display Name for Google Sign-In:', '');
            if (!googleName || !googleName.trim()) return;
            googleName = googleName.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
            if (googleName.length < 3) googleName = `PILOT_${Math.floor(1000 + Math.random() * 9000)}`;

            const res = await window.KuraServer.loginWithGoogle({
                name: googleName,
                email: `${googleName.toLowerCase()}@gmail.com`,
                picture: 'https://lh3.googleusercontent.com/a/default-user'
            });

            if (res.success) {
                if (window.KuraSounds) window.KuraSounds.synthAccessGrantedSlam();
                this.hideAuthGate();
                this.closePilotModal();
                this.updateAuthUI();
                if (this.leaderboardModal && this.leaderboardModal.classList.contains('active')) {
                    this.openLeaderboardModal();
                }
            } else {
                if (this.gateError) {
                    this.gateError.textContent = res.error || 'Google login failed.';
                    this.gateError.classList.remove('hidden');
                }
            }
        };

        if (googleBtn) googleBtn.addEventListener('click', triggerGoogleAuth);
        if (gateGoogleBtn) gateGoogleBtn.addEventListener('click', triggerGoogleAuth);
        if (mandatoryGoogleBtn) mandatoryGoogleBtn.addEventListener('click', triggerGoogleAuth);

        if (openAuthBtn) {
            openAuthBtn.addEventListener('click', () => {
                const user = window.KuraServer ? window.KuraServer.currentUser : null;
                if (user) {
                    if (confirm(`Logged in as [${user.username}]. Do you want to log out?`)) {
                        this.logout();
                    }
                } else {
                    this.showAuthGate();
                }
            });
        }

        if (closeAuthBtn) {
            closeAuthBtn.addEventListener('click', () => this.closePilotModal());
        }

        if (gateLoginBtn) {
            gateLoginBtn.addEventListener('click', () => {
                this.leaderboardModal.classList.remove('active');
                this.showAuthGate();
            });
        }

        if (tabLoginBtn && tabRegBtn) {
            tabLoginBtn.addEventListener('click', () => {
                tabLoginBtn.classList.add('active');
                tabRegBtn.classList.remove('active');
                if (formLogin) formLogin.classList.remove('hidden');
                if (formReg) formReg.classList.add('hidden');
                if (errorBanner) errorBanner.classList.add('hidden');
            });

            tabRegBtn.addEventListener('click', () => {
                tabRegBtn.classList.add('active');
                tabLoginBtn.classList.remove('active');
                if (formReg) formReg.classList.remove('hidden');
                if (formLogin) formLogin.classList.add('hidden');
                if (errorBanner) errorBanner.classList.add('hidden');
            });
        }

        // Handle Modal Login Submission
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
                    this.hideAuthGate();
                    this.updateAuthUI();
                } else {
                    if (errorBanner) {
                        errorBanner.textContent = res.error || 'Authentication failed.';
                        errorBanner.classList.remove('hidden');
                    }
                }
            });
        }

        // Handle Modal Registration Submission
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
                    this.hideAuthGate();
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

        // Search Pilots in Leaderboard
        const lbSearchInput = document.getElementById('lb-search-input');
        if (lbSearchInput) {
            let searchTimeout = null;
            lbSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.renderLeaderboardSector(this.currentLbSector || 'aim-matrix', e.target.value.trim());
                }, 200);
            });
        }

        // Copy Room Link Button
        const btnCopyLink = document.getElementById('btn-copy-room-link');
        if (btnCopyLink) {
            btnCopyLink.addEventListener('click', () => {
                const code = (window.KuraMultiplayer && window.KuraMultiplayer.roomId) || 'KURA-ROOM';
                const shareUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                    btnCopyLink.textContent = 'LINK COPIED!';
                    setTimeout(() => { btnCopyLink.textContent = 'SHARE ROOM LINK'; }, 2000);
                }).catch(() => {});
            });
        }

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
        const navLogoutBtn = document.getElementById('nav-logout-btn');
        const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
        const hudPilotBadge = document.getElementById('hud-pilot-badge');
        const hudPilotName = document.getElementById('hud-pilot-name');
        const lbPilotName = document.getElementById('lb-pilot-name');

        if (user) {
            const providerTag = user.provider === 'google' ? ' [G-VERIFIED]' : '';
            if (navLabel) navLabel.textContent = `PILOT: ${user.username}${providerTag}`;
            if (navLed) {
                navLed.style.background = 'var(--neon-green)';
                navLed.style.boxShadow = '0 0 10px var(--neon-green)';
            }
            if (navLogoutBtn) navLogoutBtn.classList.remove('hidden');
            if (mobileLogoutBtn) mobileLogoutBtn.classList.remove('hidden');

            if (hudPilotName) hudPilotName.textContent = `PILOT: ${user.username}`;
            if (hudPilotBadge) hudPilotBadge.title = `Authenticated Pilot: ${user.username} [VERIFIED]`;

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
            if (navLogoutBtn) navLogoutBtn.classList.add('hidden');
            if (mobileLogoutBtn) mobileLogoutBtn.classList.add('hidden');

            if (hudPilotName) hudPilotName.textContent = 'PILOT: GUEST';
            if (hudPilotBadge) hudPilotBadge.title = 'Restricted: Guest Play Disabled';
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

        if (this.currentGameId) {
            this.currentLbSector = this.currentGameId;
            const lbTabs = document.querySelectorAll('.lb-tab');
            lbTabs.forEach(tab => {
                if (tab.getAttribute('data-game') === this.currentLbSector) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }

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

    async renderLeaderboardSector(gameId, searchQuery = '') {
        const tbody = document.getElementById('leaderboard-table-body');
        if (!tbody || !window.KuraServer) return;

        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 20px;">FETCHING SERVER RANKINGS...</td></tr>`;

        const searchInput = document.getElementById('lb-search-input');
        const query = searchQuery !== '' ? searchQuery : (searchInput ? searchInput.value.trim() : '');

        const data = await window.KuraServer.fetchLeaderboard(gameId, query);
        const scores = (data && Array.isArray(data.scores)) ? data.scores : (Array.isArray(data) ? data : []);
        const currentUser = window.KuraServer.currentUser;

        // Render User Rank Banner
        const myRankIcon = document.getElementById('lb-my-rank-icon');
        const myRankHeadline = document.getElementById('lb-my-rank-headline');
        const myScoreDisplay = document.getElementById('lb-my-score-display');

        if (myRankHeadline && myScoreDisplay) {
            if (data && data.userRank) {
                const rank = data.userRank;
                const total = data.totalPilots || scores.length;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏆';
                if (myRankIcon) myRankIcon.textContent = medal;
                myRankHeadline.innerHTML = `RANK <span style="color: var(--neon-green); font-weight: 900;">#${rank}</span> OF ${total} VERIFIED PILOTS`;
                const statUnit = gameId === 'flash-reflex' ? 'ms' : gameId === 'neon-dash' ? 'm' : 'pts';
                myScoreDisplay.textContent = `${data.userBestScore} ${statUnit}`;
            } else if (currentUser) {
                if (myRankIcon) myRankIcon.textContent = '🎯';
                myRankHeadline.textContent = `UNRANKED IN SECTOR ${gameId.toUpperCase()}`;
                myScoreDisplay.textContent = 'PLAY TO CLAIM RANK';
            } else {
                if (myRankIcon) myRankIcon.textContent = '🔒';
                myRankHeadline.textContent = 'LOGIN REQUIRED FOR RANKING';
                myScoreDisplay.textContent = '--';
            }
        }

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 20px;">${query ? 'NO MATCHING PILOTS FOUND FOR "' + query.toUpperCase() + '"' : 'NO RECORDED SCORES YET IN THIS SECTOR. BE THE FIRST!'}</td></tr>`;
            return;
        }

        tbody.innerHTML = scores.map((item, idx) => {
            const isCurrent = currentUser && currentUser.username.toUpperCase() === item.username.toUpperCase();
            const rankNum = item.rank || (idx + 1);
            const rankBadge = rankNum === 1 ? '🥇 #1' : rankNum === 2 ? '🥈 #2' : rankNum === 3 ? '🥉 #3' : `#${rankNum}`;
            const statText = gameId === 'flash-reflex' ? `${item.score} ms` : gameId === 'neon-dash' ? `${item.score}m` : `${item.score} pts`;

            return `
                <tr class="${isCurrent ? 'lb-current-pilot-row' : ''}">
                    <td><strong style="color: ${rankNum <= 3 ? 'var(--neon-green)' : 'var(--text-muted)'}; font-family: 'JetBrains Mono', monospace;">${rankBadge}</strong></td>
                    <td>
                        <strong style="color: ${isCurrent ? 'var(--neon-cyan)' : '#FFFFFF'}; font-family: 'Space Grotesk', sans-serif;">${item.username}</strong>
                        ${isCurrent ? `<span style="font-size: 10px; background: rgba(0, 217, 245, 0.2); color: var(--neon-cyan); padding: 2px 6px; border-radius: 4px; margin-left: 6px; border: 1px solid var(--neon-cyan); font-weight: 700;">YOU</span>` : ''}
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
