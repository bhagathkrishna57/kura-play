// Leaderboard & Stats Management Engine
// Handles persistent local bests and real-time multiplayer room score tallies.

class LeaderboardManager {
    constructor() {
        this.storageKey = 'kura_arcade_stats';
        this.localStats = this.loadStats();
        this.partyScores = {};
    }

    loadStats() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {
                'aim-matrix': { highScore: 0, gamesPlayed: 0 },
                'neon-dash': { highScore: 0, bestTime: 0, gamesPlayed: 0 },
                'flash-reflex': { bestMs: 9999, wins: 0, gamesPlayed: 0 },
                'cyber-slicer': { highScore: 0, gamesPlayed: 0 }
            };
        } catch (e) {
            return {
                'aim-matrix': { highScore: 0, gamesPlayed: 0 },
                'neon-dash': { highScore: 0, bestTime: 0, gamesPlayed: 0 },
                'flash-reflex': { bestMs: 9999, wins: 0, gamesPlayed: 0 },
                'cyber-slicer': { highScore: 0, gamesPlayed: 0 }
            };
        }
    }

    saveStats() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.localStats));
        } catch (e) {}
    }

    recordGameResult(gameId, score, extra = {}) {
        if (!this.localStats[gameId]) {
            this.localStats[gameId] = { highScore: 0, gamesPlayed: 0 };
        }
        const stats = this.localStats[gameId];
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;

        let isNewRecord = false;

        if (gameId === 'flash-reflex') {
            if (score > 0 && (stats.bestMs === 9999 || score < stats.bestMs)) {
                stats.bestMs = Math.round(score);
                isNewRecord = true;
            }
        } else {
            if (score > (stats.highScore || 0)) {
                stats.highScore = Math.round(score);
                isNewRecord = true;
            }
        }

        if (extra.won) {
            stats.wins = (stats.wins || 0) + 1;
        }

        this.saveStats();
        return { isNewRecord, stats };
    }

    getGameStat(gameId) {
        return this.localStats[gameId] || { highScore: 0, gamesPlayed: 0 };
    }

    resetParty() {
        this.partyScores = {};
    }

    addPartyPlayer(playerName) {
        if (!this.partyScores[playerName]) {
            this.partyScores[playerName] = 0;
        }
    }

    recordPartyWin(playerName) {
        if (!this.partyScores[playerName]) {
            this.partyScores[playerName] = 0;
        }
        this.partyScores[playerName] += 1;
        return this.getPartyRankings();
    }

    getPartyRankings() {
        return Object.entries(this.partyScores)
            .map(([name, score]) => ({ name, score }))
            .sort((a, b) => b.score - a.score);
    }
}

window.KuraLeaderboard = new LeaderboardManager();
