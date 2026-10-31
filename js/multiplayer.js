// WebRTC Peer-to-Peer Multiplayer Engine
// Facilitates instant room lobbies, friend invitations, and low-latency state synchronization.

class MultiplayerEngine {
    constructor() {
        this.peer = null;
        this.connections = [];
        this.isHost = false;
        this.roomId = null;
        this.localPlayerName = localStorage.getItem('kura_player_name') || this.generateDefaultName();
        this.onMessageCallbacks = [];
        this.onPlayerListChange = null;
        this.peersList = [];

        this.broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('kura_arcade_room') : null;
        if (this.broadcastChannel) {
            this.broadcastChannel.onmessage = (e) => this.handleIncomingMessage(e.data, 'broadcast');
        }
    }

    generateDefaultName() {
        const adjectives = ['Neon', 'Cyber', 'Hyper', 'Swift', 'Apex', 'Phantom', 'Volt'];
        const nouns = ['Blade', 'Ghost', 'Striker', 'Racer', 'Viper', 'Pulse', 'Falcon'];
        const name = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                     nouns[Math.floor(Math.random() * nouns.length)] + 
                     Math.floor(Math.random() * 90 + 10);
        localStorage.setItem('kura_player_name', name);
        return name;
    }

    setPlayerName(newName) {
        if (!newName || !newName.trim()) return;
        this.localPlayerName = newName.trim();
        localStorage.setItem('kura_player_name', this.localPlayerName);
        this.broadcast({
            type: 'NAME_UPDATE',
            name: this.localPlayerName
        });
    }

    createRoom(callback) {
        this.isHost = true;
        const codeNum = Math.floor(100 + Math.random() * 900);
        this.roomId = `KURA-${codeNum}`;
        this.peersList = [{ id: 'host', name: this.localPlayerName, isHost: true }];

        if (window.Peer) {
            try {
                this.peer = new window.Peer(this.roomId, { debug: 0 });

                this.peer.on('open', (id) => {
                    this.roomId = id;
                    if (callback) callback({ success: true, roomId: this.roomId, isHost: true });
                });

                this.peer.on('connection', (conn) => {
                    this.handleNewConnection(conn);
                });

                this.peer.on('error', (err) => {
                    if (callback) callback({ success: true, roomId: this.roomId, isHost: true, fallback: true });
                });
            } catch (e) {
                if (callback) callback({ success: true, roomId: this.roomId, isHost: true, fallback: true });
            }
        } else {
            if (callback) callback({ success: true, roomId: this.roomId, isHost: true, fallback: true });
        }
    }

    joinRoom(targetRoomId, callback) {
        this.isHost = false;
        this.roomId = targetRoomId.toUpperCase().trim();

        if (window.Peer) {
            try {
                this.peer = new window.Peer({ debug: 0 });

                this.peer.on('open', () => {
                    const conn = this.peer.connect(this.roomId, { reliable: true });
                    
                    conn.on('open', () => {
                        this.connections.push(conn);
                        conn.on('data', (data) => this.handleIncomingMessage(data, conn));
                        
                        conn.send({
                            type: 'JOIN_REQUEST',
                            name: this.localPlayerName
                        });

                        if (callback) callback({ success: true, roomId: this.roomId, isHost: false });
                    });

                    conn.on('error', (err) => {
                        if (callback) callback({ success: false, error: err.message });
                    });
                });

                this.peer.on('error', (err) => {
                    if (callback) callback({ success: false, error: 'Could not connect to host room. Please check the code.' });
                });
            } catch (e) {
                if (callback) callback({ success: false, error: e.message });
            }
        } else {
            if (callback) callback({ success: false, error: 'Network library unavailable in offline mode.' });
        }
    }

    handleNewConnection(conn) {
        this.connections.push(conn);

        conn.on('data', (data) => this.handleIncomingMessage(data, conn));
        conn.on('close', () => {
            this.connections = this.connections.filter(c => c !== conn);
            this.peersList = this.peersList.filter(p => p.conn !== conn);
            this.notifyPlayerListUpdate();
        });
    }

    handleIncomingMessage(data, sender) {
        if (!data || !data.type) return;

        if (data.type === 'JOIN_REQUEST') {
            const peerEntry = { id: sender.peer || 'peer_' + Date.now(), name: data.name || 'Rival', conn: sender };
            this.peersList.push(peerEntry);

            sender.send({
                type: 'ROOM_STATE',
                players: this.peersList.map(p => ({ id: p.id, name: p.name, isHost: p.isHost || false }))
            });

            this.notifyPlayerListUpdate();
        } else if (data.type === 'ROOM_STATE') {
            this.peersList = data.players || [];
            this.notifyPlayerListUpdate();
        } else if (data.type === 'NAME_UPDATE') {
            const player = this.peersList.find(p => p.conn === sender);
            if (player) {
                player.name = data.name;
                this.notifyPlayerListUpdate();
            }
        }

        this.onMessageCallbacks.forEach(cb => cb(data));
    }

    notifyPlayerListUpdate() {
        if (this.onPlayerListChange) {
            this.onPlayerListChange(this.peersList);
        }
        if (this.isHost) {
            this.broadcast({
                type: 'ROOM_STATE',
                players: this.peersList.map(p => ({ id: p.id, name: p.name, isHost: p.isHost || false }))
            });
        }
    }

    broadcast(data) {
        this.connections.forEach(conn => {
            if (conn && conn.open) {
                conn.send(data);
            }
        });
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage(data);
        }
    }

    onMessage(callback) {
        this.onMessageCallbacks.push(callback);
    }
}

window.KuraMultiplayer = new MultiplayerEngine();
