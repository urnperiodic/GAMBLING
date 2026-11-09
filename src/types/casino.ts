export type GameType =
  | 'plinko'
  | 'blackjack'
  | 'roulette'
  | 'slots'
  | 'videopoker'
  | 'dice'
  | 'holdem'
  | 'threecardpoker';

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
  holdem: {
    id: 'holdem',
    title: "Texas Hold'em Salon",
    subtitle: 'High-stakes community card poker · Flop, Turn, River vs parlor high-rollers',
    edgeLabel: 'No-Limit Stakes · Full Hand Showdown',
    maxMultiplier: 'Pot x4',
    minWager: 50,
  },
  threecardpoker: {
    id: 'threecardpoker',
    title: 'Three Card Poker Club',
    subtitle: 'Fast table poker vs Dealer · Ante, Play, and Pair Plus bonus bets up to 40:1',
    edgeLabel: 'Pair Plus 40:1 · Dealer Qualifies Q+',
    maxMultiplier: '45x',
    minWager: 25,
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

export type EstateTierId = 'speakeasy' | 'penthouse' | 'villa' | 'chateau' | 'palace';

export type EstateDecorationCategory =
  | 'seating'
  | 'lighting'
  | 'entertainment'
  | 'treasury'
  | 'flooring'
  | 'view';

export interface EstateTierDef {
  id: EstateTierId;
  name: string;
  tagline: string;
  description: string;
  upgradeCostChips: number;
  upgradeCostGoldBars: number;
  prestigePoints: number;
  baseDividendRatePerHour: number; // passive virtual chip yield
  maxEquippedDecorations: number;
  bgGradient: string;
  borderColor: string;
  accentBadge: string;
}

export interface EstateDecorationDef {
  id: string;
  category: EstateDecorationCategory;
  name: string;
  iconName: string;
  description: string;
  costChips: number;
  costGoldBars: number;
  prestigeBonus: number;
  dividendBonusPerHour: number; // bonus virtual chips per hour
  requiredTier: EstateTierId;
  visualSlot: 'main' | 'floor' | 'wall' | 'ceiling' | 'window' | 'desk';
}

export interface PlayerEstateData {
  tier: EstateTierId;
  goldBars: number; // Prestige Bullion (1 Gold Bar = 25,000 chips)
  unlockedDecorations: string[];
  equippedDecorations: Record<string, string>; // category -> decorId
  totalPrestige: number;
  lastDividendClaim: string; // ISO string
  totalDividendsCollected: number;
}

export type LeaderboardCategory = 'chips' | 'biggestWin' | 'estate' | 'level';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  chips: number;
  biggestWin: number;
  level: number;
  xp: number;
  gamesPlayed: number;
  estateTier: EstateTierId;
  estateTierName: string;
  estatePrestige: number;
  chipTheme: ChipThemeId;
  tableTheme: TableThemeId;
  rank?: number;
  isCurrentUser?: boolean;
}

