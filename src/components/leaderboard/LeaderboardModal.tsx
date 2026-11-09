import React, { useState, useEffect } from 'react';
import {
  PlayerProfileData,
  LeaderboardCategory,
  LeaderboardEntry,
  PlayerEstateData,
  ESTATE_TIERS,
} from '../../types/casino';
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Search,
  X,
  TrendingUp,
  Building,
  Coins,
  Shield,
  Star,
  Users,
} from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PlayerProfileData;
  userEstate: PlayerEstateData;
  onlinePlayers: PlayerProfileData[];
}

// Fallback high-society parlor legends if server offline
const SEEDED_PARLOR_LEGENDS: LeaderboardEntry[] = [
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
  {
    uid: 'legend_7',
    displayName: 'Mademoiselle Solange',
    chips: 450000,
    biggestWin: 120000,
    level: 14,
    xp: 7100,
    gamesPlayed: 44,
    estateTier: 'speakeasy',
    estateTierName: 'Victorian Speakeasy Suite',
    estatePrestige: 2800,
    chipTheme: 'emerald-royale',
    tableTheme: 'royal-burgundy',
  },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userEstate,
  onlinePlayers,
}) => {
  const [category, setCategory] = useState<LeaderboardCategory>('chips');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [remoteEntries, setRemoteEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/api/leaderboard?category=${category}`)
      .then((res) => {
        if (!res.ok) throw new Error('API offline');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data.entries)) {
          setRemoteEntries(data.entries);
        }
      })
      .catch(() => {
        // Fallback to local combined entries
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, category]);

  if (!isOpen) return null;

  // Build combined list including current user, online players, and legends
  const userEntry: LeaderboardEntry = {
    uid: currentUser.uid,
    displayName: `${currentUser.displayName} (You)`,
    chips: currentUser.chips,
    biggestWin: currentUser.biggestWin,
    level: currentUser.level,
    xp: currentUser.xp,
    gamesPlayed: currentUser.gamesPlayed,
    estateTier: userEstate.tier,
    estateTierName: ESTATE_TIERS[userEstate.tier]?.name || 'Victorian Speakeasy',
    estatePrestige: userEstate.totalPrestige,
    chipTheme: currentUser.chipTheme,
    tableTheme: currentUser.tableTheme,
    isCurrentUser: true,
  };

  const poolMap = new Map<string, LeaderboardEntry>();

  // Add legends
  SEEDED_PARLOR_LEGENDS.forEach((item) => poolMap.set(item.uid, item));

  // Add remote entries if returned
  remoteEntries.forEach((item) => poolMap.set(item.uid, item));

  // Add online human players
  onlinePlayers.forEach((p) => {
    if (p.uid === currentUser.uid) return;
    poolMap.set(p.uid, {
      uid: p.uid,
      displayName: p.displayName,
      chips: p.chips,
      biggestWin: p.biggestWin,
      level: p.level,
      xp: p.xp,
      gamesPlayed: p.gamesPlayed,
      estateTier: 'penthouse',
      estateTierName: 'Velvet Penthouse',
      estatePrestige: p.level * 250,
      chipTheme: p.chipTheme,
      tableTheme: p.tableTheme,
    });
  });

  // Add current user
  poolMap.set(currentUser.uid, userEntry);

  const allEntries = Array.from(poolMap.values());

  // Sort based on category
  allEntries.sort((a, b) => {
    if (category === 'chips') return b.chips - a.chips;
    if (category === 'biggestWin') return b.biggestWin - a.biggestWin;
    if (category === 'estate') return b.estatePrestige - a.estatePrestige;
    if (category === 'level') return b.level !== a.level ? b.level - a.level : b.xp - a.xp;
    return 0;
  });

  // Assign ranks
  const rankedEntries = allEntries.map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Find user's rank
  const myRanking = rankedEntries.find((item) => item.uid === currentUser.uid);

  // Filter by search query
  const filteredEntries = rankedEntries.filter((item) =>
    item.displayName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const top3 = filteredEntries.slice(0, 3);
  const remaining = filteredEntries.slice(3);

  const getMetricValue = (entry: LeaderboardEntry) => {
    if (category === 'chips') return `${entry.chips.toLocaleString()} Chips`;
    if (category === 'biggestWin') return `${entry.biggestWin.toLocaleString()} Chips`;
    if (category === 'estate') return `${entry.estatePrestige.toLocaleString()} Prestige`;
    if (category === 'level') return `Level ${entry.level} (${entry.xp.toLocaleString()} XP)`;
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0e1713] border-2 border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-800 bg-[#09100d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black text-amber-200">
                High-Society Parlor Leaderboard
              </h2>
              <p className="text-xs text-stone-400">
                Live rankings across Net Worth, High-Roller Wins, Grand Estates & Club Levels.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs & Search Bar */}
        <div className="px-6 py-3.5 border-b border-stone-800 bg-[#0b1410] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'chips' as const, label: 'Net Worth', icon: Coins },
              { id: 'biggestWin' as const, label: 'Highest Payout', icon: TrendingUp },
              { id: 'estate' as const, label: 'Estate Prestige', icon: Building },
              { id: 'level' as const, label: 'Club Level', icon: Star },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    category === tab.id
                      ? 'btn-arcade-gold shadow'
                      : 'bg-stone-900/80 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Search patron alias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-900/90 border border-stone-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* User Standing Sticky Highlight */}
        {myRanking && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/25 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <span className="font-bold text-amber-300">Your Current Standing:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black">
                Rank #{myRanking.rank}
              </span>
              <span className="text-stone-400">({myRanking.displayName})</span>
            </div>
            <div className="font-mono-tabular font-bold text-amber-200">
              {getMetricValue(myRanking)}
            </div>
          </div>
        )}

        {/* Podium (Top 3) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {top3.length > 0 && searchQuery.trim() === '' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
              {/* Rank 2 (Silver) */}
              {top3[1] && (
                <div className="order-2 md:order-1 p-4 rounded-2xl bg-gradient-to-b from-[#161c1a] to-[#0c1310] border border-slate-400/40 text-center shadow-lg relative">
                  <div className="w-9 h-9 rounded-full bg-slate-300 text-stone-950 font-black flex items-center justify-center mx-auto mb-2 text-sm shadow">
                    2
                  </div>
                  <div className="font-bold text-sm text-white truncate">{top3[1].displayName}</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{top3[1].estateTierName}</div>
                  <div className="font-mono-tabular font-black text-amber-300 mt-2 text-base">
                    {getMetricValue(top3[1])}
                  </div>
                </div>
              )}

              {/* Rank 1 (Gold Crown) */}
              {top3[0] && (
                <div className="order-1 md:order-2 p-5 rounded-2xl bg-gradient-to-b from-[#241f10] via-[#1a170b] to-[#0c120e] border-2 border-amber-400 text-center shadow-xl relative -translate-y-1">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-stone-950 px-3 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow">
                    <Crown className="w-3 h-3 text-stone-950 fill-stone-950" />
                    <span>SOVEREIGN #1</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-stone-950 font-black flex items-center justify-center mx-auto mb-2 text-lg shadow-md border-2 border-amber-200">
                    👑
                  </div>
                  <div className="font-black text-base text-amber-200 truncate">{top3[0].displayName}</div>
                  <div className="text-xs text-amber-300/80 mt-0.5">{top3[0].estateTierName}</div>
                  <div className="font-mono-tabular font-black text-white mt-2 text-lg">
                    {getMetricValue(top3[0])}
                  </div>
                </div>
              )}

              {/* Rank 3 (Bronze) */}
              {top3[2] && (
                <div className="order-3 p-4 rounded-2xl bg-gradient-to-b from-[#1b1511] to-[#0c1310] border border-amber-700/40 text-center shadow-lg relative">
                  <div className="w-9 h-9 rounded-full bg-amber-700 text-amber-100 font-black flex items-center justify-center mx-auto mb-2 text-sm shadow">
                    3
                  </div>
                  <div className="font-bold text-sm text-white truncate">{top3[2].displayName}</div>
                  <div className="text-[11px] text-amber-600 mt-0.5">{top3[2].estateTierName}</div>
                  <div className="font-mono-tabular font-black text-amber-300 mt-2 text-base">
                    {getMetricValue(top3[2])}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Rankings Table */}
          <div className="bg-[#09110d] border border-stone-800 rounded-2xl overflow-hidden shadow">
            <div className="px-4 py-3 bg-[#060c09] border-b border-stone-800 grid grid-cols-12 text-[11px] font-extrabold text-stone-400 uppercase tracking-wider">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5">Patron / VIP Estate</div>
              <div className="col-span-3 text-right">Standing Metric</div>
              <div className="col-span-3 text-right">Level & Games</div>
            </div>

            <div className="divide-y divide-stone-800/80">
              {filteredEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500">
                  No patrons found matching your search.
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const isTop = (entry.rank || 0) <= 3;
                  return (
                    <div
                      key={entry.uid}
                      className={`px-4 py-3 grid grid-cols-12 items-center text-xs transition-colors ${
                        entry.isCurrentUser
                          ? 'bg-amber-500/15 font-semibold text-white'
                          : 'hover:bg-stone-900/40 text-stone-300'
                      }`}
                    >
                      {/* Rank Number */}
                      <div className="col-span-1 text-center font-mono-tabular font-black">
                        {entry.rank === 1 ? (
                          <span className="text-amber-400 text-sm">🥇</span>
                        ) : entry.rank === 2 ? (
                          <span className="text-slate-300 text-sm">🥈</span>
                        ) : entry.rank === 3 ? (
                          <span className="text-amber-600 text-sm">🥉</span>
                        ) : (
                          <span className="text-stone-400">#{entry.rank}</span>
                        )}
                      </div>

                      {/* Patron Name & Estate */}
                      <div className="col-span-5 flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-full bg-stone-800 border border-amber-500/30 flex items-center justify-center text-xs shrink-0">
                          {entry.rank === 1 ? '👑' : '♠'}
                        </div>
                        <div className="truncate">
                          <div className="font-bold truncate flex items-center gap-1.5">
                            <span className={entry.isCurrentUser ? 'text-amber-300' : 'text-stone-100'}>
                              {entry.displayName}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="text-[10px] bg-amber-400 text-stone-950 font-black px-1.5 py-0.2 rounded">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-500 truncate">{entry.estateTierName}</div>
                        </div>
                      </div>

                      {/* Standing Metric Value */}
                      <div className="col-span-3 text-right font-mono-tabular font-extrabold text-amber-300">
                        {getMetricValue(entry)}
                      </div>

                      {/* Level & Played */}
                      <div className="col-span-3 text-right text-[11px] text-stone-400 font-mono-tabular">
                        Level {entry.level} · {entry.gamesPlayed} rds
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
