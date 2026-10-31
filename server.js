// KURA Cyber-Arcade Server (Node.js Built-in Zero-Dependency Server)
// Provides HTTP Static Hosting, User Authentication, and Global Leaderboards
// Architected by Bhagath Krishna.M

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON(filePath, defaultVal) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
            return defaultVal;
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return defaultVal;
    }
}

function saveJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

// Initial Data with Bhagath Krishna.M as founding architect and default top records
const defaultLeaderboard = {
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

const users = loadJSON(USERS_FILE, {
    'BHAGATH_KRISHNA': {
        username: 'BHAGATH_KRISHNA',
        hash: hashPassword('admin123'),
        sector: 'ALL',
        role: 'ARCHITECT',
        createdAt: '2026-10-31'
    }
});

const leaderboard = loadJSON(LEADERBOARD_FILE, defaultLeaderboard);

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
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

function sendJSON(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

// MIME types for static assets
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // ==============================================================
    // API ROUTES
    // ==============================================================

    // Health check
    if (pathname === '/api/health') {
        return sendJSON(res, 200, { status: 'ONLINE', version: '2.4', architect: 'Bhagath Krishna.M' });
    }

    // Register Pilot
    if (pathname === '/api/register' && req.method === 'POST') {
        const { username, password, sector } = await parseBody(req);
        if (!username || !password) {
            return sendJSON(res, 400, { error: 'Username and password are required.' });
        }

        const cleanUser = username.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (cleanUser.length < 3 || cleanUser.length > 16) {
            return sendJSON(res, 400, { error: 'Callsign must be 3 to 16 alphanumeric characters.' });
        }

        if (users[cleanUser]) {
            return sendJSON(res, 400, { error: 'Callsign already taken. Please choose another.' });
        }

        const newUser = {
            username: cleanUser,
            hash: hashPassword(password),
            sector: sector || 'PRECISION',
            createdAt: new Date().toISOString().split('T')[0]
        };

        users[cleanUser] = newUser;
        saveJSON(USERS_FILE, users);

        const token = crypto.randomBytes(24).toString('hex');
        return sendJSON(res, 200, {
            success: true,
            user: { username: cleanUser, sector: newUser.sector },
            token
        });
    }

    // Login Pilot
    if (pathname === '/api/login' && req.method === 'POST') {
        const { username, password } = await parseBody(req);
        if (!username || !password) {
            return sendJSON(res, 400, { error: 'Username and password required.' });
        }

        const cleanUser = username.trim().toUpperCase();
        const user = users[cleanUser];

        if (!user || user.hash !== hashPassword(password)) {
            return sendJSON(res, 401, { error: 'Invalid callsign or access PIN.' });
        }

        const token = crypto.randomBytes(24).toString('hex');
        return sendJSON(res, 200, {
            success: true,
            user: { username: cleanUser, sector: user.sector, role: user.role },
            token
        });
    }

    // Get Leaderboard
    if (pathname === '/api/leaderboard' && req.method === 'GET') {
        const gameId = url.searchParams.get('game');
        if (gameId && leaderboard[gameId]) {
            return sendJSON(res, 200, { gameId, scores: leaderboard[gameId] });
        }
        return sendJSON(res, 200, { leaderboard });
    }

    // Submit High Score (Requires username)
    if (pathname === '/api/score' && req.method === 'POST') {
        const { username, gameId, score } = await parseBody(req);

        if (!username || !gameId || score === undefined) {
            return sendJSON(res, 400, { error: 'Missing username, gameId, or score.' });
        }

        const cleanUser = username.trim().toUpperCase();
        if (!users[cleanUser]) {
            return sendJSON(res, 403, { error: 'User must be registered and logged in to post to leaderboard.' });
        }

        if (!leaderboard[gameId]) {
            leaderboard[gameId] = [];
        }

        const scoreVal = parseFloat(score);
        const list = leaderboard[gameId];

        // Check if user already has a score entry
        const existingIdx = list.findIndex(item => item.username === cleanUser);
        let updated = false;

        if (gameId === 'flash-reflex') {
            // Lower milliseconds is better
            if (existingIdx !== -1) {
                if (scoreVal < list[existingIdx].score) {
                    list[existingIdx].score = Math.round(scoreVal);
                    list[existingIdx].date = new Date().toISOString().split('T')[0];
                    updated = true;
                }
            } else {
                list.push({
                    username: cleanUser,
                    score: Math.round(scoreVal),
                    date: new Date().toISOString().split('T')[0],
                    verified: true
                });
                updated = true;
            }
            list.sort((a, b) => a.score - b.score);
        } else {
            // Higher score is better
            if (existingIdx !== -1) {
                if (scoreVal > list[existingIdx].score) {
                    list[existingIdx].score = Math.round(scoreVal);
                    list[existingIdx].date = new Date().toISOString().split('T')[0];
                    updated = true;
                }
            } else {
                list.push({
                    username: cleanUser,
                    score: Math.round(scoreVal),
                    date: new Date().toISOString().split('T')[0],
                    verified: true
                });
                updated = true;
            }
            list.sort((a, b) => b.score - a.score);
        }

        // Keep top 50 records per game
        if (list.length > 50) list.length = 50;

        saveJSON(LEADERBOARD_FILE, leaderboard);

        return sendJSON(res, 200, {
            success: true,
            updated,
            rankings: list.slice(0, 10)
        });
    }

    // ==============================================================
    // STATIC FILE SERVING
    // ==============================================================
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log('===================================================');
    console.log(`⚡ KURA ARCADE SERVER LIVE AT: http://localhost:${PORT}`);
    console.log(`   Architect: Bhagath Krishna.M`);
    console.log(`   Global Leaderboard & Auth Engine Active`);
    console.log('===================================================');
});
