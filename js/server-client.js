// KURA Arcade Server Client & Authentication Engine
// Bridges the frontend with the SQLite Backend Server & Permanent Database
// Architected by Bhagath Krishna.M

class KuraServerClient {
    constructor() {
        this.serverUrl = this.determineServerUrl();
        this.isServerOnline = false;
        this.token = localStorage.getItem('kura_auth_token') || null;
        this.currentUser = this.loadLocalSession();
        this.onAuthChangeCallbacks = [];

        console.info(`[KURA SERVER CLIENT] Initialized. Target API URL: ${this.serverUrl}`);
        this.init();
    }

    // Determine target API URL supporting dev servers, Vite, CRA, Next.js, Live Server, and file://
    determineServerUrl() {
        // 1. Explicit window / global / env overrides
        if (typeof window !== 'undefined') {
            if (window.KURA_SERVER_URL) return window.KURA_SERVER_URL.replace(/\/+$/, '');
            if (window.KURA_API_URL) return window.KURA_API_URL.replace(/\/+$/, '');
            if (window.API_URL) return window.API_URL.replace(/\/+$/, '');
            if (window.VITE_API_URL) return window.VITE_API_URL.replace(/\/+$/, '');
            if (window.REACT_APP_API_URL) return window.REACT_APP_API_URL.replace(/\/+$/, '');
            if (window.NEXT_PUBLIC_API_URL) return window.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
            if (window.__ENV__?.VITE_API_URL) return window.__ENV__.VITE_API_URL.replace(/\/+$/, '');
            if (window.__ENV__?.REACT_APP_API_URL) return window.__ENV__.REACT_APP_API_URL.replace(/\/+$/, '');
            if (window.__ENV__?.NEXT_PUBLIC_API_URL) return window.__ENV__.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
            if (window.__ENV__?.API_URL) return window.__ENV__.API_URL.replace(/\/+$/, '');
        }

        // 2. Process env check (for bundled setups: CRA, Next, Node)
        try {
            if (typeof process !== 'undefined' && process.env) {
                const envUrl = process.env.VITE_API_URL || 
                               process.env.REACT_APP_API_URL || 
                               process.env.NEXT_PUBLIC_API_URL || 
                               process.env.API_URL;
                if (envUrl) return envUrl.replace(/\/+$/, '');
            }
        } catch (e) {}

        // 3. Vite / Bundler env check (safely evaluated dynamically to avoid non-module SyntaxError)
        try {
            const getMetaEnv = new Function("try { return import.meta && import.meta.env; } catch (e) { return null; }");
            const metaEnv = getMetaEnv();
            if (metaEnv) {
                const metaUrl = metaEnv.VITE_API_URL || 
                                metaEnv.NEXT_PUBLIC_API_URL || 
                                metaEnv.REACT_APP_API_URL ||
                                metaEnv.API_URL;
                if (metaUrl) return metaUrl.replace(/\/+$/, '');
            }
        } catch (e) {}

        // 4. Browser URL inspection
        if (typeof window !== 'undefined' && window.location) {
            const loc = window.location;
            const origin = loc.origin || `${loc.protocol}//${loc.host}`;
            const hostname = loc.hostname || 'localhost';
            const protocol = loc.protocol.startsWith('http') ? loc.protocol : 'http:';

            // If running on port 3000, current origin is the backend
            if (loc.port === '3000') {
                return origin;
            }

            // If running on local dev server (port 5500, 5173, 8080, 8000, etc.),
            // backend runs on port 3000 on the same hostname
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
                return `${protocol}//${hostname}:3000`;
            }

            // If running via file:/// origin is "null" or "file:"
            if (loc.protocol === 'file:' || origin === 'null') {
                return 'http://localhost:3000';
            }

            // In production where frontend & API share origin (e.g. deployed on render, railway, fly, vps)
            return origin;
        }

        return 'http://localhost:3000';
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

