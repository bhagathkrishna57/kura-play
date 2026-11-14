// KURA Arcade Server Client & Authentication Engine
// Bridges the frontend with the SQLite Backend Server & Permanent Database
// Architected by Bhagath Krishna.M

class KuraServerClient {
    constructor() {
        this.serverUrl = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:3000';
        this.isServerOnline = false;
        this.token = localStorage.getItem('kura_auth_token') || null;
        this.currentUser = this.loadLocalSession();
        this.onAuthChangeCallbacks = [];

        this.init();
    }

    async init() {
        await this.checkServerHealth();
        // If we have a saved token, verify it with the server
        if (this.token) {
            await this.verifySession();
        }
    }

    loadLocalSession() {
        try {
            const data = localStorage.getItem('kura_pilot_session');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    saveLocalSession(user, token = null) {
        this.currentUser = user;
        if (token) {
            this.token = token;
            localStorage.setItem('kura_auth_token', token);
        }
        if (user) {
            localStorage.setItem('kura_pilot_session', JSON.stringify(user));
        } else {
            this.token = null;
            localStorage.removeItem('kura_pilot_session');
            localStorage.removeItem('kura_auth_token');
        }
        this.notifyAuthChange();
    }

    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    }

    notifyAuthChange() {
        this.onAuthChangeCallbacks.forEach(cb => cb(this.currentUser));
    }

    async checkServerHealth() {
        try {
            const res = await fetch(`${this.serverUrl}/api/health`, { method: 'GET', mode: 'cors' });
            if (res.ok) {
                this.isServerOnline = true;
                return true;
            }
        } catch (e) {}
        this.isServerOnline = false;
        return false;
    }

    async verifySession() {
        if (!this.token) return null;
        try {
            const res = await fetch(`${this.serverUrl}/api/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'X-Auth-Token': this.token
                },
                mode: 'cors'
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user) {
                    this.saveLocalSession(data.user, this.token);
                    return data.user;
                }
            }
        } catch (e) {}

        // If server rejected the token, clear it
        this.saveLocalSession(null);
        return null;
    }

    // Register Pilot (Account Creation)
    async register(username, password, sector = 'SECTOR 01 // AIM MATRIX') {
        const cleanUser = username.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (cleanUser.length < 3 || cleanUser.length > 16) {
            return { success: false, error: 'Callsign must be 3 to 16 alphanumeric characters.' };
        }
        if (!password || password.length < 3) {
            return { success: false, error: 'Password must be at least 3 characters.' };
        }

        try {
            const res = await fetch(`${this.serverUrl}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: cleanUser, password, sector }),
                mode: 'cors'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                this.saveLocalSession(data.user, data.token);
                return { success: true, user: data.user, token: data.token };
            }
            return { success: false, error: data.error || 'Registration failed.' };
        } catch (e) {
            return { success: false, error: 'Cannot connect to arcade server. Please ensure server is running.' };
        }
    }

    // Login Pilot
    async login(username, password) {
        const cleanUser = username.trim().toUpperCase();
        if (!cleanUser || !password) {
            return { success: false, error: 'Please enter your callsign and password.' };
        }

        try {
            const res = await fetch(`${this.serverUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: cleanUser, password }),
                mode: 'cors'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                this.saveLocalSession(data.user, data.token);
                return { success: true, user: data.user, token: data.token };
            }
            return { success: false, error: data.error || 'Invalid callsign or password.' };
        } catch (e) {
            return { success: false, error: 'Cannot connect to arcade server. Please ensure server is running.' };
        }
    }

    // Google Pilot Authentication (OAuth / Instant Login)
    async loginWithGoogle(profile) {
        try {
            const res = await fetch(`${this.serverUrl}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile || {}),
                mode: 'cors'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                this.saveLocalSession(data.user, data.token);
                return { success: true, user: data.user, token: data.token };
            }
            return { success: false, error: data.error || 'Google authentication failed.' };
        } catch (e) {
            return { success: false, error: 'Cannot connect to arcade server.' };
        }
    }

    // Logout Pilot
    async logout() {
        if (this.token) {
            try {
                await fetch(`${this.serverUrl}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'X-Auth-Token': this.token
                    },
                    mode: 'cors'
                });
            } catch (e) {}
        }
        this.saveLocalSession(null);
        return { success: true };
    }

    // Submit High Score to Permanent Database
    async submitScore(gameId, score) {
        if (!this.currentUser) {
            return { success: false, error: 'Pilot must be logged in to record scores.' };
        }

        const scoreVal = parseFloat(score);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
                headers['X-Auth-Token'] = this.token;
            }

            const res = await fetch(`${this.serverUrl}/api/score`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    username: this.currentUser.username,
                    gameId,
                    score: scoreVal
                }),
                mode: 'cors'
            });

            if (res.ok) {
                const data = await res.json();
                return {
                    success: true,
                    userRank: data.userRank,
                    userBestScore: data.userBestScore,
                    totalPilots: data.totalPilots
                };
            }
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || 'Failed to record score.' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // Fetch Leaderboard and User Position
    async fetchLeaderboard(gameId, searchQuery = '') {
        const username = this.currentUser ? this.currentUser.username : '';
        const qParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
        const uParam = username ? `&username=${encodeURIComponent(username)}` : '';

        try {
            const res = await fetch(`${this.serverUrl}/api/leaderboard?game=${encodeURIComponent(gameId)}${qParam}${uParam}`, {
                method: 'GET',
                mode: 'cors'
            });

            if (res.ok) {
                const data = await res.json();
                return {
                    gameId: data.gameId,
                    scores: data.scores || [],
                    userRank: data.userRank,
                    userBestScore: data.userBestScore,
                    totalPilots: data.totalPilots
                };
            }
        } catch (e) {}

        return {
            gameId,
            scores: [],
            userRank: null,
            userBestScore: null,
            totalPilots: 0
        };
    }
}

window.KuraServer = new KuraServerClient();
