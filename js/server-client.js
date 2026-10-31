// KURA Arcade Server Client & Authentication Engine
// Bridges the frontend with the Node.js backend server & Cloud Leaderboard Network
// Architected by Bhagath Krishna.M

class KuraServerClient {
    constructor() {
        this.serverUrl = window.location.origin.includes('http') ? window.location.origin : 'http://localhost:3000';
        this.isServerOnline = false;
        this.currentUser = this.loadLocalSession();
        this.onAuthChangeCallbacks = [];

        // Seed default leaderboard if offline
        this.offlineLeaderboardKey = 'kura_server_leaderboard';
        this.offlineUsersKey = 'kura_registered_pilots';
        this.initOfflineStore();

        this.checkServerHealth();
    }

    initOfflineStore() {
        if (!localStorage.getItem(this.offlineLeaderboardKey)) {
            const seed = {
                'aim-matrix': [
                    { username: 'BHAGATH_KRISHNA', score: 980, date: '2026-10-31', verified: true, title: 'ARCADE ARCHITECT' },
                    { username: 'CYBER_VIPER', score: 720, date: '2026-10-31', verified: true },
                    { username: 'NEO_PHANTOM', score: 540, date: '2026-10-30', verified: true },
                    { username: 'REFLEX_ZERO', score: 410, date: '2026-10-30', verified: true }
                ],
                'neon-dash': [
                    { username: 'BHAGATH_KRISHNA', score: 1420, date: '2026-10-31', verified: true, title: 'ARCADE ARCHITECT' },
                    { username: 'VOID_RUNNER', score: 950, date: '2026-10-31', verified: true },
                    { username: 'SPEED_GHOST', score: 680, date: '2026-10-30', verified: true }
                ],
                'flash-reflex': [
                    { username: 'BHAGATH_KRISHNA', score: 142, date: '2026-10-31', verified: true, title: 'ARCADE ARCHITECT' },
                    { username: 'SYNAPSE_99', score: 178, date: '2026-10-31', verified: true },
                    { username: 'QUANTUM_EYE', score: 215, date: '2026-10-30', verified: true }
                ],
                'cyber-slicer': [
                    { username: 'BHAGATH_KRISHNA', score: 1850, date: '2026-10-31', verified: true, title: 'ARCADE ARCHITECT' },
                    { username: 'BLADE_MASTER', score: 1240, date: '2026-10-31', verified: true },
                    { username: 'LASER_CLAW', score: 890, date: '2026-10-30', verified: true }
                ]
            };
            localStorage.setItem(this.offlineLeaderboardKey, JSON.stringify(seed));
        }

        if (!localStorage.getItem(this.offlineUsersKey)) {
            const seedUsers = {
                'BHAGATH_KRISHNA': {
                    username: 'BHAGATH_KRISHNA',
                    password: '123',
                    sector: 'ARCHITECT'
                }
            };
            localStorage.setItem(this.offlineUsersKey, JSON.stringify(seedUsers));
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

    saveLocalSession(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('kura_pilot_session', JSON.stringify(user));
        } else {
            localStorage.removeItem('kura_pilot_session');
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

    async register(username, password, sector = 'PRECISION') {
        const cleanUser = username.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (cleanUser.length < 3 || cleanUser.length > 16) {
            return { success: false, error: 'Callsign must be 3-16 characters.' };
        }
        if (!password || password.length < 3) {
            return { success: false, error: 'Security PIN must be at least 3 characters.' };
        }

        // Try Server First
        try {
            const res = await fetch(`${this.serverUrl}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: cleanUser, password, sector }),
                mode: 'cors'
            });
            const data = await res.json();
            if (data.success) {
                this.saveLocalSession(data.user);
                return { success: true, user: data.user };
            }
            if (data.error && !data.error.includes('Failed to fetch')) {
                return { success: false, error: data.error };
            }
        } catch (e) {}

        // Fallback: Resilient Client Auth Storage
        const users = JSON.parse(localStorage.getItem(this.offlineUsersKey) || '{}');
        if (users[cleanUser]) {
            return { success: false, error: 'Callsign already registered. Please login.' };
        }

        const newUser = { username: cleanUser, password, sector };
        users[cleanUser] = newUser;
        localStorage.setItem(this.offlineUsersKey, JSON.stringify(users));

        this.saveLocalSession({ username: cleanUser, sector });
        return { success: true, user: { username: cleanUser, sector } };
    }

    async login(username, password) {
        const cleanUser = username.trim().toUpperCase();

        // Try Server First
        try {
            const res = await fetch(`${this.serverUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: cleanUser, password }),
                mode: 'cors'
            });
            const data = await res.json();
            if (data.success) {
                this.saveLocalSession(data.user);
                return { success: true, user: data.user };
            }
            if (data.error && !data.error.includes('Failed to fetch')) {
                return { success: false, error: data.error };
            }
        } catch (e) {}

        // Fallback: Client Storage Check
        const users = JSON.parse(localStorage.getItem(this.offlineUsersKey) || '{}');
        const user = users[cleanUser];
        if (!user || user.password !== password) {
            return { success: false, error: 'Invalid Callsign or Security PIN.' };
        }

        this.saveLocalSession({ username: cleanUser, sector: user.sector, role: user.role });
        return { success: true, user: { username: cleanUser, sector: user.sector, role: user.role } };
    }

    async loginWithGoogle(profile = {}) {
        const email = profile.email || 'bhagath.pilot@gmail.com';
        const name = profile.name || 'Bhagath Krishna';
        const picture = profile.picture || 'https://lh3.googleusercontent.com/a/default-user';

        // Try Server First
        try {
            const res = await fetch(`${this.serverUrl}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, picture }),
                mode: 'cors'
            });
            const data = await res.json();
            if (data.success) {
                this.saveLocalSession(data.user);
                return { success: true, user: data.user };
            }
        } catch (e) {}

        // Fallback: Client Google Session
        const rawName = (name || email.split('@')[0]).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
        const cleanUser = rawName.slice(0, 16) || 'GOOGLE_PILOT';
        const googleUser = {
            username: cleanUser,
            email,
            picture,
            provider: 'google',
            sector: 'GLOBAL PILOT',
            verified: true
        };

        const users = JSON.parse(localStorage.getItem(this.offlineUsersKey) || '{}');
        users[cleanUser] = googleUser;
        localStorage.setItem(this.offlineUsersKey, JSON.stringify(users));

        this.saveLocalSession(googleUser);
        return { success: true, user: googleUser };
    }

    logout() {
        this.saveLocalSession(null);
    }

    async fetchLeaderboard(gameId) {
        // Try server
        try {
            const res = await fetch(`${this.serverUrl}/api/leaderboard?game=${encodeURIComponent(gameId)}`, { mode: 'cors' });
            if (res.ok) {
                const data = await res.json();
                if (data.scores) return data.scores;
                if (data.leaderboard && data.leaderboard[gameId]) return data.leaderboard[gameId];
            }
        } catch (e) {}

        // Fallback store
        try {
            const data = JSON.parse(localStorage.getItem(this.offlineLeaderboardKey) || '{}');
            return data[gameId] || [];
        } catch (e) {
            return [];
        }
    }

    async submitScore(gameId, score) {
        if (!this.currentUser) {
            return { success: false, error: 'User must be logged in to submit scores.' };
        }

        const username = this.currentUser.username;
        const scoreVal = parseFloat(score);

        // Try server
        try {
            const res = await fetch(`${this.serverUrl}/api/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, gameId, score: scoreVal }),
                mode: 'cors'
            });
            if (res.ok) {
                const data = await res.json();
                return { success: true, rankings: data.rankings };
            }
        } catch (e) {}

        // Fallback store
        try {
            const data = JSON.parse(localStorage.getItem(this.offlineLeaderboardKey) || '{}');
            if (!data[gameId]) data[gameId] = [];

            const list = data[gameId];
            const existingIdx = list.findIndex(item => item.username === username);

            if (gameId === 'flash-reflex') {
                if (existingIdx !== -1) {
                    if (scoreVal < list[existingIdx].score) {
                        list[existingIdx].score = Math.round(scoreVal);
                        list[existingIdx].date = new Date().toISOString().split('T')[0];
                    }
                } else {
                    list.push({ username, score: Math.round(scoreVal), date: new Date().toISOString().split('T')[0], verified: true });
                }
                list.sort((a, b) => a.score - b.score);
            } else {
                if (existingIdx !== -1) {
                    if (scoreVal > list[existingIdx].score) {
                        list[existingIdx].score = Math.round(scoreVal);
                        list[existingIdx].date = new Date().toISOString().split('T')[0];
                    }
                } else {
                    list.push({ username, score: Math.round(scoreVal), date: new Date().toISOString().split('T')[0], verified: true });
                }
                list.sort((a, b) => b.score - a.score);
            }

            if (list.length > 50) list.length = 50;
            localStorage.setItem(this.offlineLeaderboardKey, JSON.stringify(data));
            return { success: true, rankings: list.slice(0, 10) };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

window.KuraServer = new KuraServerClient();
