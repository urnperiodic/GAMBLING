import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GameType,
  GAME_CATALOG,
  PlayerProfileData,
  ChipTransactionItem,
  PlayerConnectionItem,
  MultiplayerRoom,
  ChatMessage,
  EmojiReactionEvent,
  DirectInvitation,
  TABLE_THEMES,
  CHIP_THEMES,
  ChipThemeId,
  TableThemeId,
} from './types/casino';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  ensureFirestoreProfile,
  syncFirestoreGameplayStats,
  syncFirestoreCustomization,
  recordFirestoreTransaction,
  upsertFirestoreConnection,
  removeFirestoreConnection,
} from './lib/firebase';
import { PlinkoGame } from './components/games/PlinkoGame';
import { BlackjackGame } from './components/games/BlackjackGame';
import { RouletteGame } from './components/games/RouletteGame';
import { SlotsGame } from './components/games/SlotsGame';
import { VideoPokerGame } from './components/games/VideoPokerGame';
import { DiceGame } from './components/games/DiceGame';
import { SocialSidebar } from './components/SocialSidebar';
import { VaultProgressionModal } from './components/VaultProgressionModal';
import { CreateRoomModal } from './components/CreateRoomModal';
import { VaultPuzzleModal } from './components/VaultPuzzleModal';
import { sound } from './utils/sound';
import {
  Eye,
  Lock,
  Play,
  Volume2,
  VolumeX,
  Users,
  ArrowLeft,
  RotateCcw,
  UserPlus,
  Trophy,
  Sparkles,
  LayoutGrid,
  Compass,
  Coins,
  Spade,
  Crown,
  Dices,
  Flame,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Bell,
  Shield,
  Plus,
  Clock,
} from 'lucide-react';

const LOCAL_UID_KEY = 'vb_parlor_anon_uid_v1';

function getOrCreateLocalAnonymousUid(): string {
  const existing = localStorage.getItem(LOCAL_UID_KEY);
  if (existing && /^[a-zA-Z0-9_\-]+$/.test(existing)) {
    return existing;
  }
  const generated = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(LOCAL_UID_KEY, generated);
  return generated;
}

interface LiveFeedBetRow {
  id: string;
  gameType: GameType;
  gameTitle: string;
  user: string;
  time: string;
  wager: number;
  multiplier: number;
  payout: number;
}

const INITIAL_PARLOR_FEED: LiveFeedBetRow[] = [
  {
    id: 'seed_1',
    gameType: 'plinko',
    gameTitle: 'Plinko Pyramid',
    user: 'Albert Flores',
    time: 'Just now',
    wager: 100,
    multiplier: 10.0,
    payout: 1000,
  },
  {
    id: 'seed_2',
    gameType: 'roulette',
    gameTitle: 'Monte Carlo Wheel',
    user: 'Annette Black',
    time: '1m ago',
    wager: 50,
    multiplier: 36.0,
    payout: 1800,
  },
  {
    id: 'seed_3',
    gameType: 'slots',
    gameTitle: 'Velvet Brass Reels',
    user: 'Guy Hawkins',
    time: '2m ago',
    wager: 150,
    multiplier: 5.0,
    payout: 750,
  },
  {
    id: 'seed_4',
    gameType: 'blackjack',
    gameTitle: 'Parlor Blackjack',
    user: 'Darlene Robertson',
    time: '3m ago',
    wager: 250,
    multiplier: 2.5,
    payout: 625,
  },
  {
    id: 'seed_5',
    gameType: 'videopoker',
    gameTitle: 'Jacks or Better',
    user: 'Devon Lane',
    time: '5m ago',
    wager: 200,
    multiplier: 9.0,
    payout: 1800,
  },
];