    // Health check with automated multi-candidate fallback probing
    async checkServerHealth() {
        const candidates = [
            this.serverUrl,
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ];
        if (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http')) {
            candidates.push(window.location.origin);
        }

        // Deduplicate
        const uniqueCandidates = [...new Set(candidates.map(u => u.replace(/\/+$/, '')))];

        for (const cand of uniqueCandidates) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1800);
                const res = await fetch(`${cand}/api/health`, {
                    method: 'GET',
                    mode: 'cors',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (data.status === 'ONLINE') {
                        this.serverUrl = cand;
                        this.isServerOnline = true;
                        console.info(`[KURA SERVER] ✓ Successfully connected to backend at: ${this.serverUrl}`);
                        return true;
                    }
                }
            } catch (err) {
                // Try next candidate
            }
        }

        this.isServerOnline = false;
        console.warn(`[KURA SERVER] ⚠ Health check could not reach backend across candidates:`, uniqueCandidates);
        return false;
    }

    // Centralized request wrapper with robust error inspection & full visibility
    async request(endpoint, options = {}) {
        const url = `${this.serverUrl}${endpoint}`;
        const method = options.method || 'GET';

        let res;
        try {
            res = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    ...(options.headers || {})
                },
                mode: 'cors'
            });
        } catch (networkErr) {
            const detail = networkErr.message || 'Network request failed';
            console.error(`[KURA API NETWORK FAILURE] ${method} ${url}:`, {
                targetUrl: url,
                serverUrl: this.serverUrl,
                error: networkErr.name,
                message: networkErr.message
            });

            return {
                ok: false,
                status: 0,
                error: `Cannot connect to arcade server at ${this.serverUrl} (${detail}). Ensure backend is running on port 3000.`
            };
        }

        // Parse response content
        const contentType = res.headers.get('content-type') || '';
        let data = null;
        let rawText = '';
        try {
            rawText = await res.text();
            if (contentType.includes('application/json') || (rawText.trim().startsWith('{') && rawText.trim().endsWith('}'))) {
                data = JSON.parse(rawText);
            }
        } catch (parseErr) {
            console.warn(`[KURA API] Response from ${url} was not JSON (HTTP ${res.status}):`, rawText.slice(0, 150));
        }

        if (!res.ok) {
            console.error(`[KURA API HTTP ERROR] ${method} ${url} returned status ${res.status} (${res.statusText}):`, data || rawText.slice(0, 300));

            let errMsg = data && (data.error || data.message);
            if (!errMsg) {
                if (res.status === 404) {
                    errMsg = `Endpoint not found (HTTP 404) at ${url}. Please verify backend server routes.`;
                } else if (res.status === 500) {
                    errMsg = `Arcade server internal error (HTTP 500). Please check server terminal logs.`;
                } else if (res.status === 502 || res.status === 503) {
                    errMsg = `Arcade server unavailable (HTTP ${res.status}). Service is temporarily unreachable.`;
                } else {
                    errMsg = `Server error (HTTP ${res.status}: ${res.statusText || 'Error'}).`;
                }
            }
            return { ok: false, status: res.status, data, error: errMsg };
        }

        return { ok: true, status: res.status, data: data || {} };
    }

    async verifySession() {
        if (!this.token) return null;
        const res = await this.request('/api/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'X-Auth-Token': this.token
            }
        });

        if (res.ok && res.data.success && res.data.user) {
            this.saveLocalSession(res.data.user, this.token);
            return res.data.user;
        }

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

        const res = await this.request('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, password, sector })
        });

        if (res.ok && res.data.success) {
            this.saveLocalSession(res.data.user, res.data.token);
            return { success: true, user: res.data.user, token: res.data.token };
        }

        return { success: false, error: res.error || 'Registration failed.' };
    }

    // Login Pilot
    async login(username, password) {
        const cleanUser = username.trim().toUpperCase();
        if (!cleanUser || !password) {
            return { success: false, error: 'Please enter your callsign and password.' };
        }

        const res = await this.request('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, password })
        });

        if (res.ok && res.data.success) {
            this.saveLocalSession(res.data.user, res.data.token);
            return { success: true, user: res.data.user, token: res.data.token };
        }

        return { success: false, error: res.error || 'Invalid callsign or password.' };
    }

    // Google Pilot Authentication (OAuth / Instant Login)
    async loginWithGoogle(profile) {
        const res = await this.request('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile || {})
        });

        if (res.ok && res.data.success) {
            this.saveLocalSession(res.data.user, res.data.token);
            return { success: true, user: res.data.user, token: res.data.token };
        }

        return { success: false, error: res.error || 'Google authentication failed.' };
    }

    // Logout Pilot
    async logout() {
        if (this.token) {
            await this.request('/api/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'X-Auth-Token': this.token
                }
            });
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
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
            headers['X-Auth-Token'] = this.token;
        }

        const res = await this.request('/api/score', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                username: this.currentUser.username,
                gameId,
                score: scoreVal
            })
        });

        if (res.ok && res.data.success) {
            return {
                success: true,
                userRank: res.data.userRank,
                userBestScore: res.data.userBestScore,
                totalPilots: res.data.totalPilots
            };
        }

        return { success: false, error: res.error || 'Failed to record score.' };
    }

    // Fetch Leaderboard and User Position
    async fetchLeaderboard(gameId, searchQuery = '') {
        const username = this.currentUser ? this.currentUser.username : '';
        const qParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
        const uParam = username ? `&username=${encodeURIComponent(username)}` : '';

        const res = await this.request(`/api/leaderboard?game=${encodeURIComponent(gameId)}${qParam}${uParam}`, {
            method: 'GET'
        });

        if (res.ok && res.data.scores) {
            return {
                gameId: res.data.gameId || gameId,
                scores: res.data.scores || [],
                userRank: res.data.userRank,
                userBestScore: res.data.userBestScore,
                totalPilots: res.data.totalPilots
            };
        }

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