export const ESTATE_TIERS: Record<EstateTierId, EstateTierDef> = {
  speakeasy: {
    id: 'speakeasy',
    name: 'Victorian Speakeasy Suite',
    tagline: 'Cozy Underground Club Haven',
    description: 'A discreet cellar parlor with exposed red brick, amber gaslights, and leather wingback chairs.',
    upgradeCostChips: 0,
    upgradeCostGoldBars: 0,
    prestigePoints: 250,
    baseDividendRatePerHour: 250,
    maxEquippedDecorations: 3,
    bgGradient: 'from-[#1c120c] via-[#100a07] to-[#080503]',
    borderColor: 'border-amber-700/40',
    accentBadge: 'bg-amber-900/60 text-amber-200 border-amber-600/50',
  },
  penthouse: {
    id: 'penthouse',
    name: 'Velvet & Brass Penthouse',
    tagline: 'High-Rise Art Deco Residence',
    description: 'Floor-to-ceiling glass panoramic skyline view, polished brass balustrades, and private cocktail bar.',
    upgradeCostChips: 50000,
    upgradeCostGoldBars: 2,
    prestigePoints: 1200,
    baseDividendRatePerHour: 800,
    maxEquippedDecorations: 6,
    bgGradient: 'from-[#1e1a0f] via-[#120f08] to-[#080705]',
    borderColor: 'border-amber-500/50',
    accentBadge: 'bg-amber-500/25 text-amber-300 border-amber-400/40',
  },
  villa: {
    id: 'villa',
    name: 'Monte Carlo Riviera Villa',
    tagline: 'Mediterranean Coastal Sanctuary',
    description: 'Sun-drenched marble terrace overlooking the azure yacht harbor, olive trees, and private gaming cabana.',
    upgradeCostChips: 200000,
    upgradeCostGoldBars: 8,
    prestigePoints: 3500,
    baseDividendRatePerHour: 2200,
    maxEquippedDecorations: 8,
    bgGradient: 'from-[#0b241c] via-[#071611] to-[#040d0a]',
    borderColor: 'border-emerald-500/50',
    accentBadge: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40',
  },
  chateau: {
    id: 'chateau',
    name: 'High-Roller Gilded Chateau',
    tagline: 'Bordeaux Grand Wine & Gaming Estate',
    description: 'Baroque crystal chandeliers, vaulted fresco ceilings, manicured hedge labyrinths, and private chip mint.',
    upgradeCostChips: 750000,
    upgradeCostGoldBars: 30,
    prestigePoints: 10000,
    baseDividendRatePerHour: 6000,
    maxEquippedDecorations: 10,
    bgGradient: 'from-[#2b101b] via-[#1a070f] to-[#0c0307]',
    borderColor: 'border-rose-500/60',
    accentBadge: 'bg-rose-500/25 text-rose-300 border-rose-400/40',
  },
  palace: {
    id: 'palace',
    name: 'Celestial Sovereign Palace',
    tagline: 'Crown Zenith of World High Rollers',
    description: 'An architectural marvel perched high above the clouds with 24k gold leaf columns, glass observatory dome, and diamond fountains.',
    upgradeCostChips: 2500000,
    upgradeCostGoldBars: 100,
    prestigePoints: 35000,
    baseDividendRatePerHour: 18000,
    maxEquippedDecorations: 12,
    bgGradient: 'from-[#171c2b] via-[#0d101a] to-[#06080e]',
    borderColor: 'border-cyan-400/60',
    accentBadge: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/40',
  },
};

