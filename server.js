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

// Safe Migrations for Profile fields (Avatar, Bio, Email, Sector, Medals)
try { db.exec(`ALTER TABLE users ADD COLUMN avatar_id INTEGER DEFAULT 1;`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT '';`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN email TEXT DEFAULT '';`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN primary_sector TEXT DEFAULT 'AIM MATRIX';`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN total_games INTEGER DEFAULT 0;`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN party_wins INTEGER DEFAULT 0;`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN unlocked_medals TEXT DEFAULT '[]';`); } catch(e) {}

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
        const usersList = db.prepare(`
            SELECT username, sector, role,
                   COALESCE(avatar_id, 1) as avatar_id,
                   COALESCE(avatar, '') as avatar,
                   COALESCE(bio, '') as bio,
                   COALESCE(email, '') as email,
                   COALESCE(primary_sector, sector, 'AIM MATRIX') as primary_sector,
                   COALESCE(total_games, 0) as total_games,
                   COALESCE(party_wins, 0) as party_wins,
                   COALESCE(unlocked_medals, '[]') as unlocked_medals,
                   created_at
            FROM users
        `).all();
        const usersObj = {};
        usersList.forEach(u => {
            usersObj[u.username] = {
                username: u.username,
                sector: u.primary_sector,
                primary_sector: u.primary_sector,
                role: u.role,
                avatar_id: u.avatar_id,
                avatar: u.avatar,
                bio: u.bio,
                email: u.email,
                total_games: u.total_games,
                party_wins: u.party_wins,
                unlocked_medals: u.unlocked_medals,
                createdAt: u.created_at
            };
        });
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersObj, null, 2));

        const games = ['aim-matrix', 'neon-dash', 'flash-reflex', 'cyber-slicer', 'pulse-deflector'];
        const lbObj = {};
        for (const g of games) {
            const isReflex = g === 'flash-reflex';
            const order = isReflex ? 'ASC' : 'DESC';
            const func = isReflex ? 'MIN' : 'MAX';
            const rows = db.prepare(`
                SELECT s.username, ${func}(s.score) as score, MAX(s.date) as date, s.verified,
                       COALESCE(u.avatar, '') as avatar,
                       COALESCE(u.avatar_id, 1) as avatar_id
                FROM scores s
                LEFT JOIN users u ON (s.user_id = u.id OR UPPER(s.username) = UPPER(u.username))
                WHERE s.game_id = ?
                GROUP BY s.username
                ORDER BY score ${order}
                LIMIT 50
            `).all(g);

            lbObj[g] = rows.map(r => ({
                username: r.username,
                score: r.score,
                avatar: r.avatar || '',
                avatar_id: r.avatar_id || 1,
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
        SELECT s.token, s.last_active, u.id, u.username, u.sector, u.role,
               COALESCE(u.avatar_id, 1) as avatar_id,
               COALESCE(u.avatar, '') as avatar,
               COALESCE(u.bio, '') as bio,
               COALESCE(u.email, '') as email,
               COALESCE(u.primary_sector, u.sector, 'AIM MATRIX') as primary_sector,
               COALESCE(u.total_games, 0) as total_games,
               COALESCE(u.party_wins, 0) as party_wins,
               COALESCE(u.unlocked_medals, '[]') as unlocked_medals,
               u.created_at
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
        sector: session.primary_sector || session.sector || 'AIM MATRIX',
        primary_sector: session.primary_sector || session.sector || 'AIM MATRIX',
        role: session.role || 'PILOT',
        avatar_id: session.avatar_id || 1,
        avatar: session.avatar || '',
        bio: session.bio || '',
        email: session.email || '',
        total_games: session.total_games || 0,
        party_wins: session.party_wins || 0,
        unlocked_medals: session.unlocked_medals || '[]',
        createdAt: session.created_at,
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
// PILOT DOSSIER & MEDAL TELEMETRY SYSTEM
// ==============================================================
const ARCADE_SECTORS = [
    { id: 'aim-matrix', name: 'Aim Matrix', unit: 'PTS', isReflex: false, icon: '🎯' },
    { id: 'neon-dash', name: 'Neon Dash', unit: 'm', isReflex: false, icon: '🚀' },
    { id: 'flash-reflex', name: 'Flash Reflex', unit: 'MS', isReflex: true, icon: '⚡' },
    { id: 'cyber-slicer', name: 'Cyber Slicer', unit: 'PTS', isReflex: false, icon: '⚔️' },
    { id: 'pulse-deflector', name: 'Pulse Deflector', unit: 'PTS', isReflex: false, icon: '🛡️' }
];

const MEDAL_CATALOG = [
    {
        id: 'sub_150ms_reflex',
        name: 'Sub-150ms Reflex',
        icon: '⚡',
        rarity: 'MYTHIC',
        desc: 'Log a verified latency under 150ms in Sector 03 (Flash Reflex).'
    },
    {
        id: 'neon_1000m',
        name: '1000m Neon Runner',
        icon: '🚀',
        rarity: 'LEGENDARY',
        desc: 'Sprint over 1,000 meters in Sector 02 (Neon Dash).'
    },
    {
        id: 'aim_master_1000',
        name: 'Aim Matrix Grandmaster',
        icon: '🎯',
        rarity: 'EPIC',
        desc: 'Achieve 1,000+ points in Sector 01 (Aim Matrix).'
    },
    {
        id: 'slicer_frenzy_500',
        name: 'Kinetic Slicer',
        icon: '⚔️',
        rarity: 'RARE',
        desc: 'Slice combo target score of 500+ points in Sector 04 (Cyber Slicer).'
    },
    {
        id: 'pulse_titan_500',
        name: 'Pulse Bastion',
        icon: '🛡️',
        rarity: 'RARE',
        desc: 'Withstand orbital onslaught to reach 500+ points in Sector 05 (Pulse Deflector).'
    },
    {
        id: 'sector_veteran',
        name: '5-Sector Veteran',
        icon: '🌟',
        rarity: 'EPIC',
        desc: 'Submit verified combat records across all 5 tactical arcade sectors.'
    },
    {
        id: 'top_10_legend',
        name: 'Matrix Top-10',
        icon: '👑',
        rarity: 'MYTHIC',
        desc: 'Claim and hold a Top-10 global leaderboard ranking.'
    }
];

function checkAndUnlockMedals(user) {
    if (!user || !user.id) return { medals: [], newlyUnlocked: [] };

    let currentMedals = [];
    try {
        currentMedals = JSON.parse(user.unlocked_medals || '[]');
    } catch(e) {
        currentMedals = [];
    }

    const newlyUnlocked = [];
    const unlock = (id) => {
        if (!currentMedals.includes(id)) {
            currentMedals.push(id);
            newlyUnlocked.push(id);
        }
    };

    const bestScores = db.prepare(`
        SELECT game_id, MIN(score) as minScore, MAX(score) as maxScore
        FROM scores
        WHERE user_id = ? OR UPPER(username) = UPPER(?)
        GROUP BY game_id
    `).all(user.id, user.username);

    const scoreMap = {};
    bestScores.forEach(b => {
        scoreMap[b.game_id] = { min: b.minScore, max: b.maxScore };
    });

    if (scoreMap['flash-reflex'] && scoreMap['flash-reflex'].min > 0 && scoreMap['flash-reflex'].min <= 150) {
        unlock('sub_150ms_reflex');
    }
    if (scoreMap['neon-dash'] && scoreMap['neon-dash'].max >= 1000) {
        unlock('neon_1000m');
    }
    if (scoreMap['aim-matrix'] && scoreMap['aim-matrix'].max >= 1000) {
        unlock('aim_master_1000');
    }
    if (scoreMap['cyber-slicer'] && scoreMap['cyber-slicer'].max >= 500) {
        unlock('slicer_frenzy_500');
    }
    if (scoreMap['pulse-deflector'] && scoreMap['pulse-deflector'].max >= 500) {
        unlock('pulse_titan_500');
    }
    if (bestScores.length >= 5) {
        unlock('sector_veteran');
    }

    if (newlyUnlocked.length > 0) {
        db.prepare('UPDATE users SET unlocked_medals = ? WHERE id = ?').run(JSON.stringify(currentMedals), user.id);
        exportJSONSnapshots();
    }

    return { medals: currentMedals, newlyUnlocked };
}

function getPilotDossier(targetCallsign, activeUser = null) {
    const clean = (targetCallsign || '').trim().toUpperCase();
    if (!clean) return null;

    const pilot = db.prepare(`
        SELECT id, username, role,
               COALESCE(avatar_id, 1) as avatar_id,
               COALESCE(avatar, '') as avatar,
               COALESCE(bio, '') as bio,
               COALESCE(email, '') as email,
               COALESCE(primary_sector, sector, 'AIM MATRIX') as primary_sector,
               COALESCE(total_games, 0) as total_games,
               COALESCE(party_wins, 0) as party_wins,
               COALESCE(unlocked_medals, '[]') as unlocked_medals,
               created_at
        FROM users
        WHERE UPPER(username) = ?
    `).get(clean);

    if (!pilot) return null;

    // Run medal check
    const { medals } = checkAndUnlockMedals(pilot);

    // Compute Performance Matrix across 5 sectors
    let top10Count = 0;
    let anyRank1 = false;
    let anyTop3 = false;
    let anyTop10 = false;

    const performanceMatrix = ARCADE_SECTORS.map(sec => {
        const order = sec.isReflex ? 'ASC' : 'DESC';
        const func = sec.isReflex ? 'MIN' : 'MAX';

        const ranked = db.prepare(`
            SELECT username, ${func}(score) as best
            FROM scores
            WHERE game_id = ?
            GROUP BY username
            ORDER BY best ${order}
        `).all(sec.id);

        let rank = null;
        let best = null;
        ranked.forEach((r, idx) => {
            if (r.username.toUpperCase() === clean) {
                rank = idx + 1;
                best = r.best;
            }
        });

        if (rank !== null && rank <= 10) {
            top10Count++;
            anyTop10 = true;
            if (rank === 1) anyRank1 = true;
            if (rank <= 3) anyTop3 = true;
        }

        return {
            id: sec.id,
            name: sec.name,
            unit: sec.unit,
            icon: sec.icon,
            bestScore: best,
            rank,
            totalPilots: ranked.length
        };
    });

    if (anyTop10 && !medals.includes('top_10_legend')) {
        medals.push('top_10_legend');
        db.prepare('UPDATE users SET unlocked_medals = ? WHERE id = ?').run(JSON.stringify(medals), pilot.id);
    }

    // Determine Clearance Title
    let clearanceTitle = 'Cadet';
    if (pilot.username === 'BHAGATH_KRISHNA') {
        clearanceTitle = 'Arcade Architect';
    } else if (anyRank1 || pilot.total_games >= 30) {
        clearanceTitle = 'Cyber Legend';
    } else if (anyTop3 || pilot.total_games >= 15) {
        clearanceTitle = 'Synaptic Ace';
    } else if (anyTop10 || pilot.total_games >= 5) {
        clearanceTitle = 'Grid Runner';
    }

    const isOwn = activeUser && activeUser.username.toUpperCase() === clean;

    // Active user's best scores for comparison (if viewing another pilot's dossier)
    let comparison = null;
    if (activeUser && !isOwn) {
        comparison = {};
        ARCADE_SECTORS.forEach(sec => {
            const func = sec.isReflex ? 'MIN' : 'MAX';
            const myBestRow = db.prepare(`
                SELECT ${func}(score) as best
                FROM scores
                WHERE game_id = ? AND (user_id = ? OR UPPER(username) = UPPER(?))
            `).get(sec.id, activeUser.id, activeUser.username);

            const targetSec = performanceMatrix.find(p => p.id === sec.id);
            const myScore = myBestRow ? myBestRow.best : null;
            const targetScore = targetSec ? targetSec.bestScore : null;

            let diff = null;
            let status = 'TIE';
            if (myScore !== null && targetScore !== null) {
                if (sec.isReflex) {
                    diff = targetScore - myScore; // In reflex, lower is better. If myScore < targetScore, diff > 0 -> I am faster
                    status = myScore < targetScore ? 'YOU_LEAD' : (myScore > targetScore ? 'THEY_LEAD' : 'TIED');
                } else {
                    diff = myScore - targetScore;
                    status = myScore > targetScore ? 'YOU_LEAD' : (myScore < targetScore ? 'THEY_LEAD' : 'TIED');
                }
            } else if (myScore !== null) {
                status = 'YOU_LEAD';
            } else if (targetScore !== null) {
                status = 'THEY_LEAD';
            }

            comparison[sec.id] = { myScore, targetScore, diff, status };
        });
    }

    const uid = `#KURA-${String(pilot.id).padStart(4, '0')}`;
    const isGoogle = Boolean(pilot.email && pilot.email.endsWith('@gmail.com'));

    return {
        id: pilot.id,
        uid,
        username: pilot.username,
        role: pilot.role,
        title: clearanceTitle,
        avatar_id: pilot.avatar_id,
        avatar: pilot.avatar,
        bio: pilot.bio,
        primary_sector: pilot.primary_sector,
        email: isOwn ? pilot.email : undefined,
        isGoogle,
        enlistedAt: pilot.created_at,
        totalGames: pilot.total_games,
        partyWins: pilot.party_wins,
        top10Finishes: top10Count,
        unlockedMedals: medals,
        medalCatalog: MEDAL_CATALOG,
        performanceMatrix,
        comparison,
        isOwn: Boolean(isOwn)
    };
}

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
        const { name, email, picture, uid } = await parseBody(req);
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
                INSERT INTO users (username, password_hash, salt, sector, role, created_at, avatar, email)
                VALUES (?, ?, ?, 'ALL SECTORS', 'PILOT', ?, ?, ?)
            `);
            const result = insert.run(cleanUser, hash, salt, now, picture || '', email || '');
            user = { 
                id: Number(result.lastInsertRowid), 
                username: cleanUser, 
                sector: 'ALL SECTORS', 
                role: 'PILOT',
                avatar: picture || '',
                avatar_id: 1,
                bio: '',
                email: email || ''
            };
            exportJSONSnapshots();
        } else {
            // Update picture or email if missing on existing pilot profile
            if (picture && (!user.avatar || user.avatar === '')) {
                try {
                    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(picture, user.id);
                    user.avatar = picture;
                } catch(e) {}
            }
            if (email && (!user.email || user.email === '')) {
                try {
                    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, user.id);
                    user.email = email;
                } catch(e) {}
            }
        }

        const token = generateToken();
        db.prepare(`
            INSERT INTO sessions (token, user_id, username, created_at, last_active)
            VALUES (?, ?, ?, ?, ?)
        `).run(token, user.id, cleanUser, Date.now(), Date.now());

        return sendJSON(res, 200, {
            success: true,
            user: { 
                id: user.id,
                username: cleanUser, 
                sector: user.primary_sector || user.sector || 'ALL SECTORS', 
                role: user.role || 'PILOT', 
                provider: 'google', 
                email: user.email || email || '', 
                picture: user.avatar || picture || '',
                avatar: user.avatar || picture || '',
                avatar_id: user.avatar_id || 1,
                bio: user.bio || '',
                uid: uid || ''
            },
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
        // Fetch pilot stats across arcade
        const stats = db.prepare(`
            SELECT COUNT(*) as gamesPlayed, COALESCE(MAX(score), 0) as maxScore
            FROM scores
            WHERE user_id = ? OR UPPER(username) = UPPER(?)
        `).get(user.id, user.username);

        return sendJSON(res, 200, {
            success: true,
            user: {
                ...user,
                gamesPlayed: stats ? stats.gamesPlayed : 0,
                maxScore: stats ? stats.maxScore : 0
            }
        });
    }

    // -------------------------------------------------------------
    // API: GET PILOT PROFILE // DOSSIER (/api/profile/:callsign or /api/profile?callsign=...)
    // -------------------------------------------------------------
    if ((pathname.startsWith('/api/profile/') || pathname === '/api/profile') && req.method === 'GET') {
        const activeUser = getSessionUser(req);
        let targetCallsign = '';
        if (pathname.startsWith('/api/profile/')) {
            targetCallsign = decodeURIComponent(pathname.slice('/api/profile/'.length)).trim();
        } else {
            targetCallsign = (url.searchParams.get('callsign') || url.searchParams.get('username') || (activeUser ? activeUser.username : '')).trim();
        }

        if (!targetCallsign) {
            return sendJSON(res, 400, { success: false, error: 'Target callsign is required.' });
        }

        const dossier = getPilotDossier(targetCallsign, activeUser);
        if (!dossier) {
            return sendJSON(res, 404, { success: false, error: `Pilot dossier [${targetCallsign}] not found in archive.` });
        }

        return sendJSON(res, 200, { success: true, profile: dossier });
    }

    // -------------------------------------------------------------
    // API: UPDATE PROFILE (/api/profile/update or /api/profile)
    // -------------------------------------------------------------
    if ((pathname === '/api/profile/update' || pathname === '/api/profile') && (req.method === 'POST' || req.method === 'PUT')) {
        const user = getSessionUser(req);
        if (!user) {
            return sendJSON(res, 401, { success: false, error: 'Unauthorized: Pilot login required.' });
        }

        const body = await parseBody(req);
        let { avatar_id, avatar, bio, primary_sector, sector, email } = body;

        let cleanAvatarId = user.avatar_id || 1;
        if (avatar_id !== undefined) {
            cleanAvatarId = parseInt(avatar_id, 10);
            if (isNaN(cleanAvatarId) || cleanAvatarId < 1 || cleanAvatarId > 6) cleanAvatarId = 1;
        }

        let cleanAvatar = user.avatar || '';
        if (avatar !== undefined) {
            if (typeof avatar === 'string' && avatar.length > 300000) {
                return sendJSON(res, 400, { success: false, error: 'Avatar image is too large. Max 250KB.' });
            }
            cleanAvatar = avatar;
        }

        let cleanBio = user.bio || '';
        if (bio !== undefined) {
            cleanBio = String(bio).trim().slice(0, 300);
        }

        let cleanSector = user.primary_sector || user.sector || 'AIM MATRIX';
        const targetSec = primary_sector || sector;
        if (targetSec !== undefined) {
            cleanSector = String(targetSec).trim().slice(0, 40);
        }

        let cleanEmail = user.email || '';
        if (email !== undefined) {
            cleanEmail = String(email).trim().slice(0, 100);
        }

        db.prepare(`
            UPDATE users
            SET avatar_id = ?, avatar = ?, bio = ?, primary_sector = ?, sector = ?, email = ?
            WHERE id = ?
        `).run(cleanAvatarId, cleanAvatar, cleanBio, cleanSector, cleanSector, cleanEmail, user.id);

        exportJSONSnapshots();

        const updatedDossier = getPilotDossier(user.username, user);

        return sendJSON(res, 200, {
            success: true,
            message: 'Pilot profile updated successfully.',
            user: {
                id: user.id,
                username: user.username,
                avatar_id: cleanAvatarId,
                avatar: cleanAvatar,
                bio: cleanBio,
                primary_sector: cleanSector,
                sector: cleanSector,
                email: cleanEmail,
                role: user.role
            },
            profile: updatedDossier
        });
    }

    // -------------------------------------------------------------
    // API: SUBMIT SCORE (AUTOMATIC DATABASE SAVE & MEDAL EVALUATION)
    // -------------------------------------------------------------
    if (pathname === '/api/score' && req.method === 'POST') {
        let user = getSessionUser(req);
        const { gameId, score, username: fallbackName } = await parseBody(req);

        // Allow fallback user name if valid user exists in DB
        if (!user && fallbackName) {
            const clean = fallbackName.trim().toUpperCase();
            const u = db.prepare('SELECT id, username, sector, role, avatar_id, avatar, unlocked_medals FROM users WHERE username = ?').get(clean);
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

        // Increment total games
        db.prepare(`
            UPDATE users
            SET total_games = COALESCE(total_games, 0) + 1
            WHERE id = ?
        `).run(user.id);

        // Check and unlock medals
        const { medals, newlyUnlocked } = checkAndUnlockMedals(user);

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
            newlyUnlockedMedals: newlyUnlocked,
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
            SELECT s.username, ${func}(s.score) as score, MAX(s.date) as date, s.verified,
                   COALESCE(u.avatar, '') as avatar, COALESCE(u.bio, '') as bio, COALESCE(u.role, 'PILOT') as role
            FROM scores s
            LEFT JOIN users u ON (s.user_id = u.id OR UPPER(s.username) = UPPER(u.username))
            WHERE s.game_id = ?
            GROUP BY s.username
            ORDER BY score ${order}
        `).all(gameId);

        let userRank = null;
        let userBestScore = null;
        let userAvatar = '';
        let userBio = '';
        const totalPilots = allRanked.length;

        allRanked.forEach((p, idx) => {
            p.rank = idx + 1;
            if (targetUser && p.username.toUpperCase() === targetUser) {
                userRank = idx + 1;
                userBestScore = p.score;
                userAvatar = p.avatar || '';
                userBio = p.bio || '';
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
            avatar: r.avatar || '',
            bio: r.bio || '',
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
            userAvatar,
            userBio,
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
