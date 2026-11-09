import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type GameType = 'plinko' | 'blackjack' | 'roulette' | 'slots' | 'videopoker' | 'dice' | 'holdem' | 'threecardpoker';
type ChipThemeId = 'classic-brass' | 'obsidian-gold' | 'emerald-royale' | 'crimson-velvet' | 'cyber-platinum';
type TableThemeId = 'emerald-felt' | 'mahogany-club' | 'midnight-velvet' | 'royal-burgundy';
type PresenceStatus = 'online' | 'in-game' | 'spectating' | 'offline';

interface StoredProfile {
  uid: string;
  displayName: string;
  chips: number;
  xp: number;
  level: number;
  chipTheme: ChipThemeId;
  tableTheme: TableThemeId;
  gamesPlayed: number;
  totalWon: number;
  biggestWin: number;
  dailyStreak: number;
  lastDailyClaim: string;
  lastAllowanceClaim: string;
  status: PresenceStatus;
  currentGame: string;
  currentRoomId: string;
  unlockedAchievements: string[];
  createdAt: string;
  updatedAt: string;
}

interface StoredTransaction {
  id: string;
  uid: string;
  type: 'wager' | 'payout' | 'daily-reward' | 'allowance' | 'achievement-bonus' | 'starting-balance';
  game: string;
  amount: number;
  balanceAfter: number;
  summary: string;
  createdAt: string;
}

interface StoredConnection {
  uid: string;
  targetUid: string;
  targetName: string;
  relationType: 'friend' | 'recent';
  lastPlayedGame: string;
  createdAt: string;
  updatedAt: string;
}

interface RoomParticipant {
  uid: string;
  displayName: string;
  level: number;
  chipTheme: ChipThemeId;
  role: 'player' | 'spectator';
  lastAction?: string;
  lastPayout?: number;
}

interface TableActivityEvent {
  id: string;
  roomId: string;
  uid: string;
  displayName: string;
  gameType: GameType;
  wager: number;
  payout: number;
  multiplier: number;
  summary: string;
  timestamp: string;
}

interface ServerRoom {
  id: string;
  hostId: string;
  hostName: string;
  name: string;
  gameType: GameType;
  isPrivate: boolean;
  password?: string;
  minBet: number;
  status: 'open' | 'playing' | 'closed';
  participants: RoomParticipant[];
  recentActivity: TableActivityEvent[];
  createdAt: string;
  isDefault?: boolean;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

interface PersistedData {
  profiles: Record<string, StoredProfile>;
  transactions: Record<string, StoredTransaction[]>;
  connections: Record<string, StoredConnection[]>;
}

const DATA_DIR = path.join(__dirname, '.data');
const DATA_FILE = path.join(DATA_DIR, 'parlor_store.json');

function loadPersistedData(): PersistedData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading persisted store:', err);
  }
  return { profiles: {}, transactions: {}, connections: {} };
}

const dbStore: PersistedData = loadPersistedData();

function savePersistedData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(dbStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving persisted store:', err);
  }
}

// Default permanent rooms so the central lobby always has tables ready for multiplayer
const rooms = new Map<string, ServerRoom>();
const roomChats = new Map<string, ChatMessage[]>();