export const ESTATE_DECORATIONS: EstateDecorationDef[] = [
  // Seating
  {
    id: 'chesterfield_sofa',
    category: 'seating',
    name: 'Antique Velvet Chesterfield',
    iconName: 'Armchair',
    description: 'Deep button-tufted emerald velvet sofa with polished brass studs.',
    costChips: 10000,
    costGoldBars: 0,
    prestigeBonus: 250,
    dividendBonusPerHour: 150,
    requiredTier: 'speakeasy',
    visualSlot: 'main',
  },
  {
    id: 'leather_club_chairs',
    category: 'seating',
    name: 'Handcrafted Leather Club Chairs',
    iconName: 'Coffee',
    description: 'Cognac Italian saddle leather armchairs paired with a dark walnut humidor table.',
    costChips: 25000,
    costGoldBars: 1,
    prestigeBonus: 500,
    dividendBonusPerHour: 300,
    requiredTier: 'speakeasy',
    visualSlot: 'main',
  },
  {
    id: 'sovereign_gold_throne',
    category: 'seating',
    name: 'Imperial Gilded High Throne',
    iconName: 'Crown',
    description: 'Solid brass framed throne draped in scarlet crushed velvet with lion crests.',
    costChips: 150000,
    costGoldBars: 6,
    prestigeBonus: 2400,
    dividendBonusPerHour: 1200,
    requiredTier: 'villa',
    visualSlot: 'main',
  },

  // Lighting
  {
    id: 'gaslight_chandeliers',
    category: 'lighting',
    name: 'Victorian Gaslight Chandelier',
    iconName: 'Flame',
    description: 'Warm glowing amber gas sconces with hand-beaten brass piping.',
    costChips: 8000,
    costGoldBars: 0,
    prestigeBonus: 180,
    dividendBonusPerHour: 100,
    requiredTier: 'speakeasy',
    visualSlot: 'ceiling',
  },
  {
    id: 'crystal_brass_chandelier',
    category: 'lighting',
    name: 'Bohemian Crystal Chandelier',
    iconName: 'Sparkles',
    description: 'Cascading multifaceted crystals refracting light across the entire parlor ceiling.',
    costChips: 45000,
    costGoldBars: 2,
    prestigeBonus: 950,
    dividendBonusPerHour: 500,
    requiredTier: 'penthouse',
    visualSlot: 'ceiling',
  },
  {
    id: 'art_deco_neon_halo',
    category: 'lighting',
    name: 'Art Deco Amber Neon Halo',
    iconName: 'Sun',
    description: 'Geometric brushed gold circular fixture radiating warm champagne illumination.',
    costChips: 120000,
    costGoldBars: 5,
    prestigeBonus: 2100,
    dividendBonusPerHour: 1100,
    requiredTier: 'villa',
    visualSlot: 'ceiling',
  },

  // Entertainment
  {
    id: 'antique_jukebox',
    category: 'entertainment',
    name: 'Mechanical Brass Jukebox',
    iconName: 'Disc',
    description: 'A 1920s bubble-tube coin-op phonograph playing vintage jazz melodies.',
    costChips: 15000,
    costGoldBars: 0,
    prestigeBonus: 350,
    dividendBonusPerHour: 200,
    requiredTier: 'speakeasy',
    visualSlot: 'desk',
  },
  {
    id: 'steinway_grand_piano',
    category: 'entertainment',
    name: 'Ebony Concert Grand Piano',
    iconName: 'Music',
    description: 'Mirror-polished black lacquer piano with 24k gold pedal assemblies.',
    costChips: 80000,
    costGoldBars: 3,
    prestigeBonus: 1600,
    dividendBonusPerHour: 800,
    requiredTier: 'penthouse',
    visualSlot: 'desk',
  },
  {
    id: 'private_poker_felt',
    category: 'entertainment',
    name: 'Custom High-Stakes Poker Table',
    iconName: 'Spade',
    description: 'Hand-carved mahogany base with deep burgundy felt, chip wells, and brass cup holders.',
    costChips: 250000,
    costGoldBars: 10,
    prestigeBonus: 4000,
    dividendBonusPerHour: 2000,
    requiredTier: 'villa',
    visualSlot: 'main',
  },
  {
    id: 'brass_roulette_centerpiece',
    category: 'entertainment',
    name: 'Artisan Precision Roulette Wheel',
    iconName: 'CircleDot',
    description: 'Balanced aircraft-grade brass ball bearings encased in mahogany burlwood.',
    costChips: 600000,
    costGoldBars: 24,
    prestigeBonus: 8500,
    dividendBonusPerHour: 4500,
    requiredTier: 'chateau',
    visualSlot: 'desk',
  },

  // Treasury
  {
    id: 'heavy_brass_safe',
    category: 'treasury',
    name: 'Century Heavy Brass Vault Safe',
    iconName: 'Shield',
    description: 'Riveted iron and brushed brass combination safe for storing gilded bullion.',
    costChips: 20000,
    costGoldBars: 1,
    prestigeBonus: 450,
    dividendBonusPerHour: 250,
    requiredTier: 'speakeasy',
    visualSlot: 'floor',
  },
  {
    id: 'champagne_bar',
    category: 'treasury',
    name: 'Carrara Marble Champagne Bar',
    iconName: 'Wine',
    description: 'Curved white Italian marble bar stocked with vintage Dom Pérignon and crystal flutes.',
    costChips: 70000,
    costGoldBars: 3,
    prestigeBonus: 1400,
    dividendBonusPerHour: 750,
    requiredTier: 'penthouse',
    visualSlot: 'floor',
  },
  {
    id: 'trophy_pedestal',
    category: 'treasury',
    name: 'Illuminated Diamond Pedestal',
    iconName: 'Trophy',
    description: 'Glass-encased floating display case presenting your highest parlor gaming accolades.',
    costChips: 350000,
    costGoldBars: 14,
    prestigeBonus: 5500,
    dividendBonusPerHour: 2800,
    requiredTier: 'villa',
    visualSlot: 'floor',
  },

  // Flooring
  {
    id: 'walnut_herringbone',
    category: 'flooring',
    name: 'Dark Walnut Herringbone Parquet',
    iconName: 'Layers',
    description: 'Hand-laid historic French hardwood planks with satin beeswax finish.',
    costChips: 12000,
    costGoldBars: 0,
    prestigeBonus: 280,
    dividendBonusPerHour: 180,
    requiredTier: 'speakeasy',
    visualSlot: 'floor',
  },
  {
    id: 'carrara_marble_floor',
    category: 'flooring',
    name: 'Bookmatched Carrara Marble',
    iconName: 'Grid',
    description: 'White marble with soft charcoal veins polished to a high mirror sheen.',
    costChips: 60000,
    costGoldBars: 2,
    prestigeBonus: 1250,
    dividendBonusPerHour: 650,
    requiredTier: 'penthouse',
    visualSlot: 'floor',
  },
  {
    id: 'celestial_obsidian_tiles',
    category: 'flooring',
    name: 'Starlit Black Obsidian Tiles',
    iconName: 'Star',
    description: 'Mirror-black volcanic glass embedded with real crushed gold flake constellations.',
    costChips: 400000,
    costGoldBars: 16,
    prestigeBonus: 6000,
    dividendBonusPerHour: 3200,
    requiredTier: 'chateau',
    visualSlot: 'floor',
  },

  // View
  {
    id: 'view_brick_cellar',
    category: 'view',
    name: 'Secret Cobblestone Alley View',
    iconName: 'Eye',
    description: 'Vintage high-arched ground level window overlooking a rain-slicked Victorian alleyway.',
    costChips: 5000,
    costGoldBars: 0,
    prestigeBonus: 150,
    dividendBonusPerHour: 80,
    requiredTier: 'speakeasy',
    visualSlot: 'window',
  },
  {
    id: 'view_city_skyline',
    category: 'view',
    name: 'Metropolis Midnight Skyline',
    iconName: 'Building',
    description: 'Breathtaking 60th-floor panorama of illuminated skyscrapers and neon avenues.',
    costChips: 50000,
    costGoldBars: 2,
    prestigeBonus: 1100,
    dividendBonusPerHour: 600,
    requiredTier: 'penthouse',
    visualSlot: 'window',
  },
  {
    id: 'view_riviera_harbor',
    category: 'view',
    name: 'Monte Carlo Azure Yacht Bay',
    iconName: 'Compass',
    description: 'Sunlit turquoise Mediterranean waters dotted with superyachts and terracotta cliffs.',
    costChips: 180000,
    costGoldBars: 7,
    prestigeBonus: 3200,
    dividendBonusPerHour: 1600,
    requiredTier: 'villa',
    visualSlot: 'window',
  },
  {
    id: 'view_celestial_dome',
    category: 'view',
    name: 'Aurora Borealis Glass Dome',
    iconName: 'Sparkles',
    description: 'Cosmic 360-degree skylight showing dancing violet auroras and shooting stars.',
    costChips: 800000,
    costGoldBars: 32,
    prestigeBonus: 12000,
    dividendBonusPerHour: 6500,
    requiredTier: 'palace',
    visualSlot: 'window',
  },
];