export default function App() {
  const [uid, setUid] = useState<string>(() => getOrCreateLocalAnonymousUid());
  const [firebaseAuthStatus, setFirebaseAuthStatus] = useState<
    'anonymous' | 'google' | 'local-fallback'
  >('local-fallback');

  const [profile, setProfile] = useState<PlayerProfileData>(() => ({
    uid: getOrCreateLocalAnonymousUid(),
    displayName: `Patron_${getOrCreateLocalAnonymousUid().slice(-4).toUpperCase()}`,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const [transactions, setTransactions] = useState<ChipTransactionItem[]>([]);
  const [connections, setConnections] = useState<PlayerConnectionItem[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerProfileData[]>([]);
  const [rooms, setRooms] = useState<MultiplayerRoom[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<EmojiReactionEvent[]>([]);
  const [pendingInvite, setPendingInvite] = useState<DirectInvitation | null>(null);
  const [liveFeedRows, setLiveFeedRows] = useState<LiveFeedBetRow[]>(INITIAL_PARLOR_FEED);

  const [activeView, setActiveView] = useState<'lobby' | 'table'>('lobby');
  const [lobbyCenterTab, setLobbyCenterTab] = useState<'games' | 'matches'>('games');
  const [liveFeedTab, setLiveFeedTab] = useState<'live' | 'lucky' | 'whale'>('live');
  const [activeRoom, setActiveRoom] = useState<MultiplayerRoom | null>(null);
  const [tableRole, setTableRole] = useState<'player' | 'spectator'>('player');
  const [selectedGameFilter, setSelectedGameFilter] = useState<GameType | 'all'>('all');

  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [practiceChips, setPracticeChips] = useState<number>(10000);

  const [vaultModalOpen, setVaultModalOpen] = useState<boolean>(false);
  const [vaultSection, setVaultSection] = useState<'vault' | 'ledger' | 'cosmetics'>('vault');
  const [createRoomOpen, setCreateRoomOpen] = useState<boolean>(false);
  const [puzzleModalOpen, setPuzzleModalOpen] = useState<boolean>(false);
  const [passwordPromptRoom, setPasswordPromptRoom] = useState<{
    room: MultiplayerRoom;
    role: 'player' | 'spectator';
  } | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const profileRef = useRef<PlayerProfileData>(profile);
  profileRef.current = profile;

  const showTempNotice = useCallback((msg: string) => {
    setSocialNotice(msg);
    setTimeout(() => {
      setSocialNotice((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUid(fbUser.uid);
        setFirebaseAuthStatus(fbUser.isAnonymous ? 'anonymous' : 'google');
        try {
          const synced = await ensureFirestoreProfile(fbUser, profileRef.current);
          setProfile((prev) => ({ ...prev, ...synced, uid: fbUser.uid }));
        } catch {
          // Handled inside ensureFirestoreProfile
        }
      } else {
        try {
          await signInAnonymously(auth);
        } catch {
          setFirebaseAuthStatus('local-fallback');
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let isUnmounted = false;

    const connectWs = () => {
      if (isUnmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'auth:identify',
            payload: {
              uid,
              displayName: profileRef.current.displayName,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);

          if (type === 'auth:ready') {
            if (payload.profile) setProfile(payload.profile);
            if (payload.transactions) setTransactions(payload.transactions);
            if (payload.connections) setConnections(payload.connections);
            if (payload.onlinePlayers) setOnlinePlayers(payload.onlinePlayers);
            if (payload.rooms) setRooms(payload.rooms);
            if (payload.chatHistory) setChatMessages(payload.chatHistory);
          } else if (type === 'presence:update') {
            if (payload.onlinePlayers) setOnlinePlayers(payload.onlinePlayers);
            if (payload.rooms) {
              setRooms(payload.rooms);
              setActiveRoom((curr) => {
                if (!curr) return null;
                const updated = payload.rooms.find((r: MultiplayerRoom) => r.id === curr.id);
                return updated || curr;
              });
            }
          } else if (type === 'profile:synced') {
            if (payload.profile) {
              setProfile(payload.profile);
              syncFirestoreGameplayStats(payload.profile.uid, payload.profile).catch(() => {});
            }
            if (payload.transactions) setTransactions(payload.transactions);
            if (payload.connections) setConnections(payload.connections);
            if (payload.lastTransaction) {
              recordFirestoreTransaction(payload.profile.uid, payload.lastTransaction).catch(
                () => {}
              );
            }
            if (payload.newlyUnlocked && payload.newlyUnlocked.length > 0) {
              showTempNotice(
                `Achievement Unlocked: ${payload.newlyUnlocked[0].title} (+${payload.newlyUnlocked[0].rewardChips} Chips)`
              );
            }
          } else if (type === 'room:joined') {
            setActiveRoom(payload.room);
            setTableRole(payload.role || 'player');
            setActiveView('table');
            if (payload.chatHistory) setChatMessages(payload.chatHistory);
            if (payload.profile) setProfile(payload.profile);
            if (payload.connections) setConnections(payload.connections);
          } else if (type === 'room:left') {
            setActiveRoom(null);
            setActiveView('lobby');
            if (payload.chatHistory) setChatMessages(payload.chatHistory);
            if (payload.profile) setProfile(payload.profile);
          } else if (type === 'room:activity') {
            if (payload.event) {
              const ev = payload.event;
              setLiveFeedRows((prev) => [
                {
                  id: ev.id || `ev_${Date.now()}`,
                  gameType: ev.gameType || 'plinko',
                  gameTitle: GAME_CATALOG[ev.gameType as GameType]?.title || 'Parlor Table',
                  user: ev.playerName || 'Patron',
                  time: new Date(ev.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  wager: ev.wager || 25,
                  multiplier: ev.multiplier || 1,
                  payout: ev.payout || 0,
                },
                ...prev.slice(0, 14),
              ]);
            }
            setActiveRoom((curr) => {
              if (!curr || curr.id !== payload.roomId) return curr;
              return {
                ...curr,
                participants: payload.participants || curr.participants,
                recentActivity: [payload.event, ...curr.recentActivity].slice(0, 20),
              };
            });
          } else if (type === 'room:chat_message') {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload].slice(-60);
            });
          } else if (type === 'room:reaction_event') {
            setReactions((prev) => [...prev, payload]);
            setTimeout(() => {
              setReactions((prev) => prev.filter((r) => r.id !== payload.id));
            }, 2200);
          } else if (type === 'social:invite_received') {
            setPendingInvite(payload);
            sound.playWinChime(false);
          } else if (type === 'social:feedback') {
            showTempNotice(payload.message);
          } else if (type === 'room:error') {
            showTempNotice(payload.message);
          }
        } catch {
          // Ignore malformed packets
        }
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connectWs, 2000);
        }
      };
    };

    connectWs();
    return () => {
      isUnmounted = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [uid, showTempNotice]);

  const sendWs = useCallback((type: string, payload: unknown = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const handleCompleteRound = useCallback(
    (result: {
      wager: number;
      payout: number;
      multiplier: number;
      summary: string;
      extraVisual?: unknown;
    }) => {
      const currentGameType: GameType = activeRoom ? activeRoom.gameType : 'plinko';
      if (isPracticeMode) {
        setPracticeChips((prev) => Math.max(0, prev - result.wager + result.payout));
      }
      setLiveFeedRows((prev) => [
        {
          id: `local_${Date.now()}`,
          gameType: currentGameType,
          gameTitle: GAME_CATALOG[currentGameType]?.title || 'Parlor Table',
          user: profileRef.current.displayName,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          wager: result.wager,
          multiplier: result.multiplier,
          payout: result.payout,
        },
        ...prev.slice(0, 14),
      ]);
      sendWs('game:round_complete', {
        isPractice: isPracticeMode,
        gameType: currentGameType,
        wager: result.wager,
        payout: result.payout,
        multiplier: result.multiplier,
        summary: result.summary,
        extraVisual: result.extraVisual,
      });
    },
    [activeRoom, isPracticeMode, sendWs]
  );

  const handleJoinRoomRequest = (
    roomId: string,
    role: 'player' | 'spectator',
    bypassInvite: boolean = false
  ) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (
      targetRoom &&
      targetRoom.isPrivate &&
      !bypassInvite &&
      targetRoom.hostId !== profile.uid
    ) {
      setPasswordPromptRoom({ room: targetRoom, role });
      setPasswordInput('');
      return;
    }
    sendWs('room:join', { roomId, role, bypassInvite });
  };

  const handleQuickPlayGame = (gameType: GameType, forcePractice?: boolean) => {
    sound.playChipClick();
    if (typeof forcePractice === 'boolean') {
      setIsPracticeMode(forcePractice);
    }
    const openPublicRoom = rooms.find((r) => r.gameType === gameType && !r.isPrivate);
    if (openPublicRoom) {
      sendWs('room:join', { roomId: openPublicRoom.id, role: 'player' });
    } else {
      sendWs('room:create', {
        name: `${GAME_CATALOG[gameType].title} Table`,
        gameType,
        isPrivate: false,
        minBet: GAME_CATALOG[gameType].minWager,
      });
    }
  };

  const handleUpdateCustomization = (updates: {
    displayName?: string;
    chipTheme?: ChipThemeId;
    tableTheme?: TableThemeId;
  }) => {
    sendWs('profile:customize', updates);
    syncFirestoreCustomization(profile.uid, {
      displayName: updates.displayName || profile.displayName,
      chipTheme: updates.chipTheme || profile.chipTheme,
      tableTheme: updates.tableTheme || profile.tableTheme,
      status: profile.status,
      currentGame: profile.currentGame,
      currentRoomId: profile.currentRoomId,
    }).catch(() => {});
    showTempNotice('Parlor profile preferences updated.');
  };

  const handleAddFriend = (targetUidOrName: string) => {
    sendWs('social:add_friend', { targetUidOrName });
    const match = onlinePlayers.find(
      (p) =>
        p.uid.toLowerCase() === targetUidOrName.toLowerCase() ||
        p.displayName.toLowerCase() === targetUidOrName.toLowerCase()
    );
    if (match) {
      upsertFirestoreConnection(
        profile.uid,
        match.uid,
        match.displayName,
        'friend',
        match.currentGame
      ).catch(() => {});
    }
  };

  const handleRemoveFriend = (targetUid: string) => {
    sendWs('social:remove_friend', { targetUid });
    removeFirestoreConnection(profile.uid, targetUid).catch(() => {});
  };

  const toggleMute = () => {
    sound.muted = !muted;
    setMuted(!muted);
  };

  const currentTableTheme = TABLE_THEMES[profile.tableTheme] || TABLE_THEMES['emerald-felt'];
  const currentChipTheme = CHIP_THEMES[profile.chipTheme] || CHIP_THEMES['classic-brass'];
  const effectiveBalance = isPracticeMode ? practiceChips : profile.chips;

  const filteredRooms =
    selectedGameFilter === 'all'
      ? rooms
      : rooms.filter((r) => r.gameType === selectedGameFilter);

  const displayedFeedRows = useMemo(() => {
    if (liveFeedTab === 'lucky') {
      return liveFeedRows.filter((r) => r.multiplier >= 2);
    }
    if (liveFeedTab === 'whale') {
      return liveFeedRows.filter((r) => r.payout >= 500 || r.wager >= 100);
    }
    return liveFeedRows;
  }, [liveFeedRows, liveFeedTab]);

  const RAIL_ITEMS: { id: GameType; label: string; icon: React.ReactNode }[] = [
    { id: 'plinko', label: 'Plinko', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'roulette', label: 'Roulette', icon: <Compass className="w-4 h-4" /> },
    { id: 'slots', label: 'Slots', icon: <Coins className="w-4 h-4" /> },
    { id: 'blackjack', label: 'Blackjack', icon: <Spade className="w-4 h-4" /> },
    { id: 'videopoker', label: 'Poker', icon: <Crown className="w-4 h-4" /> },
    { id: 'dice', label: 'Dice', icon: <Dices className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#060d0a] text-[#f4f1ea] flex flex-col">
      {/* Top Bar matching reference layout in Velvet & Brass theme */}
      <header className="h-15 px-4 lg:px-6 border-b border-amber-500/20 bg-[#08120e] flex items-center justify-between gap-4 shrink-0">
        {/* Left: Brand Emblem + Wordmark + Nav Links */}
        <div className="flex items-center gap-6 min-w-0">
          <a
            href="#lobby"
            onClick={(e) => {
              e.preventDefault();
              if (activeView === 'table') sendWs('room:leave');
              setActiveView('lobby');
            }}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 flex items-center justify-center text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]">
              <Flame className="w-4 h-4 fill-stone-950" />
            </div>
            <span className="font-display text-lg font-bold tracking-wide text-white group-hover:text-amber-300 transition-colors">
              velvet<span className="text-amber-400">.gg</span>
            </span>
          </a>

          <nav className="hidden xl:flex items-center gap-5 text-xs font-semibold text-stone-400">
            <button
              type="button"
              onClick={() => {
                if (activeView === 'table') sendWs('room:leave');
                setActiveView('lobby');
              }}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeView === 'lobby' ? 'text-amber-300' : 'hover:text-stone-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setVaultSection('ledger');
                setVaultModalOpen(true);
              }}
              className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Leaderboard</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setVaultSection('cosmetics');
                setVaultModalOpen(true);
              }}
              className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>VIP Club</span>
            </button>
          </nav>
        </div>

        {/* Center: Segmented [ ♠ Games | 🎲 1-5 Tables ] Pill Switcher */}
        <div className="hidden md:flex items-center p-1 rounded-2xl bg-[#050b08] border border-amber-500/20">
          <button
            type="button"
            onClick={() => {
              if (activeView === 'table') sendWs('room:leave');
              setActiveView('lobby');
              setLobbyCenterTab('games');
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'lobby' && lobbyCenterTab === 'games'
                ? 'btn-arcade-gold shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Spade className="w-3.5 h-3.5" />
            <span>Games</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeView === 'table') sendWs('room:leave');
              setActiveView('lobby');
              setLobbyCenterTab('matches');
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              lobbyCenterTab === 'matches'
                ? 'btn-arcade-gold shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1–5 Tables</span>
          </button>
        </div>

        {/* Right: Unified Balance Pill + (+1,500 Free Deposit Button) + Avatar + Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Unified Bankroll & Free Chips Pill (Matches [ O 1 561 | + Deposit ] in reference) */}
          <div className="flex items-center bg-[#050b08] border border-amber-500/30 rounded-2xl p-1 pl-3 gap-2.5">
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-stone-950 shadow-inner"
                style={{ backgroundColor: currentChipTheme.primaryHex }}
              >
                ★
              </div>
              <span className="font-mono-tabular text-xs sm:text-sm font-extrabold text-white">
                {effectiveBalance.toLocaleString()}
              </span>
            </div>

            {isPracticeMode ? (
              <button
                type="button"
                onClick={() => {
                  sound.playChipClick();
                  setPracticeChips(10000);
                }}
                className="btn-arcade-emerald px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset 10K</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playChipClick();
                  setPuzzleModalOpen(true);
                }}
                title="Solve 10-Second Brass Vault Puzzle for +1,500 Free Chips"
                className="btn-arcade-emerald px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>1,500 Free</span>
              </button>
            )}
          </div>

          {/* Live / Practice Compact Switch */}
          <button
            type="button"
            onClick={() => {
              sound.playChipClick();
              setIsPracticeMode((prev) => !prev);
            }}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-colors ${
              isPracticeMode
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-[#0c1a14] border-stone-800 text-stone-400 hover:text-amber-300'
            }`}
            title="Switch between Live Bankroll and Practice Mode"
          >
            {isPracticeMode ? 'Practice' : 'Live'}
          </button>

          {/* Glowing Ring Avatar Button */}
          <button
            type="button"
            onClick={() => {
              setVaultSection('vault');
              setVaultModalOpen(true);
            }}
            className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-emerald-400 to-yellow-200 shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer shrink-0 relative"
            title={`${profile.displayName} · Level ${profile.level}`}
          >
            <img
              src="/src/assets/images/avatar_vip_crest_1793833124304.jpg"
              alt="VIP Avatar"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover border border-stone-950"
            />
            <span className="absolute -bottom-0.5 -right-0.5 bg-amber-400 text-stone-950 font-mono-tabular text-[8px] font-extrabold px-1 rounded-full border border-stone-950">
              {profile.level}
            </span>
          </button>

          {/* Daily Vault / Notifications Bell */}
          <button
            type="button"
            onClick={() => {
              setVaultSection('vault');
              setVaultModalOpen(true);
            }}
            className="w-9 h-9 rounded-xl bg-[#0c1a14] border border-stone-800 hover:border-amber-400/40 flex items-center justify-center text-stone-300 hover:text-amber-300 cursor-pointer relative"
            title="Daily Rewards & Vault"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5" />
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="w-9 h-9 rounded-xl bg-[#0c1a14] border border-stone-800 hover:border-amber-400/40 flex items-center justify-center text-amber-300 cursor-pointer"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Incoming Real-Time 1–5 Player Invitation Banner */}
      {pendingInvite && (
        <div className="bg-amber-400 text-stone-950 px-5 py-1.5 shadow-lg shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-bold">
              1–5 PLAYER TABLE INVITE: <strong>{pendingInvite.senderName}</strong> invited you to{' '}
              <strong>{pendingInvite.roomName}</strong> ({pendingInvite.gameType.toUpperCase()})!
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleJoinRoomRequest(pendingInvite.roomId, 'player', true);
                  setPendingInvite(null);
                }}
                className="px-3 py-1 bg-stone-950 text-amber-300 font-extrabold rounded-lg cursor-pointer"
              >
                TAKE SEAT
              </button>
              <button
                type="button"
                onClick={() => {
                  handleJoinRoomRequest(pendingInvite.roomId, 'spectator', true);
                  setPendingInvite(null);
                }}
                className="px-2.5 py-1 bg-stone-900/20 text-stone-950 font-extrabold rounded-lg cursor-pointer"
              >
                WATCH
              </button>
              <button
                type="button"
                onClick={() => setPendingInvite(null)}
                className="px-2 py-1 text-stone-800 font-bold cursor-pointer"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main 3-Column Body: Left Icon Rail + Center Stage + Right Online Chat Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
        {/* Floating Live Emoji Reactions Overlay */}
        <div className="pointer-events-none fixed inset-x-0 bottom-12 z-40 overflow-hidden h-44">
          {reactions.map((r) => (
            <div
              key={r.id}
              style={{ left: `${r.xOffset}%` }}
              className="absolute bottom-0 animate-reaction flex flex-col items-center"
            >
              <span className="text-3xl drop-shadow">{r.emoji}</span>
              <span className="text-[10px] font-bold text-amber-200 bg-black/80 px-1.5 py-0.5 rounded mt-0.5 border border-amber-400/30">
                {r.senderName}
              </span>
            </div>
          ))}
        </div>

        {/* Left Slim Vertical Game Rail (Matches left icon sidebar in reference image) */}
        <nav className="hidden lg:flex w-18 shrink-0 bg-[#08120e] border-r border-amber-500/15 flex-col items-center py-4 justify-between select-none">
          <div className="flex flex-col items-center gap-3 w-full">
            {/* Highlighted All-Games Dashboard Cube Button */}
            <button
              type="button"
              onClick={() => {
                if (activeView === 'table') sendWs('room:leave');
                setActiveView('lobby');
                setSelectedGameFilter('all');
              }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                activeView === 'lobby' && selectedGameFilter === 'all'
                  ? 'btn-arcade-gold shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-[#0d1c15] border border-stone-800 text-amber-300 hover:border-amber-400/50'
              }`}
              title="Casino Lobby"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>

            <div className="w-8 h-px bg-stone-800/80 my-0.5" />

            {/* 6 Game Quick-Launch Icons with Labels */}
            {RAIL_ITEMS.map((item) => {
              const isCurrentGame =
                activeView === 'table' && activeRoom?.gameType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleQuickPlayGame(item.id)}
                  className={`w-14 py-2 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer group ${
                    isCurrentGame
                      ? 'bg-amber-400/15 border border-amber-400/40 text-amber-300'
                      : 'text-stone-400 hover:text-amber-300 hover:bg-[#0d1c15]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      isCurrentGame
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-[#0d1c15] border border-stone-800 group-hover:border-amber-400/40'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Rail Actions */}
          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCreateRoomOpen(true)}
              title="Create 1–5 Player Private or Public Room"
              className="w-9 h-9 rounded-xl bg-[#0d1c15] border border-amber-500/30 hover:border-amber-400 flex items-center justify-center text-amber-300 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setVaultSection('vault');
                setVaultModalOpen(true);
              }}
              title="Daily Vault"
              className="w-9 h-9 rounded-xl bg-[#0d1c15] border border-stone-800 hover:border-amber-400/40 flex items-center justify-center text-stone-400 hover:text-amber-300 cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
            </button>
          </div>
        </nav>

        {/* Center Main Stage */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-[1140px] mx-auto space-y-6">
            {activeView === 'lobby' ? (
              <>
                {/* SECTION 1: ASYMMETRIC BENTO GRID OF VELVET ORIGINALS (Matches top bento grid in reference image) */}
                {lobbyCenterTab === 'games' && (
                  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2 gap-3.5 lg:h-[310px]">
                    {/* Left Tall Card (Plinko Pyramid - matches tall left card in reference) */}
                    <div
                      onClick={() => handleQuickPlayGame('plinko')}
                      className="lg:col-span-3 lg:row-span-2 rounded-3xl p-5 relative overflow-hidden cursor-pointer group border border-emerald-400/40 bg-gradient-to-b from-[#0f4c3a] via-[#0a2e23] to-[#061913] shadow-xl flex flex-col justify-between min-h-[220px]"
                    >
                      {/* Decorative glowing aura */}
                      <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

                      <div className="relative z-10">
                        <h2 className="font-display text-xl font-bold text-white group-hover:text-amber-200 transition-colors">
                          Plinko Pyramid
                        </h2>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-200/80 mt-0.5">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Velvet Originals</span>
                        </div>
                      </div>

                      {/* Illustrated Plinko Pyramid Graphic */}
                      <div className="relative z-10 my-auto py-3 flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_16px_#fbbf24] mb-2 group-hover:translate-y-1 transition-transform" />
                        <div className="space-y-2">
                          {[3, 4, 5, 6].map((rowCount) => (
                            <div key={rowCount} className="flex items-center justify-center gap-3.5">
                              {Array.from({ length: rowCount }).map((_, idx) => (
                                <span
                                  key={idx}
                                  className="w-2 h-2 rounded-full bg-amber-200/90 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 mt-3">
                          {['110x', '24x', '4x', '24x', '110x'].map((mult, i) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded-md font-mono-tabular text-[9px] font-extrabold shadow ${
                                i === 0 || i === 4
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-400 text-stone-950'
                              }`}
                            >
                              {mult}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center justify-between text-[11px] font-bold text-amber-300">
                        <span>1–5 Players</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-black/35 border border-amber-400/30">
                          Play Now →
                        </span>
                      </div>
                    </div>

                    {/* Top Middle-Left Card: Roulette (Matches Roulette pocket strip card in reference) */}
                    <div
                      onClick={() => handleQuickPlayGame('roulette')}
                      className="lg:col-span-2 lg:row-span-1 rounded-3xl p-4 relative overflow-hidden cursor-pointer group border border-amber-500/25 bg-gradient-to-br from-[#13221c] to-[#09120e] shadow-lg flex flex-col justify-between min-h-[140px]"
                    >
                      <div className="relative z-10">
                        <h3 className="font-display text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                          Roulette
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-stone-400">
                          <Flame className="w-2.5 h-2.5 text-amber-400" />
                          <span>Velvet Originals</span>
                        </div>
                      </div>

                      {/* Numbered Roulette Tiles Strip (22 Red, 0 Emerald/Gold, 4 Obsidian) */}
                      <div className="relative z-10 flex items-center justify-center gap-1.5 pt-2">
                        <div className="w-10 h-12 rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 border border-rose-300/40 flex items-end justify-center pb-1.5 font-mono-tabular text-xs font-extrabold text-white shadow-md">
                          22
                        </div>
                        <div className="w-11 h-13 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-700 border-2 border-amber-300 flex flex-col items-center justify-between py-1 font-mono-tabular text-xs font-extrabold text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] relative">
                          <span className="w-1.5 h-2.5 bg-amber-300 rounded-full" />
                          <span>0</span>
                        </div>
                        <div className="w-10 h-12 rounded-xl bg-gradient-to-b from-stone-700 to-stone-950 border border-stone-500/40 flex items-end justify-center pb-1.5 font-mono-tabular text-xs font-extrabold text-white shadow-md">
                          4
                        </div>
                      </div>
                    </div>

                    {/* Top Middle-Right Wide Card: Blackjack Jackpot (Matches wide Jackpot card in reference) */}
                    <div
                      onClick={() => handleQuickPlayGame('blackjack')}
                      className="lg:col-span-4 lg:row-span-1 rounded-3xl p-4 relative overflow-hidden cursor-pointer group border border-amber-400/35 bg-gradient-to-r from-[#2c1d11] via-[#422a14] to-[#193829] shadow-lg flex flex-col justify-between min-h-[140px]"
                    >
                      {/* Decorative Gold & Emerald Ribbons */}
                      <div className="absolute right-4 -top-6 w-28 h-36 rounded-full border-14 border-amber-400/30 rotate-12 pointer-events-none" />
                      <div className="absolute right-20 -bottom-8 w-28 h-36 rounded-full border-14 border-emerald-400/30 -rotate-12 pointer-events-none" />

                      <div className="relative z-10">
                        <h3 className="font-display text-lg font-bold text-white group-hover:text-amber-200 transition-colors">
                          Blackjack 21
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-200/80">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Velvet Originals · 3:2 Royal Payout</span>
                        </div>
                      </div>

                      {/* Illustrated Overlapping Cards */}
                      <div className="relative z-10 flex items-center justify-between pt-2">
                        <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-amber-400/30 font-mono-tabular text-[10px] font-extrabold text-amber-300">
                          1–5 SEATS LIVE
                        </span>
                        <div className="flex items-center mr-2">
                          <div className="w-10 h-13 rounded-lg bg-white text-stone-950 font-extrabold text-xs p-1.5 shadow-lg -rotate-12 flex flex-col justify-between border border-stone-300">
                            <span>A♠</span>
                            <span className="text-center text-sm">♠</span>
                          </div>
                          <div className="w-10 h-13 rounded-lg bg-amber-300 text-stone-950 font-extrabold text-xs p-1.5 shadow-xl rotate-12 -ml-2 flex flex-col justify-between border border-white">
                            <span>K♦</span>
                            <span className="text-center text-sm text-rose-700">♦</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Tall Card: Slots (Matches tall yellow/orange "7" Slots card on the right of reference) */}
                    <div
                      onClick={() => handleQuickPlayGame('slots')}
                      className="lg:col-span-3 lg:row-span-2 rounded-3xl p-5 relative overflow-hidden cursor-pointer group border border-amber-300/50 bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#78350f] shadow-xl flex flex-col justify-between min-h-[220px]"
                    >
                      <div className="relative z-10">
                        <h2 className="font-display text-xl font-bold text-white">Slots</h2>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-100/90 mt-0.5">
                          <Flame className="w-3 h-3 text-yellow-200" />
                          <span>Velvet Originals</span>
                        </div>
                      </div>

                      {/* Bold 3D Golden Slot Reel with Lucky 7 (Matches reference Slots card!) */}
                      <div className="relative z-10 my-auto py-2 flex items-center justify-center">
                        <div className="w-32 h-36 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 p-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)] border-2 border-yellow-200 -rotate-3 group-hover:rotate-0 transition-transform flex items-center justify-center relative">
                          {/* Side arrows */}
                          <div className="w-3 h-3 bg-stone-200 rotate-45 -left-1.5 absolute shadow" />
                          <div className="w-3 h-3 bg-stone-200 rotate-45 -right-1.5 absolute shadow" />
                          {/* White cylinder wheel */}
                          <div className="w-full h-full rounded-xl bg-gradient-to-b from-stone-200 via-white to-stone-300 shadow-inner flex items-center justify-center border border-stone-400">
                            <span className="font-display text-5xl font-black text-rose-600 drop-shadow-[0_2px_0_#fbbf24]">
                              7
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center justify-between text-[11px] font-extrabold text-amber-100">
                        <span>MAX 250X</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-stone-950/50 border border-yellow-200/40 text-yellow-200">
                          Spin Reels →
                        </span>
                      </div>
                    </div>

                    {/* Bottom Middle-Left Wide Card: Brass Dice (Matches wide Crash card in reference) */}
                    <div
                      onClick={() => handleQuickPlayGame('dice')}
                      className="lg:col-span-4 lg:row-span-1 rounded-3xl p-4 relative overflow-hidden cursor-pointer group border border-amber-500/25 bg-gradient-to-r from-[#0d211a] via-[#133327] to-[#1f2416] shadow-lg flex flex-col justify-between min-h-[140px]"
                    >
                      <div className="relative z-10">
                        <h3 className="font-display text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                          High-Roller Dice
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-stone-400">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Velvet Originals · Up to 98x Instant Roll</span>
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center justify-between pt-2">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/30 font-mono-tabular text-[10px] font-extrabold text-emerald-300">
                          98.0X MULTIPLIER
                        </span>

                        <div className="flex items-center gap-2 mr-2">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-200 to-amber-500 border-2 border-white shadow-lg -rotate-12 flex items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-700" />
                          </div>
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-400 border-2 border-white shadow-lg rotate-12 grid grid-cols-2 gap-1.5 p-2">
                            <span className="w-2 h-2 rounded-full bg-stone-950" />
                            <span className="w-2 h-2 rounded-full bg-stone-950" />
                            <span className="w-2 h-2 rounded-full bg-stone-950" />
                            <span className="w-2 h-2 rounded-full bg-stone-950" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Middle-Right Card: Video Poker / Cases (Matches Cases treasure chest card in reference) */}
                    <div
                      onClick={() => handleQuickPlayGame('videopoker')}
                      className="lg:col-span-2 lg:row-span-1 rounded-3xl p-4 relative overflow-hidden cursor-pointer group border border-emerald-400/30 bg-gradient-to-br from-[#0c3b2e] via-[#092920] to-[#061712] shadow-lg flex flex-col justify-between min-h-[140px]"
                    >
                      <div className="relative z-10">
                        <h3 className="font-display text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                          Video Poker
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-200/75">
                          <Flame className="w-2.5 h-2.5 text-amber-400" />
                          <span>Velvet Originals</span>
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center justify-center gap-1 pt-2">
                        {['J♠', 'Q♠', 'K♠', 'A♠'].map((c, idx) => (
                          <div
                            key={idx}
                            className="w-7 h-10 rounded-md bg-gradient-to-b from-amber-100 to-white border border-amber-400 text-stone-950 font-extrabold text-[9px] flex flex-col items-center justify-between p-0.5 shadow"
                          >
                            <span>{c}</span>
                            <span className="text-[7px] bg-amber-400 px-0.5 rounded font-black">
                              800X
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* SECTION 2: TOP 1–5 PLAYER TABLES (Matches "Top Matches" 4-card row in reference image!) */}
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-amber-400" />
                      <h2 className="font-display text-sm font-bold text-white tracking-wide">
                        Top 1–5 Player Tables
                      </h2>
                      <span className="text-[11px] text-stone-400 font-medium">
                        (Solo or Invite up to 4 Friends)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCreateRoomOpen(true)}
                        className="px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold hover:bg-amber-400 hover:text-stone-950 transition-colors cursor-pointer"
                      >
                        + Create 1–5P Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedGameFilter('all')}
                        className="px-3 py-1 rounded-xl bg-[#0d1a14] border border-stone-800 text-[11px] font-bold text-stone-300 hover:text-white cursor-pointer"
                      >
                        See All ({rooms.length})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedGameFilter((prev) => (prev === 'all' ? 'plinko' : 'all'))
                        }
                        className="w-7 h-7 rounded-xl bg-[#0d1a14] border border-stone-800 flex items-center justify-center text-stone-400 hover:text-white cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedGameFilter((prev) => (prev === 'all' ? 'blackjack' : 'all'))
                        }
                        className="w-7 h-7 rounded-xl btn-arcade-gold flex items-center justify-center cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 4-Card Horizontal Match/Table Row matching reference "Top Matches" cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                    {filteredRooms.slice(0, 4).map((room) => {
                      const seatedPlayers = room.participants.filter((p) => p.role === 'player');
                      const spectatorsCount = room.participants.filter(
                        (p) => p.role === 'spectator'
                      ).length;
                      const gameInfo = GAME_CATALOG[room.gameType] || GAME_CATALOG.plinko;

                      return (
                        <div
                          key={room.id}
                          className="p-4 rounded-2xl bg-[#0c1712] border border-stone-800/90 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 shadow-md"
                        >
                          {/* Top Row: Game Title + LIVE red pill */}
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                <span className="text-xs font-extrabold text-white truncate">
                                  {gameInfo.title}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 ${
                                  room.isPrivate
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                    : 'bg-rose-500 text-white'
                                }`}
                              >
                                {room.isPrivate ? 'Private' : 'Live'}
                              </span>
                            </div>

                            <div className="text-[11px] text-stone-500 mt-1 truncate">
                              {room.name} • 1–5 Player Salon
                            </div>
                          </div>

                          {/* Middle Score / Seat Count & Players Block (Matches 3 / 6 score layout in reference) */}
                          <div className="flex items-center gap-3 py-1">
                            <div className="pr-3 border-r border-stone-800 flex flex-col items-center justify-center font-mono-tabular">
                              <span className="text-xs font-extrabold text-amber-300">
                                {seatedPlayers.length}
                              </span>
                              <span className="text-[10px] text-stone-500">5</span>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-200 truncate">
                                <span className="w-3.5 h-3.5 rounded-full bg-amber-400/20 border border-amber-400 text-[8px] flex items-center justify-center text-amber-300 shrink-0">
                                  H
                                </span>
                                <span className="truncate">{room.hostName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 truncate">
                                <span className="w-3.5 h-3.5 rounded-full bg-emerald-400/20 border border-emerald-400 text-[8px] flex items-center justify-center text-emerald-300 shrink-0">
                                  P
                                </span>
                                <span className="truncate">
                                  {seatedPlayers.length > 1
                                    ? `${seatedPlayers[1].displayName} +${Math.max(
                                        0,
                                        seatedPlayers.length - 2
                                      )}`
                                    : `${5 - seatedPlayers.length} Open VIP Seats`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Time / Min Wager Pill Row */}
                          <div className="flex items-center gap-2 text-[10px] text-stone-400">
                            <span className="font-mono-tabular">Min {room.minBet}</span>
                            <span className="px-2 py-0.5 rounded-md bg-[#07100c] border border-stone-800 text-stone-300 font-mono-tabular flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-amber-400" />
                              <span>{spectatorsCount} Watching</span>
                            </span>
                            {room.isPrivate && <Lock className="w-3 h-3 text-amber-400 ml-auto" />}
                          </div>

                          {/* Bottom 2-Column Odds/Action Boxes (Matches [ X1 25.1 | X2 0.71 ] in reference) */}
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleJoinRoomRequest(room.id, 'player')}
                              className="px-2.5 py-1.5 rounded-xl bg-[#07100c] hover:bg-amber-400 hover:text-stone-950 border border-stone-800 hover:border-amber-300 flex items-center justify-between text-[11px] transition-colors cursor-pointer group"
                            >
                              <span className="text-stone-500 group-hover:text-stone-900 font-bold">
                                SEAT
                              </span>
                              <span className="font-mono-tabular font-extrabold text-amber-300 group-hover:text-stone-950">
                                {seatedPlayers.length}/5
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleJoinRoomRequest(room.id, 'spectator')}
                              className="px-2.5 py-1.5 rounded-xl bg-[#07100c] hover:bg-emerald-500/20 border border-stone-800 hover:border-emerald-400/50 flex items-center justify-between text-[11px] transition-colors cursor-pointer"
                            >
                              <span className="text-stone-500 font-bold">WATCH</span>
                              <span className="font-mono-tabular font-extrabold text-white">
                                {gameInfo.maxMultiplier}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* SECTION 3: FEATURED PARLOR CABINETS (Matches "Top Slots" 6-column poster row with Play + Demo hover in reference!) */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Spade className="w-4 h-4 text-amber-400" />
                      <h2 className="font-display text-sm font-bold text-white tracking-wide">
                        Top Parlor Cabinets
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-400 hidden sm:inline mr-1">
                        Hover any cabinet for instant Play or Practice Demo
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickPlayGame('plinko')}
                        className="px-3 py-1 rounded-xl bg-[#0d1a14] border border-stone-800 text-[11px] font-bold text-stone-300 hover:text-white cursor-pointer"
                      >
                        See All
                      </button>
                    </div>
                  </div>

                  {/* 6 Poster Cards Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {[
                      {
                        id: 'plinko' as GameType,
                        badge: 'MIDAS DROP',
                        title: 'PLINKO 110X',
                        subtitle: 'GOLDEN PYRAMID',
                        bg: 'from-[#1a3a2a] via-[#0e2419] to-[#2c1f0b]',
                        accent: 'text-amber-300',
                        centerArt: '🔺',
                      },
                      {
                        id: 'roulette' as GameType,
                        badge: 'MONTE CARLO',
                        title: 'ROULETTE',
                        subtitle: '36X SINGLE ZERO',
                        bg: 'from-[#2e1216] via-[#170c0e] to-[#0a2118]',
                        accent: 'text-rose-300',
                        centerArt: '🎡',
                      },
                      {
                        id: 'slots' as GameType,
                        badge: 'OLYMPUS VAULT',
                        title: 'VELVET 777',
                        subtitle: '250X GRAND REELS',
                        bg: 'from-[#38230c] via-[#1f1408] to-[#0d1c15]',
                        accent: 'text-yellow-300',
                        centerArt: '🎰',
                      },
                      {
                        id: 'blackjack' as GameType,
                        badge: 'VIP SALON',
                        title: 'BLACKJACK',
                        subtitle: 'ROYAL 21 TABLE',
                        bg: 'from-[#0d2e22] via-[#081c15] to-[#1a160c]',
                        accent: 'text-emerald-300',
                        centerArt: '🃏',
                      },
                      {
                        id: 'videopoker' as GameType,
                        badge: 'ROYAL FLUSH',
                        title: 'VIDEO POKER',
                        subtitle: '800X JACKPOT',
                        bg: 'from-[#1f1633] via-[#120d1f] to-[#0b1f17]',
                        accent: 'text-amber-200',
                        centerArt: '👑',
                      },
                      {
                        id: 'dice' as GameType,
                        badge: 'HIGH ROLLER',
                        title: 'BRASS DICE',
                        subtitle: '98X PRECISION',
                        bg: 'from-[#122b22] via-[#0a1a14] to-[#291d0e]',
                        accent: 'text-emerald-200',
                        centerArt: '🎲',
                      },
                    ].map((poster) => (
                      <div
                        key={poster.id}
                        onClick={() => handleQuickPlayGame(poster.id, false)}
                        className={`group relative h-48 rounded-2xl overflow-hidden border border-amber-500/25 hover:border-amber-300 bg-gradient-to-b ${poster.bg} p-3 flex flex-col justify-between shadow-lg cursor-pointer transition-transform hover:-translate-y-1`}
                      >
                        {/* Top Miniature Badge */}
                        <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-stone-300">
                          <span>{poster.badge}</span>
                          <span className="font-mono-tabular text-amber-300">1–5P</span>
                        </div>

                        {/* Center Visual Emblem */}
                        <div className="my-auto flex flex-col items-center justify-center">
                          <div className="w-16 h-16 rounded-2xl bg-black/35 border border-amber-400/30 flex items-center justify-center text-4xl shadow-inner group-hover:scale-90 transition-transform">
                            {poster.centerArt}
                          </div>
                        </div>

                        {/* Bottom Stylized Arcade Title */}
                        <div className="text-center">
                          <div
                            className={`font-display text-sm font-black tracking-wide leading-tight ${poster.accent} drop-shadow`}
                          >
                            {poster.title}
                          </div>
                          <div className="text-[9px] font-extrabold uppercase tracking-widest text-stone-400 mt-0.5">
                            {poster.subtitle}
                          </div>
                        </div>

                        {/* Hover Overlay matching the Play + [ ▶ DEMO ] overlay on the 3rd slot card in reference image! */}
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2.5 p-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickPlayGame(poster.id, false);
                            }}
                            className="w-12 h-12 rounded-full btn-arcade-gold flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.6)] cursor-pointer"
                            title="Play Live Table"
                          >
                            <Play className="w-5 h-5 fill-stone-950 ml-0.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickPlayGame(poster.id, true);
                            }}
                            className="px-3 py-1 rounded-lg bg-white text-stone-950 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow cursor-pointer hover:bg-amber-200"
                          >
                            <Play className="w-2.5 h-2.5 fill-stone-950" />
                            <span>DEMO</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* SECTION 4: LIVE BET / LUCKY WINS / WHALE WINS TABLE (Matches bottom table in reference image) */}
                <section className="space-y-3 pt-1">
                  {/* Tabs Header */}
                  <div className="flex items-center gap-6 border-b border-stone-800/90 text-xs font-extrabold">
                    {[
                      { id: 'live' as const, label: 'Live Bet' },
                      { id: 'lucky' as const, label: 'Lucky Wins' },
                      { id: 'whale' as const, label: 'Whale Wins' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setLiveFeedTab(tab.id)}
                        className={`pb-2.5 relative transition-colors cursor-pointer ${
                          liveFeedTab === tab.id
                            ? 'text-white'
                            : 'text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        {tab.label}
                        {liveFeedTab === tab.id && (
                          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-400 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Table Rows */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[11px] font-semibold text-stone-500">
                          <th className="py-2 px-3">Game</th>
                          <th className="py-2 px-3">User</th>
                          <th className="py-2 px-3">Time</th>
                          <th className="py-2 px-3">Wager</th>
                          <th className="py-2 px-3">Multiplier</th>
                          <th className="py-2 px-3 text-right">Payout</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-stone-900">
                        {displayedFeedRows.slice(0, 6).map((row) => (
                          <tr
                            key={row.id}
                            className="bg-[#0b1611] hover:bg-[#0f1f18] transition-colors"
                          >
                            <td className="py-2.5 px-3 rounded-l-xl font-bold text-stone-200">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{row.gameTitle}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-white">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400 text-[9px] flex items-center justify-center text-amber-200 font-extrabold">
                                  {row.user.slice(0, 1).toUpperCase()}
                                </span>
                                <span>{row.user}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono-tabular text-stone-400">
                              {row.time}
                            </td>
                            <td className="py-2.5 px-3 font-mono-tabular font-bold text-white">
                              <div className="flex items-center gap-1.5">
                                <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-stone-950 text-[8px] flex items-center justify-center font-black">
                                  ★
                                </span>
                                <span>{row.wager.toFixed(2)}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono-tabular">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                                  row.multiplier >= 2
                                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                                    : 'bg-stone-800 text-stone-300'
                                }`}
                              >
                                {row.multiplier.toFixed(2)}x
                              </span>
                            </td>
                            <td className="py-2.5 px-3 rounded-r-xl font-mono-tabular font-extrabold text-right text-amber-300">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-stone-950 text-[8px] flex items-center justify-center font-black">
                                  ★
                                </span>
                                <span>{row.payout.toFixed(2)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              /* ACTIVE 1–5 PLAYER MULTIPLAYER TABLE VIEW */
              activeRoom && (
                <div
                  className={`rounded-3xl border-2 p-4 lg:p-5 space-y-4 shadow-2xl ${currentTableTheme.surfaceClass} ${currentTableTheme.borderClass}`}
                >
                  {/* Compact Table Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-800/90">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => sendWs('room:leave')}
                        className="btn-arcade-dark px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                        <span>Lobby</span>
                      </button>
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold uppercase">
                          <span>{GAME_CATALOG[activeRoom.gameType]?.title}</span>
                          <span>·</span>
                          <span>1–5 Player VIP Table</span>
                          <span>·</span>
                          <span>
                            {tableRole === 'spectator'
                              ? 'SPECTATING'
                              : isPracticeMode
                              ? 'PRACTICE DEMO'
                              : 'LIVE CHIPS'}
                          </span>
                        </div>
                        <h2 className="font-display text-base font-bold text-white leading-tight">
                          {activeRoom.name}
                        </h2>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          sendWs('room:join', {
                            roomId: activeRoom.id,
                            role: tableRole === 'player' ? 'spectator' : 'player',
                            bypassInvite: true,
                          })
                        }
                        className="btn-arcade-dark px-3 py-1.5 rounded-xl text-[11px] font-bold text-amber-200 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{tableRole === 'player' ? 'Spectate' : 'Take Seat'}</span>
                      </button>

                      <select
                        value={activeRoom.gameType}
                        onChange={(e) => handleQuickPlayGame(e.target.value as GameType)}
                        className="bg-[#07110d] border border-amber-500/40 rounded-xl px-3 py-1.5 text-[11px] font-bold text-amber-200 cursor-pointer"
                      >
                        {Object.values(GAME_CATALOG).map((g) => (
                          <option key={g.id} value={g.id}>
                            Switch Game: {g.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dedicated 5-Seat VIP Table Strip (Seats 1 to 5) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#060f0b] border border-amber-500/25 rounded-2xl p-2.5">
                    {Array.from({ length: 5 }).map((_, seatIdx) => {
                      const seatedPlayers = activeRoom.participants.filter(
                        (p) => p.role === 'player'
                      );
                      const occupant = seatedPlayers[seatIdx];
                      const otherOnline = onlinePlayers.find(
                        (p) =>
                          p.uid !== profile.uid &&
                          !seatedPlayers.some((sp) => sp.uid === p.uid)
                      );

                      return (
                        <div
                          key={seatIdx}
                          className={`px-3 py-2 rounded-xl border flex flex-col justify-between ${
                            occupant
                              ? occupant.uid === profile.uid
                                ? 'bg-amber-400/15 border-amber-400'
                                : 'bg-emerald-950/50 border-emerald-500/40'
                              : 'bg-black/30 border-dashed border-stone-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono-tabular font-bold text-amber-300">
                              SEAT {seatIdx + 1}
                            </span>
                            {occupant && (
                              <span className="font-mono-tabular text-stone-400">
                                L{occupant.level}
                              </span>
                            )}
                          </div>

                          {occupant ? (
                            <div className="mt-0.5">
                              <div className="text-xs font-extrabold text-white truncate">
                                {occupant.displayName}
                              </div>
                              <div className="text-[10px] text-emerald-300 font-mono-tabular truncate">
                                {occupant.lastAction || 'Seated'}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-0.5 flex items-center justify-between">
                              <span className="text-[10px] text-stone-500">Open</span>
                              {otherOnline && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    sendWs('social:invite', {
                                      recipientId: otherOnline.uid,
                                      roomId: activeRoom.id,
                                    });
                                    showTempNotice(
                                      `Invited ${otherOnline.displayName} to Seat ${seatIdx + 1}!`
                                    );
                                  }}
                                  className="text-[10px] font-bold text-amber-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  <UserPlus className="w-2.5 h-2.5" />
                                  <span>Invite</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Playable Game Component */}
                  {activeRoom.gameType === 'plinko' && (
                    <PlinkoGame
                      balance={effectiveBalance}
                      isPractice={isPracticeMode}
                      isSpectator={tableRole === 'spectator'}
                      chipTheme={profile.chipTheme}
                      minBet={activeRoom.minBet}
                      recentActivity={activeRoom.recentActivity}
                      onCompleteRound={handleCompleteRound}
                    />
                  )}
                  {activeRoom.gameType === 'blackjack' && (
                    <BlackjackGame
                      balance={effectiveBalance}
                      isPractice={isPracticeMode}
                      isSpectator={tableRole === 'spectator'}
                      minBet={activeRoom.minBet}
                      onCompleteRound={handleCompleteRound}
                    />
                  )}
                  {activeRoom.gameType === 'roulette' && (
                    <RouletteGame
                      balance={effectiveBalance}
                      isPractice={isPracticeMode}
                      isSpectator={tableRole === 'spectator'}
                      minBet={activeRoom.minBet}
                      onCompleteRound={handleCompleteRound}
                    />
                  )}
                  {activeRoom.gameType === 'slots' && (
                    <SlotsGame
                      balance={effectiveBalance}
                      isPractice={isPracticeMode}
                      isSpectator={tableRole === 'spectator'}
                      minBet={activeRoom.minBet}
                      onCompleteRound={handleCompleteRound}
                    />
                  )}
                  {activeRoom.gameType === 'videopoker' && (
                    <VideoPokerGame
                      balance={effectiveBalance}
                      isPractice={isPracticeMode}
                      isSpectator={tableRole === 'spectator'}
                      minBet={activeRoom.minBet}
                      onCompleteRound={handleCompleteRound}
                    />
                  )}
                  {activeRoom.gameType === 'dice' && (
                    <DiceGame
                      balance={effectiveBalance}
                      isPractice={isPracticeMode}
                      isSpectator={tableRole === 'spectator'}
                      minBet={activeRoom.minBet}
                      onCompleteRound={handleCompleteRound}
                    />
                  )}
                </div>
              )
            )}
          </div>
        </main>

        {/* Right Persistent Docked Online Chat & 1-5 Party Sidebar */}
        <SocialSidebar
          currentUser={profile}
          onlinePlayers={onlinePlayers}
          connections={connections}
          rooms={rooms}
          activeRoom={activeRoom}
          chatMessages={chatMessages}
          onSendChat={(text) =>
            sendWs('room:chat', {
              roomId: activeRoom ? activeRoom.id : 'lobby',
              text,
            })
          }
          onSendReaction={(emoji) =>
            sendWs('room:reaction', {
              roomId: activeRoom ? activeRoom.id : 'lobby',
              emoji,
            })
          }
          onAddFriend={handleAddFriend}
          onRemoveFriend={handleRemoveFriend}
          onInvitePlayer={(recipientId) => {
            const targetRoomId = activeRoom ? activeRoom.id : 'room_plinko_main';
            sendWs('social:invite', { recipientId, roomId: targetRoomId });
            showTempNotice('Invitation sent to player!');
          }}
          onJoinRoom={(roomId, role) => handleJoinRoomRequest(roomId, role)}
          socialNotice={socialNotice}
        />
      </div>

      {/* Private Room Passcode Prompt Modal */}
      {passwordPromptRoom && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#111c17] border-2 border-amber-500/40 rounded-2xl w-full max-w-sm p-5 space-y-3.5">
            <h3 className="font-display text-sm font-bold text-amber-200">
              Enter Private Table Passcode
            </h3>
            <p className="text-xs text-stone-400">
              "{passwordPromptRoom.room.name}" is locked by {passwordPromptRoom.room.hostName}.
            </p>
            <input
              type="text"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Room passcode..."
              className="w-full bg-[#0b1310] border border-stone-700 rounded-lg px-3 py-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordPromptRoom(null)}
                className="btn-arcade-dark px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  sendWs('room:join', {
                    roomId: passwordPromptRoom.room.id,
                    role: passwordPromptRoom.role,
                    password: passwordInput,
                  });
                  setPasswordPromptRoom(null);
                }}
                className="btn-arcade-gold px-3.5 py-1.5 rounded-lg font-extrabold text-xs cursor-pointer"
              >
                Unlock Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10-Second Brass Vault Combination Puzzle Modal for +1,500 Free Chips */}
      <VaultPuzzleModal
        isOpen={puzzleModalOpen}
        onClose={() => setPuzzleModalOpen(false)}
        onSuccessClaim={() => {
          sendWs('economy:claim_allowance');
          showTempNotice('Vault Cracked! +1,500 Free Virtual Chips added to your bankroll!');
        }}
      />

      {/* Vault, Progression, Cosmetics & Ledger Modal */}
      <VaultProgressionModal
        isOpen={vaultModalOpen}
        initialSection={vaultSection}
        profile={profile}
        transactions={transactions}
        firebaseAuthStatus={firebaseAuthStatus}
        onClose={() => setVaultModalOpen(false)}
        onClaimDaily={() => {
          sendWs('economy:claim_daily');
          showTempNotice('Daily login reward claimed!');
        }}
        onClaimAllowance={() => {
          setVaultModalOpen(false);
          setPuzzleModalOpen(true);
        }}
        onUpdateCustomization={handleUpdateCustomization}
        onSignInGoogle={async () => {
          try {
            await signInWithPopup(auth, googleProvider);
            showTempNotice('Linked with Google Account for cloud backup.');
          } catch {
            showTempNotice('Google Sign-In popup closed.');
          }
        }}
        onRetryAnonymousAuth={async () => {
          try {
            await signInAnonymously(auth);
            showTempNotice('Firebase Anonymous Authentication connected!');
          } catch {
            showTempNotice(
              'Please enable Anonymous Sign-In under Firebase Console > Authentication > Sign-in method first.'
            );
          }
        }}
      />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={createRoomOpen}
        defaultName={profile.displayName}
        onClose={() => setCreateRoomOpen(false)}
        onCreateRoom={(config) => sendWs('room:create', config)}
      />
    </div>
  );
}
