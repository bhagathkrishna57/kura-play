// KURA Cyber-Arcade Server (Node.js Built-in Zero-Dependency Server)
// Powered by Built-in SQLite Database Engine & Cryptographic Auth
// Architected by Bhagath Krishna.M

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? path.join('/tmp', 'kura_data') : path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'kura_arcade.db');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// If on Vercel and db doesn't exist in /tmp, seed from committed database
if (isVercel && !fs.existsSync(DB_PATH)) {
    const seedDb = path.join(__dirname, 'data', 'kura_arcade.db');
    if (fs.existsSync(seedDb)) {
        try { fs.copyFileSync(seedDb, DB_PATH); } catch (e) {}
    }
}

// Initialize SQLite Database
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        sector TEXT DEFAULT 'SECTOR 01',
        role TEXT DEFAULT 'PILOT',
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL COLLATE NOCASE,
        game_id TEXT NOT NULL,
        score REAL NOT NULL,
        date TEXT NOT NULL,
        verified INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores(game_id, score);
    CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id, game_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
`);

// ==============================================================
// CRYPTOGRAPHIC UTILITIES
// ==============================================================
function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// In-Memory Multiplayer Party Rooms
const partyRooms = {};

// ==============================================================
// INITIAL SEEDING & JSON SYNC
// ==============================================================
const defaultLeaderboard = {
    'aim-matrix': [
        { username: 'BHAGATH_KRISHNA', score: 980, date: '2026-10-31', verified: 1, title: 'ARCADE ARCHITECT' },
        { username: 'CYBER_VIPER', score: 720, date: '2026-10-31', verified: 1 },
        { username: 'NEO_PHANTOM', score: 540, date: '2026-10-30', verified: 1 },
        { username: 'REFLEX_ZERO', score: 410, date: '2026-10-30', verified: 1 }
    ],
    'neon-dash': [
        { username: 'BHAGATH_KRISHNA', score: 1420, date: '2026-10-31', verified: 1, title: 'ARCADE ARCHITECT' },
        { username: 'VOID_RUNNER', score: 950, date: '2026-10-31', verified: 1 },
        { username: 'SPEED_GHOST', score: 680, date: '2026-10-30', verified: 1 }
    ],
    'flash-reflex': [
        { username: 'BHAGATH_KRISHNA', score: 142, date: '2026-10-31', verified: 1, title: 'ARCADE ARCHITECT' },
        { username: 'SYNAPSE_99', score: 178, date: '2026-10-31', verified: 1 },
        { username: 'QUANTUM_EYE', score: 215, date: '2026-10-30', verified: 1 }
    ],
    'cyber-slicer': [
        { username: 'BHAGATH_KRISHNA', score: 1850, date: '2026-10-31', verified: 1, title: 'ARCADE ARCHITECT' },
        { username: 'BLADE_MASTER', score: 1240, date: '2026-10-31', verified: 1 },
        { username: 'LASER_CLAW', score: 890, date: '2026-10-30', verified: 1 }
    ],
    'pulse-deflector': [
        { username: 'BHAGATH_KRISHNA', score: 1680, date: '2026-10-31', verified: 1, title: 'ARCADE ARCHITECT' },
        { username: 'SHIELD_WARDEN', score: 1120, date: '2026-10-31', verified: 1 },
        { username: 'PHOTON_PULSE', score: 840, date: '2026-10-30', verified: 1 },
        { username: 'ORBIT_ZERO', score: 620, date: '2026-10-30', verified: 1 }
    ]
};

function seedDatabaseIfEmpty() {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
        // Seed founding architect
        const salt = generateSalt();
        const hash = hashPassword('admin123', salt);
        const insertUser = db.prepare(`
            INSERT INTO users (username, password_hash, salt, sector, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        insertUser.run('BHAGATH_KRISHNA', hash, salt, 'ALL', 'ARCHITECT', '2026-10-31');

        // Migrate existing users from users.json if present
        if (fs.existsSync(USERS_FILE)) {
            try {
                const legacyUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
                for (const [uname, udata] of Object.entries(legacyUsers)) {
                    if (uname !== 'BHAGATH_KRISHNA') {
                        const s = generateSalt();
                        const h = hashPassword(udata.password || 'pilot123', s);
                        try {
                            insertUser.run(uname, h, s, udata.sector || 'SECTOR 01', udata.role || 'PILOT', udata.createdAt || '2026-11-01');
                        } catch (e) {}
                    }
                }
            } catch (e) {}
        }
    }

    const scoreCount = db.prepare('SELECT COUNT(*) as count FROM scores').get().count;
    if (scoreCount === 0) {
        let seedScores = defaultLeaderboard;
        if (fs.existsSync(LEADERBOARD_FILE)) {
            try {
                seedScores = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
            } catch (e) {}
        }

        const insertScore = db.prepare(`
            INSERT INTO scores (user_id, username, game_id, score, date, verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const [gameId, records] of Object.entries(seedScores)) {
            for (const r of records) {
                const userRow = db.prepare('SELECT id FROM users WHERE username = ?').get(r.username);
                const userId = userRow ? userRow.id : null;
                insertScore.run(userId, r.username, gameId, r.score, r.date || '2026-10-31', r.verified ? 1 : 1, Date.now());
            }
        }
    }
}

seedDatabaseIfEmpty();

// Periodic snapshot export to JSON for git tracking and backup
function exportJSONSnapshots() {
    try {
        const usersList = db.prepare('SELECT username, sector, role, created_at FROM users').all();
        const usersObj = {};
        usersList.forEach(u => {
            usersObj[u.username] = { username: u.username, sector: u.sector, role: u.role, createdAt: u.created_at };
        });
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersObj, null, 2));

        const games = ['aim-matrix', 'neon-dash', 'flash-reflex', 'cyber-slicer', 'pulse-deflector'];
        const lbObj = {};
        for (const g of games) {
            const isReflex = g === 'flash-reflex';
            const order = isReflex ? 'ASC' : 'DESC';
            const func = isReflex ? 'MIN' : 'MAX';
            const rows = db.prepare(`
                SELECT username, ${func}(score) as score, MAX(date) as date, verified
                FROM scores
                WHERE game_id = ?
                GROUP BY username
                ORDER BY score ${order}
                LIMIT 50
            `).all(g);

            lbObj[g] = rows.map(r => ({
                username: r.username,
                score: r.score,
                date: r.date,
                verified: Boolean(r.verified),
                title: r.username === 'BHAGATH_KRISHNA' ? 'ARCADE ARCHITECT' : undefined
            }));
        }
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(lbObj, null, 2));
    } catch (e) {
        console.error('Error exporting snapshot:', e);
    }
}

// ==============================================================
// AUTHENTICATION HELPERS
// ==============================================================
function getSessionUser(req) {
    const authHeader = req.headers['authorization'] || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
    } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
    } else if (req.headers['cookie']) {
        const match = req.headers['cookie'].match(/kura_token=([a-f0-9]+)/);
        if (match) token = match[1];
    }

    if (!token) return null;

    const session = db.prepare(`
        SELECT s.token, s.last_active, u.id, u.username, u.sector, u.role
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    `).get(token);

    if (!session) return null;

    // Extend session active time
    db.prepare('UPDATE sessions SET last_active = ? WHERE token = ?').run(Date.now(), token);

    return {
        id: session.id,
        username: session.username,
        sector: session.sector,
        role: session.role,
        token: session.token
    };
}

// Request parser
function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) req.destroy();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
    });
}

function sendJSON(res, status, data, headers = {}) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Token, X-Requested-With, Accept, Origin, Cache-Control',
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Allow-Credentials': 'true',
        ...headers
    });
    res.end(JSON.stringify(data));
}

// MIME types for static assets
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// ==============================================================
// HTTP SERVER & ROUTING
// ==============================================================
const server = http.createServer(async (req, res) => {
    // Robust CORS Preflight & Private Network Access (PNA)
    if (req.method === 'OPTIONS') {
        const reqOrigin = req.headers.origin || '*';
        res.writeHead(204, {
            'Access-Control-Allow-Origin': reqOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Token, X-Requested-With, Accept, Origin, Cache-Control',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Private-Network': 'true',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // -------------------------------------------------------------
    // API: HEALTH CHECK
    // -------------------------------------------------------------
    if (pathname === '/api/health') {
        const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
        const scoreCount = db.prepare('SELECT COUNT(*) as c FROM scores').get().c;
        return sendJSON(res, 200, {
            status: 'ONLINE',
            version: '2.5',
            database: 'SQLite 3 (WAL)',
            totalPilots: userCount,
            totalScores: scoreCount,
            architect: 'Bhagath Krishna.M'
        });
    }

    // -------------------------------------------------------------
    // API: REGISTER PILOT (MANDATORY ACCOUNT CREATION)
    // -------------------------------------------------------------
    if (pathname === '/api/register' && req.method === 'POST') {
        const { username, password, sector } = await parseBody(req);
        if (!username || !password) {
            return sendJSON(res, 400, { error: 'Callsign and Security Password are required.' });
        }

        const cleanUser = username.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (cleanUser.length < 3 || cleanUser.length > 16) {
            return sendJSON(res, 400, { error: 'Callsign must be 3 to 16 alphanumeric characters.' });
        }

        if (password.length < 3) {
            return sendJSON(res, 400, { error: 'Password must be at least 3 characters.' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUser);
        if (existing) {
            return sendJSON(res, 400, { error: `Callsign [${cleanUser}] is already enlisted. Please log in or choose another.` });
        }

        const salt = generateSalt();
        const hash = hashPassword(password, salt);
        const userSector = sector || 'PRECISION';
        const now = new Date().toISOString().split('T')[0];

        const insert = db.prepare(`
            INSERT INTO users (username, password_hash, salt, sector, role, created_at)
            VALUES (?, ?, ?, ?, 'PILOT', ?)
        `);
        const result = insert.run(cleanUser, hash, salt, userSector, now);
        const userId = Number(result.lastInsertRowid);

        const token = generateToken();
        db.prepare(`
            INSERT INTO sessions (token, user_id, username, created_at, last_active)
            VALUES (?, ?, ?, ?, ?)
        `).run(token, userId, cleanUser, Date.now(), Date.now());

        exportJSONSnapshots();

        return sendJSON(res, 200, {
            success: true,
            user: { username: cleanUser, sector: userSector, role: 'PILOT' },
            token
        }, { 'Set-Cookie': `kura_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` });
    }

    // -------------------------------------------------------------
    // API: LOGIN PILOT
    // -------------------------------------------------------------
    if (pathname === '/api/login' && req.method === 'POST') {
        const { username, password } = await parseBody(req);
        if (!username || !password) {
            return sendJSON(res, 400, { error: 'Callsign and password are required.' });
        }

        const cleanUser = username.trim().toUpperCase();
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser);

        if (!user) {
            return sendJSON(res, 401, { error: `Callsign [${cleanUser}] not found. Please register first.` });
        }

        const testHash = hashPassword(password, user.salt);
        if (testHash !== user.password_hash) {
            return sendJSON(res, 401, { error: 'Incorrect Security PIN / Password.' });
        }

        const token = generateToken();
        db.prepare(`
            INSERT INTO sessions (token, user_id, username, created_at, last_active)
            VALUES (?, ?, ?, ?, ?)
        `).run(token, user.id, cleanUser, Date.now(), Date.now());

        return sendJSON(res, 200, {
            success: true,
            user: { username: cleanUser, sector: user.sector, role: user.role },
            token
        }, { 'Set-Cookie': `kura_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` });
    }

    // -------------------------------------------------------------
    // API: GOOGLE AUTHENTICATION (OAUTH / ONE-CLICK PILOT LOGIN)
    // -------------------------------------------------------------
    if (pathname === '/api/auth/google' && req.method === 'POST') {
        const { name, email, picture } = await parseBody(req);
        if (!name && !email) {
            return sendJSON(res, 400, { error: 'Missing name or email from Google auth payload.' });
        }

        const rawName = (name || email.split('@')[0]).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        const cleanUser = (rawName.length >= 3 ? rawName.slice(0, 16) : `PILOT_${Math.floor(1000 + Math.random() * 9000)}`);

        let user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser);
        if (!user) {
            const salt = generateSalt();
            const hash = hashPassword(`google_${Date.now()}_${Math.random()}`, salt);
            const now = new Date().toISOString().split('T')[0];
            const insert = db.prepare(`
                INSERT INTO users (username, password_hash, salt, sector, role, created_at)
                VALUES (?, ?, ?, 'ALL SECTORS', 'PILOT', ?)
            `);
            const result = insert.run(cleanUser, hash, salt, now);
            user = { id: Number(result.lastInsertRowid), username: cleanUser, sector: 'ALL SECTORS', role: 'PILOT' };
            exportJSONSnapshots();
        }

        const token = generateToken();
        db.prepare(`
            INSERT INTO sessions (token, user_id, username, created_at, last_active)
            VALUES (?, ?, ?, ?, ?)
        `).run(token, user.id, cleanUser, Date.now(), Date.now());

        return sendJSON(res, 200, {
            success: true,
            user: { username: cleanUser, sector: user.sector, role: user.role, provider: 'google', email, picture },
            token
        }, { 'Set-Cookie': `kura_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` });
    }

    // -------------------------------------------------------------
    // API: LOGOUT PILOT
    // -------------------------------------------------------------
    if (pathname === '/api/logout' && req.method === 'POST') {
        const user = getSessionUser(req);
        if (user && user.token) {
            db.prepare('DELETE FROM sessions WHERE token = ?').run(user.token);
        }
        return sendJSON(res, 200, { success: true }, {
            'Set-Cookie': 'kura_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        });
    }

    // -------------------------------------------------------------
    // API: CURRENT SESSION USER (/api/me)
    // -------------------------------------------------------------
    if (pathname === '/api/me' && req.method === 'GET') {
        const user = getSessionUser(req);
        if (!user) {
            return sendJSON(res, 401, { success: false, error: 'Not authenticated' });
        }
        return sendJSON(res, 200, { success: true, user });
    }

    // -------------------------------------------------------------
    // API: SUBMIT SCORE (AUTOMATIC DATABASE SAVE)
    // -------------------------------------------------------------
    if (pathname === '/api/score' && req.method === 'POST') {
        let user = getSessionUser(req);
        const { gameId, score, username: fallbackName } = await parseBody(req);

        // Allow fallback user name if valid user exists in DB
        if (!user && fallbackName) {
            const clean = fallbackName.trim().toUpperCase();
            const u = db.prepare('SELECT id, username, sector, role FROM users WHERE username = ?').get(clean);
            if (u) user = u;
        }

        if (!user) {
            return sendJSON(res, 401, { error: 'Access Denied: You must be logged in to record scores.' });
        }

        if (!gameId || score === undefined) {
            return sendJSON(res, 400, { error: 'Missing gameId or score value.' });
        }

        const scoreVal = parseFloat(score);
        const dateStr = new Date().toISOString().split('T')[0];

        // Insert into SQLite scores table
        db.prepare(`
            INSERT INTO scores (user_id, username, game_id, score, date, verified, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(user.id, user.username, gameId, scoreVal, dateStr, Date.now());

        exportJSONSnapshots();

        // Calculate user's rank & best in this sector
        const isReflex = gameId === 'flash-reflex';
        const order = isReflex ? 'ASC' : 'DESC';
        const func = isReflex ? 'MIN' : 'MAX';

        const rankedPilots = db.prepare(`
            SELECT username, ${func}(score) as bestScore
            FROM scores
            WHERE game_id = ?
            GROUP BY username
            ORDER BY bestScore ${order}
        `).all(gameId);

        let userRank = 0;
        let userBestScore = scoreVal;
        const totalPilots = rankedPilots.length;

        rankedPilots.forEach((p, idx) => {
            if (p.username.toUpperCase() === user.username.toUpperCase()) {
                userRank = idx + 1;
                userBestScore = p.bestScore;
            }
        });

        return sendJSON(res, 200, {
            success: true,
            userRank,
            userBestScore,
            totalPilots,
            message: `Score recorded for pilot [${user.username}] in Sector ${gameId}.`
        });
    }

    // -------------------------------------------------------------
    // API: GET LEADERBOARD WITH LOGGED-IN USER POSITION
    // -------------------------------------------------------------
    if (pathname === '/api/leaderboard' && req.method === 'GET') {
        const gameId = url.searchParams.get('game') || 'aim-matrix';
        const query = (url.searchParams.get('q') || '').trim().toUpperCase();
        const targetUser = (url.searchParams.get('username') || '').trim().toUpperCase();

        const isReflex = gameId === 'flash-reflex';
        const order = isReflex ? 'ASC' : 'DESC';
        const func = isReflex ? 'MIN' : 'MAX';

        // 1. Get ALL unique ranked pilots to compute exact overall rank
        const allRanked = db.prepare(`
            SELECT username, ${func}(score) as score, MAX(date) as date, verified
            FROM scores
            WHERE game_id = ?
            GROUP BY username
            ORDER BY score ${order}
        `).all(gameId);

        let userRank = null;
        let userBestScore = null;
        const totalPilots = allRanked.length;

        allRanked.forEach((p, idx) => {
            p.rank = idx + 1;
            if (targetUser && p.username.toUpperCase() === targetUser) {
                userRank = idx + 1;
                userBestScore = p.score;
            }
        });

        // 2. Apply search filter if requested
        let filtered = allRanked;
        if (query) {
            filtered = allRanked.filter(p => p.username.toUpperCase().includes(query));
        }

        const scores = filtered.slice(0, 50).map(r => ({
            rank: r.rank,
            username: r.username,
            score: r.score,
            date: r.date,
            verified: Boolean(r.verified),
            title: r.username === 'BHAGATH_KRISHNA' ? 'ARCADE ARCHITECT' : undefined
        }));

        return sendJSON(res, 200, {
            gameId,
            scores,
            userRank,
            userBestScore,
            totalPilots
        });
    }

    // -------------------------------------------------------------
    // API: MULTIPLAYER PARTY ROOMS
    // -------------------------------------------------------------
    if (pathname === '/api/party/create' && req.method === 'POST') {
        const user = getSessionUser(req);
        const { playerName } = await parseBody(req);
        const hostName = (user ? user.username : playerName || 'PILOT').trim().toUpperCase().slice(0, 16);
        const codeNum = Math.floor(100 + Math.random() * 900);
        const roomId = `KURA-${codeNum}`;

        partyRooms[roomId] = {
            roomId,
            host: hostName,
            createdAt: Date.now(),
            players: [{ name: hostName, isHost: true, score: 0, lastSeen: Date.now() }],
            selectedGame: 'aim-matrix',
            status: 'LOBBY'
        };

        return sendJSON(res, 200, { success: true, roomId, isHost: true, room: partyRooms[roomId] });
    }

    if (pathname === '/api/party/join' && req.method === 'POST') {
        const user = getSessionUser(req);
        const { roomId, playerName } = await parseBody(req);
        const cleanRoom = (roomId || '').trim().toUpperCase();
        const cleanPlayer = (user ? user.username : playerName || 'PILOT').trim().toUpperCase().slice(0, 16);

        if (!cleanRoom || !partyRooms[cleanRoom]) {
            return sendJSON(res, 404, { error: 'Room not found. Check the room code.' });
        }

        const room = partyRooms[cleanRoom];
        const existingIdx = room.players.findIndex(p => p.name === cleanPlayer);
        if (existingIdx !== -1) {
            room.players[existingIdx].lastSeen = Date.now();
        } else {
            room.players.push({ name: cleanPlayer, isHost: false, score: 0, lastSeen: Date.now() });
        }

        return sendJSON(res, 200, { success: true, roomId: cleanRoom, isHost: room.host === cleanPlayer, room });
    }

    if (pathname === '/api/party/room' && req.method === 'GET') {
        const roomId = (url.searchParams.get('roomId') || '').trim().toUpperCase();
        const playerName = (url.searchParams.get('player') || '').trim().toUpperCase();

        if (!roomId || !partyRooms[roomId]) {
            return sendJSON(res, 404, { error: 'Room not found.' });
        }

        const room = partyRooms[roomId];
        if (playerName) {
            const p = room.players.find(x => x.name === playerName);
            if (p) p.lastSeen = Date.now();
        }

        const now = Date.now();
        room.players = room.players.filter(p => now - p.lastSeen < 45000);

        return sendJSON(res, 200, { success: true, room });
    }

    // -------------------------------------------------------------
    // STATIC FILE SERVING
    // -------------------------------------------------------------
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            if (pathname.startsWith('/api/')) {
                return sendJSON(res, 404, { error: `API route not found: ${pathname}` });
            }
            res.writeHead(404, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Private-Network': 'true'
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

if (require.main === module || (!process.env.VERCEL && process.env.NODE_ENV !== 'test')) {
    server.listen(PORT, () => {
        console.log('===================================================');
        console.log(`⚡ KURA ARCADE SERVER LIVE AT: http://localhost:${PORT}`);
        console.log(`   Database: SQLite 3 (${DB_PATH})`);
        console.log(`   Real Cryptographic Auth & Leaderboard Engine Active`);
        console.log(`   Architect: Bhagath Krishna.M`);
        console.log('===================================================');
    });
}

module.exports = server;
