export type GameType = 'plinko' | 'blackjack' | 'roulette' | 'slots' | 'videopoker' | 'dice';

export type ChipThemeId =
  | 'classic-brass'
  | 'obsidian-gold'
  | 'emerald-royale'
  | 'crimson-velvet'
  | 'cyber-platinum';

export type TableThemeId =
  | 'emerald-felt'
  | 'mahogany-club'
  | 'midnight-velvet'
  | 'royal-burgundy';

export type PresenceStatus = 'online' | 'in-game' | 'spectating' | 'offline';

export interface PlayerProfileData {
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

export interface ChipTransactionItem {
  id: string;
  uid: string;
  type: 'wager' | 'payout' | 'daily-reward' | 'allowance' | 'achievement-bonus' | 'starting-balance';
  game: string;
  amount: number;
  balanceAfter: number;
  summary: string;
  createdAt: string;
}

export interface PlayerConnectionItem {
  uid: string;
  targetUid: string;
  targetName: string;
  relationType: 'friend' | 'recent';
  lastPlayedGame: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomParticipant {
  uid: string;
  displayName: string;
  level: number;
  chipTheme: ChipThemeId;
  role: 'player' | 'spectator';
  lastAction?: string;
  lastPayout?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface EmojiReactionEvent {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  emoji: string;
  xOffset: number;
  timestamp: number;
}

export interface TableActivityEvent {
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

export interface MultiplayerRoom {
  id: string;
  hostId: string;
  hostName: string;
  name: string;
  gameType: GameType;
  isPrivate: boolean;
  minBet: number;
  status: 'open' | 'playing' | 'closed';
  participants: RoomParticipant[];
  recentActivity: TableActivityEvent[];
  createdAt: string;
}

export interface DirectInvitation {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  roomId: string;
  roomName: string;
  gameType: GameType;
  isPrivate: boolean;
  password?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardChips: number;
  rewardXp: number;
  unlocksCosmetic?: {
    type: 'chip' | 'table';
    id: ChipThemeId | TableThemeId;
    label: string;
  };
}

export const GAME_CATALOG: Record<
  GameType,
  {
    id: GameType;
    title: string;
    subtitle: string;
    edgeLabel: string;
    maxMultiplier: string;
    minWager: number;
  }
> = {
  plinko: {
    id: 'plinko',
    title: 'Plinko Pyramid',
    subtitle: 'Multi-row brass peg physics drop with customizable risk multipliers',
    edgeLabel: '8–16 Rows · Low/Med/High Risk',
    maxMultiplier: '110x',
    minWager: 25,
  },
  blackjack: {
    id: 'blackjack',
    title: 'Parlor Blackjack',
    subtitle: 'Six-deck shoe · Dealer stands on soft 17 · Natural Blackjack pays 3:2',
    edgeLabel: 'Hit · Stand · Double Down',
    maxMultiplier: '2.5x',
    minWager: 50,
  },
  roulette: {
    id: 'roulette',
    title: 'Monte Carlo Roulette',
    subtitle: 'European single-zero wheel with straight, dozen, and outside wagers',
    edgeLabel: 'Single Zero · 37 Pockets',
    maxMultiplier: '36x',
    minWager: 25,
  },
  slots: {
    id: 'slots',
    title: 'Velvet Brass Reels',
    subtitle: '5-reel mechanical parlor slot with wild crowns and scatter multipliers',
    edgeLabel: '9 Paylines · Wild Multipliers',
    maxMultiplier: '250x',
    minWager: 20,
  },
  videopoker: {
    id: 'videopoker',
    title: 'Jacks or Better Poker',
    subtitle: 'Classic 5-card draw video poker with full Royal Flush 800x paytable',
    edgeLabel: '9/6 Paytable · Hold & Draw',
    maxMultiplier: '800x',
    minWager: 25,
  },
  dice: {
    id: 'dice',
    title: 'Brass High-Roller Dice',
    subtitle: 'Precision Over/Under target slider and classic 2D6 parlor craps bets',
    edgeLabel: 'Dynamic Odds · Instant Roll',
    maxMultiplier: '98x',
    minWager: 10,
  },
};

export const CHIP_THEMES: Record<
  ChipThemeId,
  {
    id: ChipThemeId;
    name: string;
    description: string;
    primaryHex: string;
    accentHex: string;
    ringClass: string;
    bgClass: string;
    requiredLevel: number;
  }
> = {
  'classic-brass': {
    id: 'classic-brass',
    name: 'Classic Brass',
    description: 'Standard house mint brushed brass & ivory',
    primaryHex: '#d4af37',
    accentHex: '#fef3c7',
    ringClass: 'border-amber-400/80 text-amber-200',
    bgClass: 'bg-amber-950/90',
    requiredLevel: 1,
  },
  'emerald-royale': {
    id: 'emerald-royale',
    name: 'Emerald Royale',
    description: 'Deep Monte Carlo emerald with gold filigree',
    primaryHex: '#10b981',
    accentHex: '#a7f3d0',
    ringClass: 'border-emerald-400/80 text-emerald-200',
    bgClass: 'bg-emerald-950/90',
    requiredLevel: 2,
  },
  'crimson-velvet': {
    id: 'crimson-velvet',
    name: 'Crimson Velvet',
    description: 'High-stakes burgundy & rose-gold trim',
    primaryHex: '#f43f5e',
    accentHex: '#fecdd3',
    ringClass: 'border-rose-400/80 text-rose-200',
    bgClass: 'bg-rose-950/90',
    requiredLevel: 3,
  },
  'obsidian-gold': {
    id: 'obsidian-gold',
    name: 'Obsidian Sovereign',
    description: 'Matte black onyx core with 24k gold rim',
    primaryHex: '#f59e0b',
    accentHex: '#fde68a',
    ringClass: 'border-yellow-400 text-yellow-100',
    bgClass: 'bg-stone-950',
    requiredLevel: 5,
  },
  'cyber-platinum': {
    id: 'cyber-platinum',
    name: 'Tokyo Platinum',
    description: 'Ginza VIP lounge brushed silver & champagne',
    primaryHex: '#e2e8f0',
    accentHex: '#f8fafc',
    ringClass: 'border-slate-300 text-slate-100',
    bgClass: 'bg-slate-900',
    requiredLevel: 8,
  },
};

export const TABLE_THEMES: Record<
  TableThemeId,
  {
    id: TableThemeId;
    name: string;
    description: string;
    surfaceClass: string;
    borderClass: string;
    accentText: string;
    requiredLevel: number;
  }
> = {
  'emerald-felt': {
    id: 'emerald-felt',
    name: 'Monte Carlo Emerald',
    description: 'Traditional deep forest baize with mahogany rail',
    surfaceClass: 'bg-[#0e231c]',
    borderClass: 'border-[#284b3e]',
    accentText: 'text-emerald-300',
    requiredLevel: 1,
  },
  'mahogany-club': {
    id: 'mahogany-club',
    name: 'Warm Mahogany Parlor',
    description: 'Rich walnut & espresso timber club table',
    surfaceClass: 'bg-[#1f1410]',
    borderClass: 'border-[#4a3228]',
    accentText: 'text-amber-300',
    requiredLevel: 2,
  },
  'midnight-velvet': {
    id: 'midnight-velvet',
    name: 'Midnight Obsidian',
    description: 'Nocturnal charcoal velvet with brass inlay',
    surfaceClass: 'bg-[#12161f]',
    borderClass: 'border-[#2d3648]',
    accentText: 'text-amber-200',
    requiredLevel: 4,
  },
  'royal-burgundy': {
    id: 'royal-burgundy',
    name: 'Imperial Burgundy',
    description: 'Private salon crimson felt with antique gold trim',
    surfaceClass: 'bg-[#231016]',
    borderClass: 'border-[#4d2531]',
    accentText: 'text-rose-200',
    requiredLevel: 6,
  },
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-wager',
    title: 'Parlor Debut',
    description: 'Complete your first live round on any parlor table',
    rewardChips: 500,
    rewardXp: 100,
  },
  {
    id: 'plinko-high-drop',
    title: 'Gravity Defier',
    description: 'Hit a 10x or higher multiplier pocket in Plinko',
    rewardChips: 1500,
    rewardXp: 250,
    unlocksCosmetic: {
      type: 'chip',
      id: 'emerald-royale',
      label: 'Emerald Royale Chips',
    },
  },
  {
    id: 'blackjack-natural',
    title: 'Velvet Twenty-One',
    description: 'Win a hand of Parlor Blackjack',
    rewardChips: 1000,
    rewardXp: 200,
    unlocksCosmetic: {
      type: 'table',
      id: 'mahogany-club',
      label: 'Warm Mahogany Parlor Felt',
    },
  },
  {
    id: 'high-roller-win',
    title: 'Monte Carlo High-Roller',
    description: 'Win 2,500 or more virtual chips in a single round',
    rewardChips: 2500,
    rewardXp: 400,
    unlocksCosmetic: {
      type: 'chip',
      id: 'obsidian-gold',
      label: 'Obsidian Sovereign Chips',
    },
  },
  {
    id: 'social-host',
    title: 'Table Host',
    description: 'Create or join a multiplayer room or add a friend',
    rewardChips: 1000,
    rewardXp: 200,
    unlocksCosmetic: {
      type: 'table',
      id: 'midnight-velvet',
      label: 'Midnight Obsidian Felt',
    },
  },
  {
    id: 'veteran-10',
    title: 'Club Regular',
    description: 'Play 10 rounds across the parlor floor',
    rewardChips: 2000,
    rewardXp: 350,
    unlocksCosmetic: {
      type: 'chip',
      id: 'crimson-velvet',
      label: 'Crimson Velvet Chips',
    },
  },
];

export const SEASONAL_REWARDS = [
  { tier: 1, xpRequired: 0, title: 'Autumn Initiate Crest', chips: 500, cosmeticLabel: 'Classic Brass Mint' },
  { tier: 2, xpRequired: 250, title: 'Brass Peg Stipend', chips: 1200, cosmeticLabel: 'Emerald Royale Unlock' },
  { tier: 3, xpRequired: 600, title: 'Velvet Salon Grant', chips: 2500, cosmeticLabel: 'Mahogany Club Table' },
  { tier: 4, xpRequired: 1200, title: 'High-Roller Reserve', chips: 5000, cosmeticLabel: 'Obsidian Sovereign Trim' },
  { tier: 5, xpRequired: 2500, title: 'Monte Carlo Grand Patron', chips: 12000, cosmeticLabel: 'Tokyo Platinum Mint' },
];