const CLUB_PATRONS: StoredProfile[] = [
  {
    uid: 'patron_eleanor',
    displayName: 'Lady Eleanor Vance',
    chips: 4850000,
    xp: 24500,
    level: 48,
    chipTheme: 'obsidian-gold',
    tableTheme: 'midnight-velvet',
    gamesPlayed: 142,
    totalWon: 9200000,
    biggestWin: 920000,
    dailyStreak: 12,
    lastDailyClaim: '',
    lastAllowanceClaim: '',
    status: 'in-game',
    currentGame: "Texas Hold'em",
    currentRoomId: 'room_holdem_main',
    unlockedAchievements: ['first-wager', 'veteran-10', 'high-roller-win'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'patron_sterling',
    displayName: 'Duke Sterling',
    chips: 3200000,
    xp: 18400,
    level: 42,
    chipTheme: 'classic-brass',
    tableTheme: 'emerald-felt',
    gamesPlayed: 98,
    totalWon: 5400000,
    biggestWin: 650000,
    dailyStreak: 8,
    lastDailyClaim: '',
    lastAllowanceClaim: '',
    status: 'in-game',
    currentGame: 'Roulette',
    currentRoomId: 'room_roulette_main',
    unlockedAchievements: ['first-wager', 'veteran-10'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'patron_camille',
    displayName: 'Duchess Camille',
    chips: 2450000,
    xp: 14200,
    level: 35,
    chipTheme: 'emerald-royale',
    tableTheme: 'emerald-felt',
    gamesPlayed: 85,
    totalWon: 4100000,
    biggestWin: 480000,
    dailyStreak: 6,
    lastDailyClaim: '',
    lastAllowanceClaim: '',
    status: 'in-game',
    currentGame: 'Plinko',
    currentRoomId: 'room_plinko_main',
    unlockedAchievements: ['first-wager', 'plinko-high-drop'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'patron_baron',
    displayName: 'Baron Von Cash',
    chips: 1980000,
    xp: 12100,
    level: 31,
    chipTheme: 'crimson-velvet',
    tableTheme: 'royal-burgundy',
    gamesPlayed: 76,
    totalWon: 3500000,
    biggestWin: 380000,
    dailyStreak: 5,
    lastDailyClaim: '',
    lastAllowanceClaim: '',
    status: 'in-game',
    currentGame: 'Blackjack',
    currentRoomId: 'room_blackjack_vip',
    unlockedAchievements: ['first-wager', 'blackjack-natural'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'patron_vesper',
    displayName: 'Countess Vesper',
    chips: 1650000,
    xp: 9800,
    level: 28,
    chipTheme: 'cyber-platinum',
    tableTheme: 'mahogany-club',
    gamesPlayed: 64,
    totalWon: 2800000,
    biggestWin: 310000,
    dailyStreak: 4,
    lastDailyClaim: '',
    lastAllowanceClaim: '',
    status: 'in-game',
    currentGame: 'Three Card Poker',
    currentRoomId: 'room_threecard_main',
    unlockedAchievements: ['first-wager'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'patron_jax',
    displayName: 'High-Roller Jax',
    chips: 1250000,
    xp: 8500,
    level: 25,
    chipTheme: 'classic-brass',
    tableTheme: 'emerald-felt',
    gamesPlayed: 52,
    totalWon: 1950000,
    biggestWin: 240000,
    dailyStreak: 3,
    lastDailyClaim: '',
    lastAllowanceClaim: '',
    status: 'in-game',
    currentGame: 'Brass Dice',
    currentRoomId: 'room_dice_main',
    unlockedAchievements: ['first-wager'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'patron_viktor',
    displayName: 'Viktor Sterling',
    chips: 890000,
    xp: 6200,
    level: 21,
    chipTheme: 'obsidian-gold',
    tableTheme: 'midnight-velvet',
    gamesPlayed: 41,
    totalWon: 1400000,
    biggestWin: 180000,
    dailyStreak: 2,
    lastDailyClaim: '',
    lastAllowanceClaim: '',
    status: 'online',
    currentGame: 'Video Poker',
    currentRoomId: 'room_poker_main',
    unlockedAchievements: ['first-wager'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'patron_finch',
    displayName: 'Marcus Finch',
    chips: 520000,
    xp: 4100,
    level: 16,
    chipTheme: 'emerald-royale',
    tableTheme: 'emerald-felt',
    gamesPlayed: 33,
    totalWon: 850000,
    biggestWin: 95000,
    dailyStreak: 2,
    lastDailyClaim: '',
    lastAllowanceClaim: '',
    status: 'online',
    currentGame: 'Lobby Lounge',
    currentRoomId: 'lobby',
    unlockedAchievements: ['first-wager'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function initDefaultRooms() {
  const defaults: Array<{ id: string; name: string; gameType: GameType; minBet: number; patronIds: string[] }> = [
    { id: 'room_plinko_main', name: 'Grand Brass Plinko Pyramid', gameType: 'plinko', minBet: 25, patronIds: ['patron_camille'] },
    { id: 'room_blackjack_vip', name: 'Monte Carlo Blackjack Salon', gameType: 'blackjack', minBet: 50, patronIds: ['patron_baron'] },
    { id: 'room_roulette_main', name: 'Single-Zero Roulette Parlor', gameType: 'roulette', minBet: 25, patronIds: ['patron_sterling'] },
    { id: 'room_slots_main', name: 'Velvet Reels Mechanical Gallery', gameType: 'slots', minBet: 20, patronIds: ['patron_finch'] },
    { id: 'room_poker_main', name: 'Jacks or Better Draw Club', gameType: 'videopoker', minBet: 25, patronIds: ['patron_viktor'] },
    { id: 'room_dice_main', name: 'High-Roller Brass Dice Table', gameType: 'dice', minBet: 10, patronIds: ['patron_jax'] },
    { id: 'room_holdem_main', name: "High-Stakes Texas Hold'em Salon", gameType: 'holdem', minBet: 50, patronIds: ['patron_eleanor'] },
    { id: 'room_threecard_main', name: 'Royal Three Card Poker Club', gameType: 'threecardpoker', minBet: 25, patronIds: ['patron_vesper'] },
  ];

  for (const d of defaults) {
    const participants: RoomParticipant[] = [];
    for (const pId of d.patronIds) {
      const patron = CLUB_PATRONS.find((p) => p.uid === pId);
      if (patron) {
        participants.push({
          uid: patron.uid,
          displayName: patron.displayName,
          level: patron.level,
          chipTheme: patron.chipTheme,
          role: 'player',
          lastAction: 'Seated at table',
        });
      }
    }

    rooms.set(d.id, {
      id: d.id,
      hostId: 'house',
      hostName: 'The House',
      name: d.name,
      gameType: d.gameType,
      isPrivate: false,
      minBet: d.minBet,
      status: 'open',
      participants,
      recentActivity: [],
      createdAt: new Date().toISOString(),
      isDefault: true,
    });
    roomChats.set(d.id, []);
  }
  roomChats.set('lobby', [
    {
      id: 'chat_init_1',
      roomId: 'lobby',
      senderId: 'patron_eleanor',
      senderName: 'Lady Eleanor Vance',
      text: 'Good evening patrons! The Hold\'em tables are paying beautifully tonight.',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'chat_init_2',
      roomId: 'lobby',
      senderId: 'patron_sterling',
      senderName: 'Duke Sterling',
      text: 'Just hit 32 Red on the Monte Carlo wheel. Virtual chips flowing!',
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
  ]);
}

initDefaultRooms();

function createInitialProfile(uid: string, preferredName?: string): StoredProfile {
  const now = new Date().toISOString();
  const shortCode = uid.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '7777';
  const displayName = preferredName && preferredName.trim().length >= 2
    ? preferredName.trim().slice(0, 32)
    : `Patron_${shortCode}`;

  const profile: StoredProfile = {
    uid,
    displayName,
    chips: 5000,
    xp: 0,
    level: 1,
    chipTheme: 'classic-brass',
    tableTheme: 'emerald-felt',
    gamesPlayed: 0,
    totalWon: 0,
    biggestWin: 0,
    dailyStreak: 1,
    lastDailyClaim: '',
    lastAllowanceClaim: '',
    status: 'online',
    currentGame: 'Lobby',
    currentRoomId: 'lobby',
    unlockedAchievements: [],
    createdAt: now,
    updatedAt: now,
  };

  dbStore.profiles[uid] = profile;
  dbStore.transactions[uid] = [
    {
      id: `tx_init_${Date.now()}`,
      uid,
      type: 'starting-balance',
      game: 'Club Treasury',
      amount: 5000,
      balanceAfter: 5000,
      summary: 'Complimentary new member starting virtual chip grant',
      createdAt: now,
    },
  ];
  dbStore.connections[uid] = dbStore.connections[uid] || [];
  savePersistedData();
  return profile;
}

function appendTransaction(
  uid: string,
  type: StoredTransaction['type'],
  game: string,
  amount: number,
  balanceAfter: number,
  summary: string
): StoredTransaction {
  const tx: StoredTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    uid,
    type,
    game,
    amount,
    balanceAfter,
    summary,
    createdAt: new Date().toISOString(),
  };
  if (!dbStore.transactions[uid]) {
    dbStore.transactions[uid] = [];
  }
  dbStore.transactions[uid].unshift(tx);
  dbStore.transactions[uid] = dbStore.transactions[uid].slice(0, 80);
  return tx;
}

function recordRecentPlayers(room: ServerRoom, joiningUser: StoredProfile) {
  const now = new Date().toISOString();
  for (const p of room.participants) {
    if (p.uid === joiningUser.uid) continue;
    // Update joiningUser's connections
    if (!dbStore.connections[joiningUser.uid]) dbStore.connections[joiningUser.uid] = [];
    const existingA = dbStore.connections[joiningUser.uid].find((c) => c.targetUid === p.uid);
    if (existingA) {
      existingA.lastPlayedGame = room.gameType;
      existingA.targetName = p.displayName;
      existingA.updatedAt = now;
    } else {
      dbStore.connections[joiningUser.uid].unshift({
        uid: joiningUser.uid,
        targetUid: p.uid,
        targetName: p.displayName,
        relationType: 'recent',
        lastPlayedGame: room.gameType,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update other participant's connections
    if (!dbStore.connections[p.uid]) dbStore.connections[p.uid] = [];
    const existingB = dbStore.connections[p.uid].find((c) => c.targetUid === joiningUser.uid);
    if (existingB) {
      existingB.lastPlayedGame = room.gameType;
      existingB.targetName = joiningUser.displayName;
      existingB.updatedAt = now;
    } else {
      dbStore.connections[p.uid].unshift({
        uid: p.uid,
        targetUid: joiningUser.uid,
        targetName: joiningUser.displayName,
        relationType: 'recent',
        lastPlayedGame: room.gameType,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // Map active sockets to uid
  const socketToUid = new Map<WebSocket, string>();
  const uidToSockets = new Map<string, Set<WebSocket>>();

  function serializeRooms() {
    return Array.from(rooms.values()).map((r) => ({
      id: r.id,
      hostId: r.hostId,
      hostName: r.hostName,
      name: r.name,
      gameType: r.gameType,
      isPrivate: r.isPrivate,
      minBet: r.minBet,
      status: r.status,
      participants: r.participants,
      recentActivity: r.recentActivity,
      createdAt: r.createdAt,
    }));
  }

  function getActiveProfiles(): StoredProfile[] {
    const onlineUids = new Set(uidToSockets.keys());
    const result: StoredProfile[] = [];
    for (const uid of onlineUids) {
      const p = dbStore.profiles[uid];
      if (p) result.push(p);
    }
    // Always include club patrons to guarantee a thriving parlor roster!
    for (const patron of CLUB_PATRONS) {
      if (!onlineUids.has(patron.uid)) {
        result.push(patron);
      }
    }
    return result;
  }

  function broadcastAll(type: string, payload: unknown) {
    const msg = JSON.stringify({ type, payload });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  function sendToUid(uid: string, type: string, payload: unknown) {
    const sockets = uidToSockets.get(uid);
    if (!sockets) return;
    const msg = JSON.stringify({ type, payload });
    for (const s of sockets) {
      if (s.readyState === WebSocket.OPEN) {
        s.send(msg);
      }
    }
  }

  function broadcastToRoom(roomId: string, type: string, payload: unknown) {
    const msg = JSON.stringify({ type, payload });
    for (const [socket, uid] of socketToUid.entries()) {
      const p = dbStore.profiles[uid];
      if (p && p.currentRoomId === roomId && socket.readyState === WebSocket.OPEN) {
        socket.send(msg);
      }
    }
  }

  function broadcastPresenceAndRooms() {
    broadcastAll('presence:update', {
      onlinePlayers: getActiveProfiles(),
      rooms: serializeRooms(),
    });
  }

  function removeUserFromRooms(uid: string) {
    for (const [roomId, room] of rooms.entries()) {
      const idx = room.participants.findIndex((p) => p.uid === uid);
      if (idx !== -1) {
        room.participants.splice(idx, 1);
        if (!room.isDefault && room.participants.length === 0) {
          rooms.delete(roomId);
          roomChats.delete(roomId);
        }
      }
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw));
        const { type, payload } = data;

        if (type === 'auth:identify') {
          const rawUid = String(payload?.uid || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
          if (!rawUid) return;

          socketToUid.set(ws, rawUid);
          if (!uidToSockets.has(rawUid)) {
            uidToSockets.set(rawUid, new Set());
          }
          uidToSockets.get(rawUid)!.add(ws);

          let profile = dbStore.profiles[rawUid];
          if (!profile) {
            profile = createInitialProfile(rawUid, payload?.displayName);
          } else {
            if (
              typeof payload?.displayName === 'string' &&
              payload.displayName.trim().length >= 2 &&
              !payload.displayName.startsWith('Patron_')
            ) {
              profile.displayName = payload.displayName.trim().slice(0, 32);
            }
            profile.status = profile.currentRoomId && profile.currentRoomId !== 'lobby' ? 'in-game' : 'online';
            profile.updatedAt = new Date().toISOString();
            savePersistedData();
          }

          ws.send(
            JSON.stringify({
              type: 'auth:ready',
              payload: {
                profile,
                transactions: dbStore.transactions[rawUid] || [],
                connections: dbStore.connections[rawUid] || [],
                onlinePlayers: getActiveProfiles(),
                rooms: serializeRooms(),
                chatHistory: roomChats.get(profile.currentRoomId || 'lobby') || [],
              },
            })
          );

          broadcastPresenceAndRooms();
          return;
        }

        const uid = socketToUid.get(ws);
        if (!uid) return;
        const profile = dbStore.profiles[uid];
        if (!profile) return;

        if (type === 'profile:customize') {
          if (typeof payload?.displayName === 'string' && payload.displayName.trim().length >= 2) {
            profile.displayName = payload.displayName.trim().slice(0, 32);
          }
          if (payload?.chipTheme) {
            profile.chipTheme = payload.chipTheme;
          }
          if (payload?.tableTheme) {
            profile.tableTheme = payload.tableTheme;
          }
          profile.updatedAt = new Date().toISOString();

          // Update participant record in current room
          for (const room of rooms.values()) {
            const part = room.participants.find((p) => p.uid === uid);
            if (part) {
              part.displayName = profile.displayName;
              part.chipTheme = profile.chipTheme;
              part.level = profile.level;
            }
          }

          savePersistedData();
          sendToUid(uid, 'profile:synced', {
            profile,
            transactions: dbStore.transactions[uid] || [],
            connections: dbStore.connections[uid] || [],
          });
          broadcastPresenceAndRooms();
          return;
        }

        if (type === 'economy:claim_daily') {
          const todayKey = new Date().toISOString().slice(0, 10);
          if (profile.lastDailyClaim === todayKey) return;

          const rewardChips = 1000 + Math.min(profile.dailyStreak, 7) * 250;
          const rewardXp = 150;
          profile.chips += rewardChips;
          profile.xp += rewardXp;
          profile.level = Math.max(1, Math.floor(profile.xp / 500) + 1);
          profile.dailyStreak += 1;
          profile.lastDailyClaim = todayKey;
          profile.updatedAt = new Date().toISOString();

          const tx = appendTransaction(
            uid,
            'daily-reward',
            'Daily Login Vault',
            rewardChips,
            profile.chips,
            `Day ${profile.dailyStreak} login reward (+${rewardChips.toLocaleString()} chips)`
          );

          savePersistedData();
          sendToUid(uid, 'profile:synced', {
            profile,
            transactions: dbStore.transactions[uid] || [],
            connections: dbStore.connections[uid] || [],
            lastTransaction: tx,
          });
          broadcastPresenceAndRooms();
          return;
        }

        if (type === 'economy:claim_allowance') {
          const grant = 1500;
          profile.chips += grant;
          profile.xp += 50;
          profile.level = Math.max(1, Math.floor(profile.xp / 500) + 1);
          profile.lastAllowanceClaim = new Date().toISOString();
          profile.updatedAt = new Date().toISOString();

          const tx = appendTransaction(
            uid,
            'allowance',
            'House Stipend',
            grant,
            profile.chips,
            'Complimentary virtual chip parlor allowance (+1,500 chips)'
          );

          savePersistedData();
          sendToUid(uid, 'profile:synced', {
            profile,
            transactions: dbStore.transactions[uid] || [],
            connections: dbStore.connections[uid] || [],
            lastTransaction: tx,
          });
          broadcastPresenceAndRooms();
          return;
        }

        if (type === 'economy:emergency_bailout') {
          const grant = 5000;
          profile.chips += grant;
          profile.updatedAt = new Date().toISOString();
          const tx = appendTransaction(
            uid,
            'allowance',
            'House Relief',
            grant,
            profile.chips,
            'House Broke Relief Bailout (+5,000 chips)'
          );
          savePersistedData();
          sendToUid(uid, 'profile:synced', {
            profile,
            transactions: dbStore.transactions[uid] || [],
            connections: dbStore.connections[uid] || [],
            lastTransaction: tx,
          });
          broadcastPresenceAndRooms();
          return;
        }

        if (type === 'economy:sync_chips') {
          if (typeof payload?.chips === 'number') {
            profile.chips = Math.max(0, Math.floor(payload.chips));
            profile.updatedAt = new Date().toISOString();
            savePersistedData();
            sendToUid(uid, 'profile:synced', {
              profile,
              transactions: dbStore.transactions[uid] || [],
              connections: dbStore.connections[uid] || [],
            });
            broadcastPresenceAndRooms();
          }
          return;
        }

        if (type === 'game:round_complete') {
          const isPractice = Boolean(payload?.isPractice);
          const gameType = (payload?.gameType || 'plinko') as GameType;
          const wager = Math.max(0, Math.floor(Number(payload?.wager) || 0));
          const payout = Math.max(0, Math.floor(Number(payload?.payout) || 0));
          const multiplier = Number(payload?.multiplier) || 0;
          const summary = String(payload?.summary || `${gameType} round`);
          const clientChips = typeof payload?.clientChips === 'number' ? Math.max(0, Math.floor(payload.clientChips)) : null;

          if (!isPractice) {
            const netDelta = payout - wager;
            if (clientChips !== null) {
              profile.chips = clientChips;
            } else {
              profile.chips = Math.max(0, profile.chips + netDelta);
            }
            profile.gamesPlayed += 1;
            if (payout > 0) {
              profile.totalWon += payout;
              if (payout > profile.biggestWin) {
                profile.biggestWin = payout;
              }
            }
            const earnedXp = payout > wager ? 75 : 25;
            profile.xp += earnedXp;
            profile.level = Math.max(1, Math.floor(profile.xp / 500) + 1);
            profile.updatedAt = new Date().toISOString();

            // Check achievements
            const newlyUnlocked: Array<{ id: string; rewardChips: number; rewardXp: number; title: string }> = [];
            const checkUnlock = (id: string, cond: boolean, rewardChips: number, rewardXp: number, title: string) => {
              if (cond && !profile.unlockedAchievements.includes(id)) {
                profile.unlockedAchievements.push(id);
                profile.chips += rewardChips;
                profile.xp += rewardXp;
                profile.level = Math.max(1, Math.floor(profile.xp / 500) + 1);
                newlyUnlocked.push({ id, rewardChips, rewardXp, title });
              }
            };

            checkUnlock('first-wager', profile.gamesPlayed >= 1, 500, 100, 'Parlor Debut');
            checkUnlock('plinko-high-drop', gameType === 'plinko' && multiplier >= 10, 1500, 250, 'Gravity Defier');
            checkUnlock('blackjack-natural', gameType === 'blackjack' && payout > wager, 1000, 200, 'Velvet Twenty-One');
            checkUnlock('high-roller-win', payout >= 2500, 2500, 400, 'Monte Carlo High-Roller');
            checkUnlock('veteran-10', profile.gamesPlayed >= 10, 2000, 350, 'Club Regular');

            if (wager > 0) {
              appendTransaction(
                uid,
                payout >= wager ? 'payout' : 'wager',
                gameType.toUpperCase(),
                netDelta,
                profile.chips,
                `${summary} (Wager: ${wager.toLocaleString()} · Payout: ${payout.toLocaleString()})`
              );
            }

            for (const ach of newlyUnlocked) {
              appendTransaction(
                uid,
                'achievement-bonus',
                'Achievement Vault',
                ach.rewardChips,
                profile.chips,
                `Unlocked "${ach.title}" (+${ach.rewardChips.toLocaleString()} chips)`
              );
            }

            savePersistedData();
            sendToUid(uid, 'profile:synced', {
              profile,
              transactions: dbStore.transactions[uid] || [],
              connections: dbStore.connections[uid] || [],
              newlyUnlocked,
            });
          }

          // Broadcast activity to the player's current room so friends & spectators see it live!
          const roomId = profile.currentRoomId;
          if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId)!;
            const part = room.participants.find((p) => p.uid === uid);
            if (part) {
              part.lastAction = summary;
              part.lastPayout = payout;
              part.level = profile.level;
            }
            const event: TableActivityEvent = {
              id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              roomId,
              uid,
              displayName: profile.displayName,
              gameType,
              wager,
              payout,
              multiplier,
              summary: isPractice ? `[Practice] ${summary}` : summary,
              timestamp: new Date().toISOString(),
            };
            room.recentActivity.unshift(event);
            room.recentActivity = room.recentActivity.slice(0, 20);

            broadcastToRoom(roomId, 'room:activity', {
              roomId,
              event,
              participants: room.participants,
              extraVisual: payload?.extraVisual || null,
            });
            broadcastPresenceAndRooms();
          }
          return;
        }

        if (type === 'room:create') {
          const name = String(payload?.name || `${profile.displayName}'s Table`).trim().slice(0, 48);
          const gameType = (payload?.gameType || 'plinko') as GameType;
          const isPrivate = Boolean(payload?.isPrivate);
          const password = isPrivate ? String(payload?.password || '').trim() : undefined;
          const minBet = Math.max(10, Math.min(100000, Number(payload?.minBet) || 25));

          removeUserFromRooms(uid);

          const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const newRoom: ServerRoom = {
            id: roomId,
            hostId: uid,
            hostName: profile.displayName,
            name,
            gameType,
            isPrivate,
            password,
            minBet,
            status: 'open',
            participants: [
              {
                uid,
                displayName: profile.displayName,
                level: profile.level,
                chipTheme: profile.chipTheme,
                role: 'player',
              },
            ],
            recentActivity: [],
            createdAt: new Date().toISOString(),
          };

          rooms.set(roomId, newRoom);
          roomChats.set(roomId, [
            {
              id: `sys_${Date.now()}`,
              roomId,
              senderId: 'system',
              senderName: 'Floor Director',
              text: `${profile.displayName} opened "${name}" (${gameType.toUpperCase()}).`,
              timestamp: new Date().toISOString(),
              isSystem: true,
            },
          ]);

          profile.currentRoomId = roomId;
          profile.currentGame = gameType;
          profile.status = 'in-game';

          if (!profile.unlockedAchievements.includes('social-host')) {
            profile.unlockedAchievements.push('social-host');
            profile.chips += 1000;
            profile.xp += 200;
            appendTransaction(
              uid,
              'achievement-bonus',
              'Achievement Vault',
              1000,
              profile.chips,
              'Unlocked "Table Host" (+1,000 chips)'
            );
          }

          savePersistedData();
          sendToUid(uid, 'room:joined', {
            room: { ...newRoom, password: undefined },
            role: 'player',
            chatHistory: roomChats.get(roomId) || [],
            profile,
            transactions: dbStore.transactions[uid] || [],
            connections: dbStore.connections[uid] || [],
          });
          broadcastPresenceAndRooms();
          return;
        }

        if (type === 'room:join') {
          const roomId = String(payload?.roomId || '');
          let role: 'player' | 'spectator' = payload?.role === 'spectator' ? 'spectator' : 'player';
          const passwordAttempt = String(payload?.password || '').trim();
          const bypassInvite = Boolean(payload?.bypassInvite);

          const room = rooms.get(roomId);
          if (!room) {
            sendToUid(uid, 'room:error', { message: 'That table is no longer active.' });
            return;
          }

          if (room.isPrivate && !bypassInvite && room.hostId !== uid && room.password && room.password !== passwordAttempt) {
            sendToUid(uid, 'room:error', { message: 'Incorrect private room passcode.' });
            return;
          }

          removeUserFromRooms(uid);

          const currentSeatedPlayers = room.participants.filter((p) => p.role === 'player').length;
          if (role === 'player' && currentSeatedPlayers >= 5) {
            role = 'spectator';
            sendToUid(uid, 'social:feedback', {
              status: 'info',
              message: 'All 5 VIP seats are occupied — joined in Spectator Mode.',
            });
          }

          room.participants.push({
            uid,
            displayName: profile.displayName,
            level: profile.level,
            chipTheme: profile.chipTheme,
            role,
          });

          profile.currentRoomId = roomId;
          profile.currentGame = room.gameType;
          profile.status = role === 'spectator' ? 'spectating' : 'in-game';

          recordRecentPlayers(room, profile);

          if (!profile.unlockedAchievements.includes('social-host')) {
            profile.unlockedAchievements.push('social-host');
            profile.chips += 1000;
            profile.xp += 200;
            appendTransaction(
              uid,
              'achievement-bonus',
              'Achievement Vault',
              1000,
              profile.chips,
              'Unlocked "Table Host" (+1,000 chips)'
            );
          }

          const joinMsg: ChatMessage = {
            id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            roomId,
            senderId: 'system',
            senderName: 'Table Concierge',
            text: `${profile.displayName} joined the table as ${role}.`,
            timestamp: new Date().toISOString(),
            isSystem: true,
          };
          const chatList = roomChats.get(roomId) || [];
          chatList.push(joinMsg);
          roomChats.set(roomId, chatList.slice(-60));

          savePersistedData();

          sendToUid(uid, 'room:joined', {
            room: { ...room, password: undefined },
            role,
            chatHistory: roomChats.get(roomId) || [],
            profile,
            transactions: dbStore.transactions[uid] || [],
            connections: dbStore.connections[uid] || [],
          });

          broadcastToRoom(roomId, 'room:chat_message', joinMsg);
          broadcastPresenceAndRooms();
          return;
        }

        if (type === 'room:leave') {
          removeUserFromRooms(uid);
          profile.currentRoomId = 'lobby';
          profile.currentGame = 'Lobby';
          profile.status = 'online';
          savePersistedData();

          sendToUid(uid, 'room:left', {
            profile,
            chatHistory: roomChats.get('lobby') || [],
          });
          broadcastPresenceAndRooms();
          return;
        }

        if (type === 'room:chat') {
          const text = String(payload?.text || '').trim().slice(0, 280);
          if (!text) return;
          const targetRoomId = String(payload?.roomId || profile.currentRoomId || 'lobby');
          const msg: ChatMessage = {
            id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            roomId: targetRoomId,
            senderId: uid,
            senderName: profile.displayName,
            text,
            timestamp: new Date().toISOString(),
          };
          const list = roomChats.get(targetRoomId) || [];
          list.push(msg);
          roomChats.set(targetRoomId, list.slice(-60));

          if (targetRoomId === 'lobby') {
            broadcastAll('room:chat_message', msg);
          } else {
            broadcastToRoom(targetRoomId, 'room:chat_message', msg);
          }
          return;
        }

        if (type === 'room:reaction') {
          const emoji = String(payload?.emoji || '🔥').slice(0, 8);
          const targetRoomId = String(payload?.roomId || profile.currentRoomId || 'lobby');
          const reactionEvent = {
            id: `react_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            roomId: targetRoomId,
            senderId: uid,
            senderName: profile.displayName,
            emoji,
            xOffset: Math.floor(15 + Math.random() * 70),
            timestamp: Date.now(),
          };
          broadcastToRoom(targetRoomId, 'room:reaction_event', reactionEvent);
          return;
        }

        if (type === 'social:invite') {
          const recipientId = String(payload?.recipientId || '');
          const roomId = String(payload?.roomId || profile.currentRoomId || 'room_plinko_main');
          const room = rooms.get(roomId);
          if (!room || !recipientId) return;

          const invitePayload = {
            id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            senderId: uid,
            senderName: profile.displayName,
            recipientId,
            roomId: room.id,
            roomName: room.name,
            gameType: room.gameType,
            isPrivate: room.isPrivate,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };

          sendToUid(recipientId, 'social:invite_received', invitePayload);
          return;
        }

        if (type === 'social:add_friend') {
          const targetQuery = String(payload?.targetUidOrName || '').trim();
          if (!targetQuery) return;

          // Match by UID or case-insensitive displayName
          const targetProfile = Object.values(dbStore.profiles).find(
            (p) =>
              p.uid !== uid &&
              (p.uid.toLowerCase() === targetQuery.toLowerCase() ||
                p.displayName.toLowerCase() === targetQuery.toLowerCase())
          );

          if (!targetProfile) {
            sendToUid(uid, 'social:feedback', {
              status: 'error',
              message: `No player found matching "${targetQuery}".`,
            });
            return;
          }

          const now = new Date().toISOString();
          if (!dbStore.connections[uid]) dbStore.connections[uid] = [];
          const existing = dbStore.connections[uid].find((c) => c.targetUid === targetProfile.uid);
          if (existing) {
            existing.relationType = 'friend';
            existing.targetName = targetProfile.displayName;
            existing.updatedAt = now;
          } else {
            dbStore.connections[uid].unshift({
              uid,
              targetUid: targetProfile.uid,
              targetName: targetProfile.displayName,
              relationType: 'friend',
              lastPlayedGame: targetProfile.currentGame || 'Lobby',
              createdAt: now,
              updatedAt: now,
            });
          }

          // Also add mutual friend record for target
          if (!dbStore.connections[targetProfile.uid]) dbStore.connections[targetProfile.uid] = [];
          const rev = dbStore.connections[targetProfile.uid].find((c) => c.targetUid === uid);
          if (rev) {
            rev.relationType = 'friend';
            rev.targetName = profile.displayName;
            rev.updatedAt = now;
          } else {
            dbStore.connections[targetProfile.uid].unshift({
              uid: targetProfile.uid,
              targetUid: uid,
              targetName: profile.displayName,
              relationType: 'friend',
              lastPlayedGame: profile.currentGame || 'Lobby',
              createdAt: now,
              updatedAt: now,
            });
          }

          if (!profile.unlockedAchievements.includes('social-host')) {
            profile.unlockedAchievements.push('social-host');
            profile.chips += 1000;
            profile.xp += 200;
            appendTransaction(
              uid,
              'achievement-bonus',
              'Achievement Vault',
              1000,
              profile.chips,
              'Unlocked "Table Host" (+1,000 chips)'
            );
          }

          savePersistedData();
          sendToUid(uid, 'profile:synced', {
            profile,
            transactions: dbStore.transactions[uid] || [],
            connections: dbStore.connections[uid] || [],
          });
          sendToUid(targetProfile.uid, 'profile:synced', {
            profile: targetProfile,
            transactions: dbStore.transactions[targetProfile.uid] || [],
            connections: dbStore.connections[targetProfile.uid] || [],
          });
          sendToUid(uid, 'social:feedback', {
            status: 'ok',
            message: `${targetProfile.displayName} is now in your Friends List.`,
          });
          return;
        }

        if (type === 'social:remove_friend') {
          const targetUid = String(payload?.targetUid || '');
          if (dbStore.connections[uid]) {
            dbStore.connections[uid] = dbStore.connections[uid].filter((c) => c.targetUid !== targetUid);
            savePersistedData();
            sendToUid(uid, 'profile:synced', {
              profile,
              transactions: dbStore.transactions[uid] || [],
              connections: dbStore.connections[uid] || [],
            });
          }
          return;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      const uid = socketToUid.get(ws);
      socketToUid.delete(ws);
      if (uid) {
        const set = uidToSockets.get(uid);
        if (set) {
          set.delete(ws);
          if (set.size === 0) {
            uidToSockets.delete(uid);
            removeUserFromRooms(uid);
            if (dbStore.profiles[uid]) {
              dbStore.profiles[uid].status = 'offline';
              dbStore.profiles[uid].currentRoomId = 'lobby';
              dbStore.profiles[uid].currentGame = 'Offline';
              savePersistedData();
            }
          }
        }
        broadcastPresenceAndRooms();
      }
    });
  });

  // REST endpoint for health/status
  app.get('/api/status', (_req, res) => {
    res.json({
      onlineCount: uidToSockets.size,
      roomCount: rooms.size,
    });
  });

  // REST endpoint for high-society leaderboard
  app.get('/api/leaderboard', (req, res) => {
    const category = String(req.query.category || 'chips');
    const seededLegends = [
      {
        uid: 'legend_1',
        displayName: 'Lady Eleanor Vance',
        chips: 4850000,
        biggestWin: 920000,
        level: 48,
        xp: 24500,
        gamesPlayed: 142,
        estateTier: 'palace',
        estateTierName: 'Celestial Sovereign Palace',
        estatePrestige: 42000,
        chipTheme: 'obsidian-gold',
        tableTheme: 'royal-burgundy',
      },
      {
        uid: 'legend_2',
        displayName: 'Baron Von Brass',
        chips: 3200000,
        biggestWin: 650000,
        level: 39,
        xp: 19800,
        gamesPlayed: 118,
        estateTier: 'chateau',
        estateTierName: 'High-Roller Gilded Chateau',
        estatePrestige: 24500,
        chipTheme: 'classic-brass',
        tableTheme: 'mahogany-club',
      },
      {
        uid: 'legend_3',
        displayName: 'The Velvet Shark',
        chips: 2150000,
        biggestWin: 480000,
        level: 31,
        xp: 15600,
        gamesPlayed: 94,
        estateTier: 'villa',
        estateTierName: 'Monte Carlo Riviera Villa',
        estatePrestige: 16800,
        chipTheme: 'emerald-royale',
        tableTheme: 'emerald-felt',
      },
      {
        uid: 'legend_4',
        displayName: 'Countess Isabella',
        chips: 1450000,
        biggestWin: 310000,
        level: 26,
        xp: 13200,
        gamesPlayed: 76,
        estateTier: 'villa',
        estateTierName: 'Monte Carlo Riviera Villa',
        estatePrestige: 11400,
        chipTheme: 'crimson-velvet',
        tableTheme: 'midnight-velvet',
      },
      {
        uid: 'legend_5',
        displayName: 'Duke Sterling',
        chips: 890000,
        biggestWin: 220000,
        level: 21,
        xp: 10500,
        gamesPlayed: 62,
        estateTier: 'penthouse',
        estateTierName: 'Velvet & Brass Penthouse',
        estatePrestige: 7200,
        chipTheme: 'cyber-platinum',
        tableTheme: 'mahogany-club',
      },
      {
        uid: 'legend_6',
        displayName: 'Jasper "Snake-Eyes" Boone',
        chips: 620000,
        biggestWin: 165000,
        level: 17,
        xp: 8600,
        gamesPlayed: 51,
        estateTier: 'penthouse',
        estateTierName: 'Velvet & Brass Penthouse',
        estatePrestige: 4900,
        chipTheme: 'classic-brass',
        tableTheme: 'emerald-felt',
      },
    ];

    const entriesMap = new Map<string, any>();
    for (const leg of seededLegends) {
      entriesMap.set(leg.uid, leg);
    }

    for (const p of Object.values(dbStore.profiles)) {
      entriesMap.set(p.uid, {
        uid: p.uid,
        displayName: p.displayName,
        chips: p.chips,
        biggestWin: p.biggestWin,
        level: p.level,
        xp: p.xp,
        gamesPlayed: p.gamesPlayed,
        estateTier: p.level >= 25 ? 'palace' : p.level >= 15 ? 'villa' : p.level >= 5 ? 'penthouse' : 'speakeasy',
        estateTierName: p.level >= 25 ? 'Celestial Sovereign Palace' : p.level >= 15 ? 'Monte Carlo Riviera Villa' : p.level >= 5 ? 'Velvet & Brass Penthouse' : 'Victorian Speakeasy Suite',
        estatePrestige: p.level * 450,
        chipTheme: p.chipTheme,
        tableTheme: p.tableTheme,
      });
    }

    const entries = Array.from(entriesMap.values());
    if (category === 'biggestWin') {
      entries.sort((a, b) => b.biggestWin - a.biggestWin);
    } else if (category === 'estate') {
      entries.sort((a, b) => b.estatePrestige - a.estatePrestige);
    } else if (category === 'level') {
      entries.sort((a, b) => (b.level !== a.level ? b.level - a.level : b.xp - a.xp));
    } else {
      entries.sort((a, b) => b.chips - a.chips);
    }

    res.json({
      category,
      entries: entries.slice(0, 50).map((item, idx) => ({ ...item, rank: idx + 1 })),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Velvet & Brass Social Club server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
