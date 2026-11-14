// Main Application Orchestrator for KURA Cyber-Arcade

const CYBER_PRESETS = {
    1: { icon: '⚡', name: 'Neon Spark' },
    2: { icon: '🤖', name: 'Cyber Android' },
    3: { icon: '🎯', name: 'Aim Master' },
    4: { icon: '🛡️', name: 'Aegis Sentinel' },
    5: { icon: '⚔️', name: 'Cyber Slicer' },
    6: { icon: '🌌', name: 'Void Walker' }
};

function getPresetAvatarIcon(id) {
    const key = parseInt(id, 10);
    return (CYBER_PRESETS[key] && CYBER_PRESETS[key].icon) || '⚡';
}

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
        this.profileModal = document.getElementById('profile-modal');
        this.currentLbSector = 'aim-matrix';
        this.isComparingRecords = false;
        this.selectedAvatarId = 1;
        this.customAvatarDataUrl = '';

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
        this.initPilotProfile();
        this.initFirebaseSessionSync();
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
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

            // Strict Gate Check: Block all gameplay shortcuts when logged out or gate is active
            const user = window.KuraServer ? window.KuraServer.currentUser : null;
            if (!user) {
                // If user presses Escape, don't do anything destructive
                if (e.key === 'Escape') {
                    if (this.leaderboardModal) this.leaderboardModal.classList.remove('active');
                    if (this.partyModal) this.partyModal.classList.remove('active');
                    if (this.profileModal) this.profileModal.classList.remove('active');
                }
                return;
            }

            // P to open Pilot Profile anytime
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.toggleProfileModal();
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
        if (this.profileModal && this.profileModal.classList.contains('active')) {
            this.profileModal.classList.remove('active');
            return;
        }
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
        if (!window.KuraServer || !window.KuraServer.currentUser) {
            this.showAuthGate('AUTHENTICATION REQUIRED // GUEST MULTIPLAYER DISABLED');
            return;
        }
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
                <span class="clickable-callsign" data-callsign="${p.name}" title="Click to view pilot dossier">
                    👤 <strong>${p.name}</strong> ${p.isHost ? '(Host)' : ''}
                </span>
                <span style="color: var(--neon-green); font-size: 11px;">CONNECTED</span>
            </div>
        `).join('');

        container.querySelectorAll('.clickable-callsign').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = el.getAttribute('data-callsign');
                if (name) this.openPilotProfileModal(name);
            });
        });
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
        this.authLoading = true;
        const gateLoader = document.getElementById('gate-auth-loader');
        if (window.KuraServer && window.KuraServer.currentUser) {
            if (gateLoader) gateLoader.classList.add('hidden');
            this.authLoading = false;
            this.hideAuthGate();
        } else {
            if (gateLoader) gateLoader.classList.remove('hidden');
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
        // Sign out of Firebase Auth session
        try {
            if (window.KuraFirebase && window.KuraFirebase.signOutUser) {
                await window.KuraFirebase.signOutUser();
            }
        } catch (err) {
            console.warn('[KURA AUTH] Firebase signOut error:', err);
        }

        // Invalidate backend session token
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
        if (this.profileModal) this.profileModal.classList.remove('active');

        this.showAuthGate('Pilot logged out. Please authenticate with Callsign or Google to enter.');
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

        // Official Firebase Google OAuth Authentication Flow
        const triggerGoogleAuth = async (e) => {
            if (window.KuraSounds) window.KuraSounds.playClick();
            
            const clickedBtn = (e && e.currentTarget) || mandatoryGoogleBtn || googleBtn || gateGoogleBtn;
            const originalHtml = clickedBtn ? clickedBtn.innerHTML : '';
            if (clickedBtn) {
                clickedBtn.disabled = true;
                clickedBtn.innerHTML = `
                    <svg class="google-svg-icon" viewBox="0 0 24 24" width="18" height="18" style="animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10" stroke="#00f3ff" stroke-width="3" fill="none" stroke-dasharray="32 10"/>
                    </svg>
                    <span>CONNECTING GOOGLE OAUTH...</span>
                `;
            }

            try {
                if (!window.KuraFirebase || !window.KuraFirebase.signInWithGoogle) {
                    throw new Error('Firebase Auth module initializing. Please retry in a second.');
                }

                // Call official Firebase Google Popup
                const authResult = await window.KuraFirebase.signInWithGoogle();

                if (!authResult.success) {
                    if (authResult.needsConsoleSetup || authResult.code === 'auth/configuration-not-found') {
                        const consoleHtml = `
                            <div class="firebase-error-card">
                                <div class="fb-error-header" style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #fff;">
                                    <span class="led-status" style="background: #ff2e55; box-shadow: 0 0 8px #ff2e55;"></span>
                                    <span>FIREBASE CONSOLE SETUP REQUIRED</span>
                                </div>
                                <div class="fb-error-desc" style="font-size: 0.78rem; line-height: 1.4; color: #ff8fa3; margin: 4px 0;">
                                    Google Sign-In is not activated yet in your Firebase Project (<strong>kura-play</strong>).
                                </div>
                                <div class="fb-error-steps" style="display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.4); padding: 8px 10px; border-radius: 4px; border-left: 2px solid #ff2e55; font-size: 11px;">
                                    <div><strong>1.</strong> Open <a href="https://console.firebase.google.com/project/kura-play/authentication/providers" target="_blank" rel="noopener noreferrer" style="color: #00f3ff; text-decoration: underline;">Firebase Console ➔ Authentication</a></div>
                                    <div><strong>2.</strong> In <strong>Sign-in method</strong>, click <strong>Google</strong> ➔ toggle <strong>Enable</strong> ➔ Save</div>
                                    <div><strong>3.</strong> In <strong>Settings &gt; Authorized domains</strong>, verify <code>localhost</code> and <code>kura-play.vercel.app</code></div>
                                </div>
                                <div class="fb-fallback-box" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #ccc;">
                                    <div style="margin-bottom: 6px;">Want to play immediately? Use Callsign login or click below:</div>
                                    <button type="button" id="btn-quick-gate-enlist" class="gate-btn-submit" style="padding: 8px 12px; font-size: 0.78rem; background: linear-gradient(135deg, #00f3ff, #ff0077); border: none; cursor: pointer; border-radius: 4px; color: #fff; font-weight: bold;">
                                        ⚡ QUICK PILOT DEMO ACCESS (VIPER_01) ➔
                                    </button>
                                </div>
                            </div>
                        `;
                        if (this.gateError) {
                            this.gateError.innerHTML = consoleHtml;
                            this.gateError.classList.remove('hidden');
                            const quickBtn = document.getElementById('btn-quick-gate-enlist');
                            if (quickBtn) {
                                quickBtn.addEventListener('click', async () => {
                                    const u = 'VIPER_01';
                                    const p = 'kura2026';
                                    let res = await window.KuraServer.login(u, p);
                                    if (!res.success) {
                                        res = await window.KuraServer.register(u, p, 'AIM MATRIX');
                                    }
                                    if (res.success) {
                                        if (window.KuraSounds) window.KuraSounds.synthAccessGrantedSlam();
                                        this.hideAuthGate();
                                        this.updateAuthUI();
                                    }
                                });
                            }
                        }
                        if (errorBanner) {
                            errorBanner.innerHTML = consoleHtml;
                            errorBanner.classList.remove('hidden');
                        }
                        return;
                    }

                    const failMsg = authResult.message || 'Google authentication was cancelled or failed.';
                    if (this.gateError) {
                        this.gateError.textContent = failMsg;
                        this.gateError.classList.remove('hidden');
                    }
                    if (errorBanner) {
                        errorBanner.textContent = failMsg;
                        errorBanner.classList.remove('hidden');
                    }
                    return;
                }

                const fbUser = authResult.user;
                const cleanName = (fbUser.displayName || fbUser.email.split('@')[0])
                    .trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

                // Synchronize verified Google credentials with SQLite backend
                const res = await window.KuraServer.loginWithGoogle({
                    name: cleanName,
                    email: fbUser.email,
                    picture: fbUser.photoURL || '',
                    uid: fbUser.uid
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
                    const serverMsg = res.error || 'Server rejected Google authentication.';
                    if (this.gateError) {
                        this.gateError.textContent = serverMsg;
                        this.gateError.classList.remove('hidden');
                    }
                    if (errorBanner) {
                        errorBanner.textContent = serverMsg;
                        errorBanner.classList.remove('hidden');
                    }
                }
            } catch (err) {
                console.error('[KURA AUTH] Google Sign-In error:', err);
                const exMsg = err.message || 'Authentication error encountered.';
                if (this.gateError) {
                    this.gateError.textContent = exMsg;
                    this.gateError.classList.remove('hidden');
                }
                if (errorBanner) {
                    errorBanner.textContent = exMsg;
                    errorBanner.classList.remove('hidden');
                }
            } finally {
                if (clickedBtn && originalHtml) {
                    clickedBtn.disabled = false;
                    clickedBtn.innerHTML = originalHtml;
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
                    this.openPilotProfileModal();
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
        const navProfilePic = document.getElementById('nav-profile-pic');
        const navProfileDefaultIcon = document.getElementById('nav-profile-default-icon');

        const mobileProfileTitle = document.getElementById('mobile-profile-title');
        const mobileProfilePic = document.getElementById('mobile-profile-pic');
        const mobileProfileDefaultIcon = document.getElementById('mobile-profile-default-icon');

        const hudPilotBadge = document.getElementById('hud-pilot-badge');
        const hudPilotName = document.getElementById('hud-pilot-name');
        const hudProfilePic = document.getElementById('hud-profile-pic');
        const hudProfileDefaultIcon = document.getElementById('hud-profile-default-icon');

        const lbPilotName = document.getElementById('lb-pilot-name');

        if (user) {
            const providerTag = user.provider === 'google' ? ' [G-VERIFIED]' : '';
            if (navLabel) navLabel.textContent = `PROFILE: ${user.username}${providerTag}`;
            if (navLed) {
                navLed.style.background = 'var(--neon-green)';
                navLed.style.boxShadow = '0 0 10px var(--neon-green)';
            }

            // Top Nav Avatar Display
            if (user.avatar && navProfilePic) {
                navProfilePic.src = user.avatar;
                navProfilePic.classList.remove('hidden');
                if (navProfileDefaultIcon) navProfileDefaultIcon.classList.add('hidden');
            } else if (navProfileDefaultIcon) {
                navProfileDefaultIcon.textContent = getPresetAvatarIcon(user.avatar_id || 1);
                navProfileDefaultIcon.classList.remove('hidden');
                if (navProfilePic) navProfilePic.classList.add('hidden');
            }

            // Mobile Command Menu Avatar
            if (mobileProfileTitle) mobileProfileTitle.textContent = `PROFILE: ${user.username}`;
            if (user.avatar && mobileProfilePic) {
                mobileProfilePic.src = user.avatar;
                mobileProfilePic.classList.remove('hidden');
                if (mobileProfileDefaultIcon) mobileProfileDefaultIcon.classList.add('hidden');
            } else if (mobileProfileDefaultIcon) {
                mobileProfileDefaultIcon.textContent = getPresetAvatarIcon(user.avatar_id || 1);
                mobileProfileDefaultIcon.classList.remove('hidden');
                if (mobileProfilePic) mobileProfilePic.classList.add('hidden');
            }

            // In-game Floating HUD Avatar
            if (hudPilotName) hudPilotName.textContent = `PROFILE: ${user.username}`;
            if (hudPilotBadge) hudPilotBadge.title = `Authenticated Pilot: ${user.username} [VERIFIED] (Click to open profile)`;
            if (user.avatar && hudProfilePic) {
                hudProfilePic.src = user.avatar;
                hudProfilePic.classList.remove('hidden');
                if (hudProfileDefaultIcon) hudProfileDefaultIcon.classList.add('hidden');
            } else if (hudProfileDefaultIcon) {
                hudProfileDefaultIcon.textContent = getPresetAvatarIcon(user.avatar_id || 1);
                hudProfileDefaultIcon.classList.remove('hidden');
                if (hudProfilePic) hudProfilePic.classList.add('hidden');
            }

            if (lbPilotName) lbPilotName.textContent = `PROFILE: ${user.username}${providerTag}`;

            // Update Multiplayer callsign
            if (window.KuraMultiplayer) {
                window.KuraMultiplayer.setPlayerName(user.username);
            }
            if (this.playerNameInput) {
                this.playerNameInput.value = user.username;
            }
        } else {
            if (navLabel) navLabel.textContent = 'PILOT PROFILE';
            if (navLed) {
                navLed.style.background = 'var(--neon-coral)';
                navLed.style.boxShadow = '0 0 8px var(--neon-coral)';
            }
            if (navProfilePic) navProfilePic.classList.add('hidden');
            if (navProfileDefaultIcon) {
                navProfileDefaultIcon.textContent = '👤';
                navProfileDefaultIcon.classList.remove('hidden');
            }

            if (mobileProfileTitle) mobileProfileTitle.textContent = 'PROFILE // LOGIN';
            if (mobileProfilePic) mobileProfilePic.classList.add('hidden');
            if (mobileProfileDefaultIcon) {
                mobileProfileDefaultIcon.textContent = '👤';
                mobileProfileDefaultIcon.classList.remove('hidden');
            }

            if (hudPilotName) hudPilotName.textContent = 'PROFILE: GUEST';
            if (hudPilotBadge) hudPilotBadge.title = 'Restricted: Guest Play Disabled';
            if (hudProfilePic) hudProfilePic.classList.add('hidden');
            if (hudProfileDefaultIcon) {
                hudProfileDefaultIcon.textContent = '👤';
                hudProfileDefaultIcon.classList.remove('hidden');
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

    // ==============================================================
    // FIREBASE AUTH GLOBAL OBSERVER (SINGLE SOURCE OF TRUTH)
    // ==============================================================
    initFirebaseSessionSync() {
        const handleAuthChange = async (fbUser) => {
            const gateLoader = document.getElementById('gate-auth-loader');
            if (gateLoader) gateLoader.classList.add('hidden');
            this.authLoading = false;

            if (fbUser) {
                console.info('⚡ [KURA FIREBASE] Verified Google User Active:', fbUser.email, fbUser.uid);
                const current = window.KuraServer ? window.KuraServer.currentUser : null;
                const cleanName = (fbUser.displayName || fbUser.email.split('@')[0])
                    .trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

                // If no active session or session mismatch, synchronize with SQLite backend
                if (!current || !window.KuraServer.token || (current.email !== fbUser.email && current.provider === 'google')) {
                    const res = await window.KuraServer.loginWithGoogle({
                        name: cleanName,
                        email: fbUser.email,
                        picture: fbUser.photoURL || '',
                        uid: fbUser.uid
                    });
                    if (res.success) {
                        this.hideAuthGate();
                        this.updateAuthUI();
                    }
                } else {
                    this.hideAuthGate();
                    this.updateAuthUI();
                }
            } else {
                console.info('⚡ [KURA FIREBASE] No Firebase user detected.');
                const current = window.KuraServer ? window.KuraServer.currentUser : null;
                // If the user's active session was a Google session, but Firebase reported null, force signout
                if (current && current.provider === 'google') {
                    if (window.KuraServer) window.KuraServer.saveLocalSession(null);
                    this.showAuthGate('Google session expired. Please sign in again.');
                    this.updateAuthUI();
                } else if (!current) {
                    this.showAuthGate();
                }
            }
        };

        if (window.KuraFirebase && window.KuraFirebase.onAuthStateChanged) {
            window.KuraFirebase.onAuthStateChanged(handleAuthChange);
        } else {
            window.addEventListener('kura-firebase-ready', (e) => {
                const fb = e.detail || window.KuraFirebase;
                if (fb && fb.onAuthStateChanged) {
                    fb.onAuthStateChanged(handleAuthChange);
                }
            }, { once: true });
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

        // Update active user avatar preview in leaderboard banner
        const myAvatarImg = document.getElementById('lb-my-avatar-img');
        if (myAvatarImg) {
            if (data && data.userAvatar) {
                myAvatarImg.src = data.userAvatar;
                myAvatarImg.classList.remove('hidden');
            } else if (currentUser && currentUser.avatar) {
                myAvatarImg.src = currentUser.avatar;
                myAvatarImg.classList.remove('hidden');
            } else {
                myAvatarImg.classList.add('hidden');
            }
        }

        tbody.innerHTML = scores.map((item, idx) => {
            const isCurrent = currentUser && currentUser.username.toUpperCase() === item.username.toUpperCase();
            const rankNum = item.rank || (idx + 1);
            const rankBadge = rankNum === 1 ? '🥇 #1' : rankNum === 2 ? '🥈 #2' : rankNum === 3 ? '🥉 #3' : `#${rankNum}`;
            const statText = gameId === 'flash-reflex' ? `${item.score} ms` : gameId === 'neon-dash' ? `${item.score}m` : `${item.score} pts`;

            const avatarHtml = item.avatar
                ? `<img class="lb-avatar-img" src="${item.avatar}" alt="${item.username}">`
                : `<span class="lb-avatar-icon">${getPresetAvatarIcon(item.avatar_id || 1)}</span>`;

            return `
                <tr class="${isCurrent ? 'lb-current-pilot-row' : ''}">
                    <td><strong style="color: ${rankNum <= 3 ? 'var(--neon-green)' : 'var(--text-muted)'}; font-family: 'JetBrains Mono', monospace;">${rankBadge}</strong></td>
                    <td>
                        <div class="lb-pilot-cell">
                            <div class="lb-avatar-wrap">${avatarHtml}</div>
                            <div>
                                <strong class="clickable-callsign" data-callsign="${item.username}" style="color: ${isCurrent ? 'var(--neon-cyan)' : '#FFFFFF'}; font-family: 'Space Grotesk', sans-serif;" title="Click to inspect pilot dossier">${item.username}</strong>
                                ${isCurrent ? `<span style="font-size: 10px; background: rgba(0, 217, 245, 0.2); color: var(--neon-cyan); padding: 2px 6px; border-radius: 4px; margin-left: 6px; border: 1px solid var(--neon-cyan); font-weight: 700;">YOU</span>` : ''}
                                ${item.title ? `<span style="font-size: 9px; color: var(--neon-emerald); margin-left: 6px; padding: 2px 6px; border: 1px solid var(--neon-emerald); border-radius: 4px;">${item.title}</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td style="color: var(--neon-cyan); font-family: 'JetBrains Mono', monospace; font-weight: 700;">${statText}</td>
                    <td style="color: var(--neon-emerald); font-family: 'JetBrains Mono', monospace; font-size: 11px;">✓ VERIFIED</td>
                </tr>
            `;
        }).join('');

        // Attach click listeners to clickable-callsigns
        tbody.querySelectorAll('.clickable-callsign').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const callsign = el.getAttribute('data-callsign');
                if (callsign) {
                    this.openPilotProfileModal(callsign);
                }
            });
        });
    }

    // ==============================================================
    // PILOT PROFILE // DOSSIER SYSTEM
    // ==============================================================
    initPilotProfile() {
        const closeBtn = document.getElementById('close-profile-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (window.KuraSounds) window.KuraSounds.playClick();
                if (this.profileModal) this.profileModal.classList.remove('active');
            });
        }

        // Mobile command menu trigger
        const mobileProfileBtn = document.getElementById('mobile-profile-btn');
        if (mobileProfileBtn) {
            mobileProfileBtn.addEventListener('click', () => {
                if (this.mobileDrawer) this.mobileDrawer.classList.remove('active');
                const user = window.KuraServer ? window.KuraServer.currentUser : null;
                if (user) {
                    this.openPilotProfileModal();
                } else {
                    this.showAuthGate();
                }
            });
        }

        // Floating In-game HUD triggers
        const hudProfileBtn = document.getElementById('hud-profile-btn');
        if (hudProfileBtn) {
            hudProfileBtn.addEventListener('click', () => {
                const user = window.KuraServer ? window.KuraServer.currentUser : null;
                if (user) {
                    this.openPilotProfileModal();
                } else {
                    this.showAuthGate();
                }
            });
        }

        const hudPilotBadge = document.getElementById('hud-pilot-badge');
        if (hudPilotBadge) {
            hudPilotBadge.addEventListener('click', () => {
                const user = window.KuraServer ? window.KuraServer.currentUser : null;
                if (user) {
                    this.openPilotProfileModal();
                } else {
                    this.showAuthGate();
                }
            });
        }

        // Drawer Edit Toggle
        const toggleEditDrawerBtn = document.getElementById('btn-toggle-edit-drawer');
        const editSectorToggleBtn = document.getElementById('btn-edit-sector-toggle');
        const editDrawer = document.getElementById('dossier-edit-drawer');
        const closeDrawerBtn = document.getElementById('btn-close-drawer');

        const toggleDrawer = () => {
            if (!editDrawer) return;
            const isHidden = editDrawer.classList.contains('hidden');
            if (isHidden) {
                editDrawer.classList.remove('hidden');
            } else {
                editDrawer.classList.add('hidden');
            }
        };

        if (toggleEditDrawerBtn) toggleEditDrawerBtn.addEventListener('click', toggleDrawer);
        if (editSectorToggleBtn) editSectorToggleBtn.addEventListener('click', toggleDrawer);
        if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => editDrawer && editDrawer.classList.add('hidden'));

        // Preset Cyber Avatars
        const presetCards = document.querySelectorAll('.cyber-preset-card');
        presetCards.forEach(card => {
            card.addEventListener('click', () => {
                presetCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.selectedAvatarId = parseInt(card.getAttribute('data-id'), 10) || 1;
                this.customAvatarDataUrl = ''; // Clear custom photo if preset selected

                // Live Preview in Avatar Frame
                const img = document.getElementById('dossier-avatar-img');
                const icon = document.getElementById('dossier-avatar-icon');
                if (img) img.classList.add('hidden');
                if (icon) {
                    icon.textContent = card.getAttribute('data-icon') || '⚡';
                    icon.classList.remove('hidden');
                }
                if (window.KuraSounds) window.KuraSounds.playClick();
            });
        });

        // Custom Photo Upload via File Input
        const fileInput = document.getElementById('dossier-photo-file-input');
        const triggerUpload = () => {
            if (fileInput) fileInput.click();
        };

        const uploadTrigger = document.getElementById('dossier-photo-upload-trigger');
        const btnAvatarEdit = document.getElementById('dossier-btn-avatar-edit');
        const btnTriggerDrawer = document.getElementById('btn-trigger-upload-drawer');

        if (uploadTrigger) uploadTrigger.addEventListener('click', triggerUpload);
        if (btnAvatarEdit) btnAvatarEdit.addEventListener('click', triggerUpload);
        if (btnTriggerDrawer) btnTriggerDrawer.addEventListener('click', triggerUpload);

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    alert('Please select a valid image file (PNG, JPG, WebP).');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (loadEvt) => {
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        // High-tech square compression canvas (120x120)
                        const canvas = document.createElement('canvas');
                        canvas.width = 120;
                        canvas.height = 120;
                        const ctx = canvas.getContext('2d');

                        // Center crop & cover
                        const minDim = Math.min(tempImg.width, tempImg.height);
                        const sx = (tempImg.width - minDim) / 2;
                        const sy = (tempImg.height - minDim) / 2;
                        ctx.drawImage(tempImg, sx, sy, minDim, minDim, 0, 0, 120, 120);

                        this.customAvatarDataUrl = canvas.toDataURL('image/jpeg', 0.85);

                        // Live preview
                        const img = document.getElementById('dossier-avatar-img');
                        const icon = document.getElementById('dossier-avatar-icon');
                        if (img) {
                            img.src = this.customAvatarDataUrl;
                            img.classList.remove('hidden');
                        }
                        if (icon) icon.classList.add('hidden');

                        presetCards.forEach(c => c.classList.remove('active'));
                    };
                    tempImg.src = loadEvt.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        // Bio character count
        const bioTextarea = document.getElementById('edit-bio-textarea');
        const bioCount = document.getElementById('edit-bio-count');
        if (bioTextarea && bioCount) {
            bioTextarea.addEventListener('input', () => {
                bioCount.textContent = bioTextarea.value.length;
            });
        }

        // Save Dossier Changes Button
        const saveBtn = document.getElementById('btn-save-dossier-changes');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const sectorSelect = document.getElementById('edit-primary-sector');
                const bioInput = document.getElementById('edit-bio-textarea');
                const statusMsg = document.getElementById('drawer-status-msg');

                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span>SAVING...</span>';

                const payload = {
                    avatar_id: this.selectedAvatarId || 1,
                    primary_sector: sectorSelect ? sectorSelect.value : 'AIM MATRIX',
                    bio: bioInput ? bioInput.value.trim() : ''
                };
                if (this.customAvatarDataUrl) {
                    payload.avatar = this.customAvatarDataUrl;
                }

                const res = await window.KuraServer.updateProfile(payload);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span>💾 SAVE CHANGES</span>';

                if (res.success) {
                    if (statusMsg) {
                        statusMsg.textContent = 'Dossier successfully updated!';
                        statusMsg.classList.remove('hidden');
                        setTimeout(() => statusMsg.classList.add('hidden'), 2500);
                    }
                    if (window.KuraSounds) window.KuraSounds.synthAccessGrantedSlam();
                    this.updateAuthUI();
                    if (editDrawer) editDrawer.classList.add('hidden');
                    // Re-render dossier
                    const user = window.KuraServer.currentUser;
                    if (user) this.openPilotProfileModal(user.username);
                } else {
                    alert(`Update Failed: ${res.error || 'Server error'}`);
                }
            });
        }

        // Copy Profile Card button
        const btnCopyCard = document.getElementById('btn-copy-profile-card');
        if (btnCopyCard) {
            btnCopyCard.addEventListener('click', () => {
                const currentDossier = this.currentActiveDossier;
                if (!currentDossier) return;

                const topScore = (currentDossier.performanceMatrix && currentDossier.performanceMatrix.length)
                    ? Math.max(...currentDossier.performanceMatrix.map(p => p.bestScore || 0))
                    : 0;

                const text = `[KURA ARCADE PILOT DOSSIER]\nCallsign: ${currentDossier.username}\nUID: ${currentDossier.uid}\nClearance Title: ${currentDossier.title}\nPrimary Sector: ${currentDossier.primary_sector}\nCareer Best: ${topScore} PTS\nVerified on KURA: https://kura-play.vercel.app`;

                navigator.clipboard.writeText(text).then(() => {
                    btnCopyCard.innerHTML = '<span>✓</span> COPIED TO CLIPBOARD!';
                    setTimeout(() => {
                        btnCopyCard.innerHTML = '<span>📋</span> COPY PROFILE CARD';
                    }, 2000);
                }).catch(() => {});
            });
        }

        // Copy UID button
        const btnCopyUid = document.getElementById('btn-copy-uid');
        if (btnCopyUid) {
            btnCopyUid.addEventListener('click', () => {
                const uidEl = document.getElementById('dossier-uid');
                if (uidEl) {
                    navigator.clipboard.writeText(uidEl.textContent.trim()).then(() => {
                        btnCopyUid.textContent = '✓';
                        setTimeout(() => { btnCopyUid.textContent = '📋'; }, 2000);
                    }).catch(() => {});
                }
            });
        }

        // Logout inside profile modal
        const logoutBtn = document.getElementById('btn-dossier-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (window.KuraSounds) window.KuraSounds.playClick();
                if (confirm('Are you sure you want to log out of your pilot profile?')) {
                    if (this.profileModal) this.profileModal.classList.remove('active');
                    await this.logout();
                }
            });
        }

        // Challenge to Party button
        const btnChallenge = document.getElementById('btn-challenge-party');
        if (btnChallenge) {
            btnChallenge.addEventListener('click', () => {
                if (this.profileModal) this.profileModal.classList.remove('active');
                this.openPartyModal();
            });
        }

        // Compare Records button
        const btnCompare = document.getElementById('btn-compare-records');
        if (btnCompare) {
            btnCompare.addEventListener('click', () => {
                this.isComparingRecords = !this.isComparingRecords;
                const legend = document.getElementById('compare-legend');
                if (legend) {
                    if (this.isComparingRecords) legend.classList.remove('hidden');
                    else legend.classList.add('hidden');
                }
                btnCompare.style.background = this.isComparingRecords ? 'var(--neon-cyan)' : '';
                btnCompare.style.color = this.isComparingRecords ? '#000' : '';
                if (this.currentActiveDossier) {
                    this.renderPerformanceMatrix(this.currentActiveDossier);
                }
            });
        }

        // View My Profile button
        const btnBackMyProfile = document.getElementById('btn-back-my-profile');
        if (btnBackMyProfile) {
            btnBackMyProfile.addEventListener('click', () => {
                const user = window.KuraServer ? window.KuraServer.currentUser : null;
                if (user) {
                    this.isComparingRecords = false;
                    this.openPilotProfileModal(user.username);
                }
            });
        }
    }

    async openPilotProfileModal(targetCallsign = '') {
        const currentUser = window.KuraServer ? window.KuraServer.currentUser : null;
        const callsign = (targetCallsign || (currentUser ? currentUser.username : '')).trim();

        if (!callsign) {
            this.showAuthGate();
            return;
        }

        if (this.profileModal) {
            this.profileModal.classList.add('active');
            if (window.KuraSounds) window.KuraSounds.playClick();
        }

        const headline = document.getElementById('dossier-modal-headline');
        if (headline) headline.textContent = `PILOT DOSSIER // ARCHIVE #${callsign.toUpperCase()}`;

        // Fetch dossier from backend
        const dossier = await window.KuraServer.fetchProfile(callsign);
        if (!dossier) {
            alert(`Pilot dossier for [${callsign}] could not be found.`);
            if (this.profileModal) this.profileModal.classList.remove('active');
            return;
        }

        this.renderDossier(dossier);
    }

    renderDossier(dossier) {
        this.currentActiveDossier = dossier;

        // Avatar Frame & Photo
        const avatarFrame = document.getElementById('dossier-avatar-frame');
        const avatarImg = document.getElementById('dossier-avatar-img');
        const avatarIcon = document.getElementById('dossier-avatar-icon');

        if (avatarFrame) {
            avatarFrame.className = 'dossier-avatar-frame';
            if (dossier.title === 'Arcade Architect' || dossier.title === 'Cyber Legend') {
                avatarFrame.classList.add('rank-frame-legend');
            } else if (dossier.title === 'Synaptic Ace') {
                avatarFrame.classList.add('rank-frame-ace');
            } else if (dossier.title === 'Grid Runner') {
                avatarFrame.classList.add('rank-frame-runner');
            } else {
                avatarFrame.classList.add('rank-frame-cadet');
            }
        }

        if (dossier.avatar && avatarImg) {
            avatarImg.src = dossier.avatar;
            avatarImg.classList.remove('hidden');
            if (avatarIcon) avatarIcon.classList.add('hidden');
        } else if (avatarIcon) {
            avatarIcon.textContent = getPresetAvatarIcon(dossier.avatar_id || 1);
            avatarIcon.classList.remove('hidden');
            if (avatarImg) avatarImg.classList.add('hidden');
        }

        // ID Header details
        const callsignEl = document.getElementById('dossier-callsign');
        const titleEl = document.getElementById('dossier-clearance-title');
        const googleBadge = document.getElementById('dossier-google-badge');
        const uidEl = document.getElementById('dossier-uid');
        const enlistedEl = document.getElementById('dossier-enlisted-date');
        const sectorBadge = document.getElementById('dossier-sector-badge');
        const bioText = document.getElementById('dossier-bio-text');
        const modeTag = document.getElementById('dossier-mode-label');

        if (callsignEl) callsignEl.textContent = dossier.username;
        if (titleEl) titleEl.textContent = dossier.title.toUpperCase();
        if (googleBadge) {
            if (dossier.isGoogle) googleBadge.classList.remove('hidden');
            else googleBadge.classList.add('hidden');
        }
        if (uidEl) uidEl.textContent = dossier.uid;
        if (enlistedEl) enlistedEl.textContent = dossier.enlistedAt || '2026-10-31';
        if (sectorBadge) sectorBadge.textContent = dossier.primary_sector;
        if (bioText) bioText.textContent = dossier.bio || 'No pilot bio transmitted yet.';

        // Section A: Actions visibility
        const uploadTrigger = document.getElementById('dossier-photo-upload-trigger');
        const btnAvatarEdit = document.getElementById('dossier-btn-avatar-edit');
        const btnEditSector = document.getElementById('btn-edit-sector-toggle');
        const ownActions = document.getElementById('dossier-own-actions');
        const otherActions = document.getElementById('dossier-other-actions');

        if (dossier.isOwn) {
            if (modeTag) modeTag.textContent = 'PERSONAL DOSSIER';
            if (uploadTrigger) uploadTrigger.classList.remove('hidden');
            if (btnAvatarEdit) btnAvatarEdit.classList.remove('hidden');
            if (btnEditSector) btnEditSector.classList.remove('hidden');
            if (ownActions) ownActions.classList.remove('hidden');
            if (otherActions) otherActions.classList.add('hidden');

            // Pre-fill drawer inputs
            const editSector = document.getElementById('edit-primary-sector');
            const editBio = document.getElementById('edit-bio-textarea');
            const editBioCount = document.getElementById('edit-bio-count');
            if (editSector) editSector.value = dossier.primary_sector;
            if (editBio) editBio.value = dossier.bio || '';
            if (editBioCount) editBioCount.textContent = (dossier.bio || '').length;

            // Highlight selected preset
            document.querySelectorAll('.cyber-preset-card').forEach(c => {
                if (parseInt(c.dataset.id, 10) === (dossier.avatar_id || 1)) c.classList.add('active');
                else c.classList.remove('active');
            });
        } else {
            if (modeTag) modeTag.textContent = 'PUBLIC DOSSIER [INSPECTING]';
            if (uploadTrigger) uploadTrigger.classList.add('hidden');
            if (btnAvatarEdit) btnAvatarEdit.classList.add('hidden');
            if (btnEditSector) btnEditSector.classList.add('hidden');
            if (ownActions) ownActions.classList.add('hidden');
            if (otherActions) otherActions.classList.remove('hidden');

            const editDrawer = document.getElementById('dossier-edit-drawer');
            if (editDrawer) editDrawer.classList.add('hidden');
        }

        // Section B: 5-Sector Performance Matrix
        this.renderPerformanceMatrix(dossier);

        // Section C: Lifetime Telemetry & Medals
        const statGames = document.getElementById('dossier-stat-games');
        const statTop10 = document.getElementById('dossier-stat-top10');
        const statPartyWins = document.getElementById('dossier-stat-party-wins');

        if (statGames) statGames.textContent = dossier.totalGames || 0;
        if (statTop10) statTop10.textContent = dossier.top10Finishes || 0;
        if (statPartyWins) statPartyWins.textContent = dossier.partyWins || 0;

        // Render Medals
        const medalsContainer = document.getElementById('dossier-medals-container');
        if (medalsContainer && dossier.medalCatalog) {
            medalsContainer.innerHTML = dossier.medalCatalog.map(medal => {
                const isUnlocked = dossier.unlockedMedals && dossier.unlockedMedals.includes(medal.id);
                return `
                    <div class="medal-badge ${isUnlocked ? 'unlocked' : 'locked'}">
                        <span class="medal-icon">${medal.icon}</span>
                        <span class="medal-name">${medal.name}</span>
                        <span class="medal-status">${isUnlocked ? 'UNLOCKED' : 'LOCKED'}</span>
                        <div class="medal-tooltip">
                            <strong style="color:var(--neon-cyan);">${medal.name} [${medal.rarity}]</strong><br>
                            ${medal.desc}<br>
                            <span style="color:${isUnlocked ? 'var(--neon-green)' : 'var(--neon-coral)'}; font-weight:700;">
                                ${isUnlocked ? '✓ EARNED' : '🔒 REQUIREMENTS UNMET'}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    renderPerformanceMatrix(dossier) {
        const perfGrid = document.getElementById('dossier-performance-grid');
        if (!perfGrid || !dossier.performanceMatrix) return;

        perfGrid.innerHTML = dossier.performanceMatrix.map(sec => {
            const hasPlayed = sec.bestScore !== null && sec.bestScore !== undefined;
            const scoreDisplay = hasPlayed
                ? (sec.id === 'flash-reflex' ? `${sec.bestScore} MS` : sec.id === 'neon-dash' ? `${sec.bestScore} m` : `${sec.bestScore} PTS`)
                : '--';

            const rankDisplay = sec.rank ? `RANK #${sec.rank}` : 'UNRANKED';
            const rankClass = sec.rank ? '' : 'unranked';

            let compareHtml = '';
            if (this.isComparingRecords && dossier.comparison && dossier.comparison[sec.id]) {
                const cmp = dossier.comparison[sec.id];
                if (cmp.status === 'YOU_LEAD') {
                    const diffText = cmp.diff !== null ? `(+${cmp.diff})` : '';
                    compareHtml = `<span class="perf-compare-chip lead">▲ YOU LEAD ${diffText}</span>`;
                } else if (cmp.status === 'THEY_LEAD') {
                    const diffText = cmp.diff !== null ? `(${cmp.diff})` : '';
                    compareHtml = `<span class="perf-compare-chip trail">▼ THEY LEAD ${diffText}</span>`;
                } else if (cmp.status === 'TIED') {
                    compareHtml = `<span class="perf-compare-chip tie">= TIED</span>`;
                }
            }

            return `
                <div class="perf-matrix-card">
                    <div class="perf-card-header">
                        <span class="perf-card-icon">${sec.icon}</span>
                        <span class="perf-card-title">${sec.name}</span>
                    </div>
                    <div class="perf-best-val">${scoreDisplay}</div>
                    <div class="perf-rank-tag ${rankClass}">${rankDisplay}</div>
                    ${compareHtml}
                </div>
            `;
        }).join('');
    }

    toggleProfileModal() {
        if (this.profileModal && this.profileModal.classList.contains('active')) {
            this.profileModal.classList.remove('active');
        } else {
            this.openPilotProfileModal();
        }
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
