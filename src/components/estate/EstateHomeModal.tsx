import React, { useState, useEffect } from 'react';
import {
  PlayerProfileData,
  PlayerEstateData,
  ESTATE_TIERS,
  ESTATE_DECORATIONS,
  EstateTierId,
  EstateDecorationCategory,
  EstateDecorationDef,
} from '../../types/casino';
import { sound } from '../../utils/sound';
import confetti from 'canvas-confetti';
import {
  Home,
  Building,
  Sparkles,
  Crown,
  Coins,
  ArrowRightLeft,
  X,
  Layers,
  Palette,
  Clock,
  Check,
  TrendingUp,
  Eye,
  Gift,
  Shield,
  Award,
} from 'lucide-react';

interface EstateHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfileData;
  estate: PlayerEstateData;
  onUpdateProfile: (updates: Partial<PlayerProfileData>) => void;
  onUpdateEstate: (updates: Partial<PlayerEstateData>) => void;
  onAddTransaction: (type: any, game: string, amount: number, summary: string) => void;
}

const GOLD_BAR_RATE = 25000; // 25,000 chips = 1 Gold Bar

export const EstateHomeModal: React.FC<EstateHomeModalProps> = ({
  isOpen,
  onClose,
  profile,
  estate,
  onUpdateProfile,
  onUpdateEstate,
  onAddTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<'estate' | 'decorate' | 'exchange'>('estate');
  const [selectedCategory, setSelectedCategory] = useState<EstateDecorationCategory>('seating');
  const [cashoutBarsInput, setCashoutBarsInput] = useState<number>(1);
  const [accumulatedDividends, setAccumulatedDividends] = useState<number>(0);

  const currentTierDef = ESTATE_TIERS[estate.tier] || ESTATE_TIERS.speakeasy;

  // Calculate total hourly yield: Base tier + all equipped decoration bonuses
  const totalHourlyYield =
    currentTierDef.baseDividendRatePerHour +
    Object.values(estate.equippedDecorations).reduce((acc, decorId) => {
      const def = ESTATE_DECORATIONS.find((d) => d.id === decorId);
      return acc + (def?.dividendBonusPerHour || 0);
    }, 0);

  // Compute accumulated dividends since last claim
  useEffect(() => {
    const calculateAccumulated = () => {
      const lastClaimTime = estate.lastDividendClaim
        ? new Date(estate.lastDividendClaim).getTime()
        : Date.now() - 3600000; // 1 hour default
      const elapsedHours = Math.max(0, (Date.now() - lastClaimTime) / (1000 * 60 * 60));
      const yielded = Math.floor(elapsedHours * totalHourlyYield);
      setAccumulatedDividends(Math.min(500000, yielded)); // Cap at 500k to prevent overflow
    };

    calculateAccumulated();
    const interval = setInterval(calculateAccumulated, 5000);
    return () => clearInterval(interval);
  }, [estate.lastDividendClaim, totalHourlyYield]);

  if (!isOpen) return null;

  // Handle Collecting Estate Dividends
  const handleCollectDividends = () => {
    if (accumulatedDividends <= 0) return;
    sound.playGoldChime();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

    const newBalance = profile.chips + accumulatedDividends;
    const earnedXp = Math.floor(accumulatedDividends / 20);

    onUpdateProfile({
      chips: newBalance,
      xp: profile.xp + earnedXp,
      level: Math.max(profile.level, Math.floor((profile.xp + earnedXp) / 500) + 1),
    });

    onUpdateEstate({
      lastDividendClaim: new Date().toISOString(),
      totalDividendsCollected: (estate.totalDividendsCollected || 0) + accumulatedDividends,
    });

    onAddTransaction(
      'payout',
      'Estate Reserve',
      accumulatedDividends,
      `Collected ${accumulatedDividends.toLocaleString()} chips in luxury estate dividends`
    );

    setAccumulatedDividends(0);
  };

  // Handle Cashing Out Chips into Gold Bars
  const handleCashOutToGold = () => {
    const requiredChips = cashoutBarsInput * GOLD_BAR_RATE;
    if (requiredChips > profile.chips || cashoutBarsInput <= 0) return;

    sound.playGoldChime();
    confetti({ particleCount: 45, spread: 55, origin: { y: 0.6 } });

    const newChips = profile.chips - requiredChips;
    const newGold = estate.goldBars + cashoutBarsInput;
    const prestigeGain = cashoutBarsInput * 500;

    onUpdateProfile({ chips: newChips });
    onUpdateEstate({
      goldBars: newGold,
      totalPrestige: estate.totalPrestige + prestigeGain,
    });

    onAddTransaction(
      'wager',
      'Bullion Exchange',
      -requiredChips,
      `Cashed out ${requiredChips.toLocaleString()} chips for +${cashoutBarsInput} Gilded Gold Bar(s)`
    );
  };

  // Handle Liquidating Gold Bars back to Chips
  const handleLiquidateGold = () => {
    if (estate.goldBars < cashoutBarsInput || cashoutBarsInput <= 0) return;

    sound.playChipClick();
    const yieldedChips = cashoutBarsInput * GOLD_BAR_RATE;
    const newChips = profile.chips + yieldedChips;
    const newGold = estate.goldBars - cashoutBarsInput;

    onUpdateProfile({ chips: newChips });
    onUpdateEstate({ goldBars: newGold });

    onAddTransaction(
      'payout',
      'Bullion Exchange',
      yieldedChips,
      `Liquidated ${cashoutBarsInput} Gold Bar(s) into +${yieldedChips.toLocaleString()} chips`
    );
  };

  // Handle Upgrading Estate Tier
  const handleUpgradeTier = (targetTier: EstateTierId) => {
    const def = ESTATE_TIERS[targetTier];
    if (!def) return;

    // Check if player can afford
    const canAffordChips = profile.chips >= def.upgradeCostChips;
    const canAffordGold = estate.goldBars >= def.upgradeCostGoldBars;

    if (!canAffordChips && !canAffordGold) return;

    sound.playUpgradeFanfare();
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });

    let newChips = profile.chips;
    let newGold = estate.goldBars;

    if (canAffordChips && def.upgradeCostChips > 0) {
      newChips -= def.upgradeCostChips;
      onAddTransaction(
        'wager',
        'Estate Architect',
        -def.upgradeCostChips,
        `Purchased ${def.name} Estate Deed for ${def.upgradeCostChips.toLocaleString()} chips`
      );
    } else if (canAffordGold && def.upgradeCostGoldBars > 0) {
      newGold -= def.upgradeCostGoldBars;
      onAddTransaction(
        'wager',
        'Estate Architect',
        0,
        `Purchased ${def.name} Estate Deed for ${def.upgradeCostGoldBars} Gold Bar(s)`
      );
    }

    onUpdateProfile({ chips: newChips });
    onUpdateEstate({
      tier: targetTier,
      totalPrestige: estate.totalPrestige + def.prestigePoints,
    });
  };

  // Handle Purchasing or Equipping Decor
  const handleToggleDecor = (decor: EstateDecorationDef) => {
    const isUnlocked = estate.unlockedDecorations.includes(decor.id);
    const isEquipped = estate.equippedDecorations[decor.category] === decor.id;

    if (isEquipped) {
      // Unequip
      const newEquipped = { ...estate.equippedDecorations };
      delete newEquipped[decor.category];
      onUpdateEstate({ equippedDecorations: newEquipped });
      sound.playChipClick();
      return;
    }

    if (isUnlocked) {
      // Equip
      const newEquipped = { ...estate.equippedDecorations, [decor.category]: decor.id };
      onUpdateEstate({ equippedDecorations: newEquipped });
      sound.playChipClick();
      return;
    }

    // Purchase
    if (profile.chips < decor.costChips && estate.goldBars < decor.costGoldBars) return;

    sound.playGoldChime();
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });

    let newChips = profile.chips;
    let newGold = estate.goldBars;

    if (profile.chips >= decor.costChips && decor.costChips > 0) {
      newChips -= decor.costChips;
    } else if (estate.goldBars >= decor.costGoldBars && decor.costGoldBars > 0) {
      newGold -= decor.costGoldBars;
    }

    const newUnlocked = [...estate.unlockedDecorations, decor.id];
    const newEquipped = { ...estate.equippedDecorations, [decor.category]: decor.id };
    const newPrestige = estate.totalPrestige + decor.prestigeBonus;

    onUpdateProfile({ chips: newChips });
    onUpdateEstate({
      unlockedDecorations: newUnlocked,
      equippedDecorations: newEquipped,
      totalPrestige: newPrestige,
    });

    onAddTransaction(
      'wager',
      'Home Decor Gallery',
      -decor.costChips,
      `Acquired ${decor.name} (+${decor.prestigeBonus} Prestige)`
    );
  };

  // Current visual items for room canvas
  const equippedSeating = ESTATE_DECORATIONS.find((d) => d.id === estate.equippedDecorations.seating);
  const equippedLighting = ESTATE_DECORATIONS.find((d) => d.id === estate.equippedDecorations.lighting);
  const equippedEntertainment = ESTATE_DECORATIONS.find((d) => d.id === estate.equippedDecorations.entertainment);
  const equippedTreasury = ESTATE_DECORATIONS.find((d) => d.id === estate.equippedDecorations.treasury);
  const equippedFlooring = ESTATE_DECORATIONS.find((d) => d.id === estate.equippedDecorations.flooring);
  const equippedView = ESTATE_DECORATIONS.find((d) => d.id === estate.equippedDecorations.view);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0f1713] border-2 border-amber-500/40 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 bg-[#09100d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black text-amber-200">
                The Grand Estate & Luxury Penthouse
              </h2>
              <p className="text-xs text-stone-400">
                Cash out virtual winnings into Gilded Gold Bullion, upgrade your luxury home, and harvest passive dividends.
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

        {/* Navigation Tabs & Key Stats Strip */}
        <div className="px-6 py-3 border-b border-stone-800 bg-[#0c1410] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'estate' as const, label: 'Estate Overview & Room', icon: Home },
              { id: 'decorate' as const, label: 'Decorate & Furnish', icon: Palette },
              { id: 'exchange' as const, label: 'Gold Bullion Exchange', icon: ArrowRightLeft },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'btn-arcade-gold shadow-md'
                      : 'bg-stone-900/80 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Balance & Gold Badges */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30">
              <span className="text-amber-400 font-bold">24K Bullion:</span>
              <span className="font-mono-tabular font-black text-white">{estate.goldBars} Bars</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-emerald-500/30">
              <span className="text-emerald-400 font-bold">Prestige:</span>
              <span className="font-mono-tabular font-black text-white">{estate.totalPrestige.toLocaleString()} pts</span>
            </div>
          </div>
        </div>

        {/* Tab 1: Estate Overview & Visual Room Canvas */}
        {activeTab === 'estate' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Passive Dividends Claim Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-transparent border-2 border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-stone-950 font-black flex items-center justify-center text-xl shadow">
                  💰
                </div>
                <div>
                  <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Estate Luxury Dividends Accumulator</span>
                  </div>
                  <div className="text-lg font-black text-white mt-0.5">
                    +{accumulatedDividends.toLocaleString()} Virtual Chips Ready to Collect
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Generating{' '}
                    <span className="font-mono-tabular font-bold text-emerald-300">
                      +{totalHourlyYield.toLocaleString()} chips/hour
                    </span>{' '}
                    from your {currentTierDef.name} & equipped furnishings.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCollectDividends}
                disabled={accumulatedDividends <= 0}
                className="px-6 py-3 btn-arcade-emerald font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40 whitespace-nowrap shadow-md"
              >
                Collect Dividends (+{accumulatedDividends.toLocaleString()})
              </button>
            </div>

            {/* Interactive Visual Penthouse Room Canvas */}
            <div className="relative rounded-3xl border-4 border-[#3a2517] bg-gradient-to-b from-[#131d18] via-[#0d1410] to-[#080d0a] p-6 shadow-2xl overflow-hidden min-h-[340px] flex flex-col justify-between">
              {/* Wallpaper / Window Background View */}
              <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
                <span className="font-display text-8xl font-black text-amber-300">
                  {currentTierDef.name.toUpperCase()}
                </span>
              </div>

              {/* Top Room Banner */}
              <div className="relative z-10 flex items-center justify-between bg-black/60 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <div>
                    <div className="text-xs font-black text-amber-200">{currentTierDef.name}</div>
                    <div className="text-[10px] text-stone-400">{currentTierDef.tagline}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] uppercase shadow">
                    Prestige: {estate.totalPrestige.toLocaleString()} pts
                  </span>
                </div>
              </div>

              {/* Visual Architectural Isometric Room Elements */}
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 my-auto py-4">
                {/* Window View Card */}
                <div className="p-3 rounded-2xl bg-black/50 border border-stone-700/60 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>Panoramic Vista:</span>
                  </div>
                  <div className="font-semibold text-xs text-white mt-1">
                    {equippedView ? equippedView.name : 'Secret Cobblestone Alley'}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                    {equippedView ? equippedView.description : 'Standard parlor view'}
                  </div>
                </div>

                {/* Seating Card */}
                <div className="p-3 rounded-2xl bg-black/50 border border-stone-700/60 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    <span>Grand Seating:</span>
                  </div>
                  <div className="font-semibold text-xs text-white mt-1">
                    {equippedSeating ? equippedSeating.name : 'Classic Club Leather'}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                    {equippedSeating ? `+${equippedSeating.dividendBonusPerHour} chips/hr` : 'Basic parlor chair'}
                  </div>
                </div>

                {/* Entertainment Card */}
                <div className="p-3 rounded-2xl bg-black/50 border border-stone-700/60 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Entertainment Center:</span>
                  </div>
                  <div className="font-semibold text-xs text-white mt-1">
                    {equippedEntertainment ? equippedEntertainment.name : 'Private Gaming Desk'}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                    {equippedEntertainment ? `+${equippedEntertainment.dividendBonusPerHour} chips/hr` : 'Empty slot'}
                  </div>
                </div>

                {/* Lighting Card */}
                <div className="p-3 rounded-2xl bg-black/50 border border-stone-700/60 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    <span>Lighting Ambiance:</span>
                  </div>
                  <div className="font-semibold text-xs text-white mt-1">
                    {equippedLighting ? equippedLighting.name : 'Gaslight Sconces'}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                    {equippedLighting ? `+${equippedLighting.dividendBonusPerHour} chips/hr` : 'Standard illumination'}
                  </div>
                </div>

                {/* Treasury Card */}
                <div className="p-3 rounded-2xl bg-black/50 border border-stone-700/60 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Vault & Bar:</span>
                  </div>
                  <div className="font-semibold text-xs text-white mt-1">
                    {equippedTreasury ? equippedTreasury.name : 'Cast Iron Safe'}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                    {equippedTreasury ? `+${equippedTreasury.dividendBonusPerHour} chips/hr` : 'Secure storage'}
                  </div>
                </div>

                {/* Flooring Card */}
                <div className="p-3 rounded-2xl bg-black/50 border border-stone-700/60 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    <span>Flooring & Finishes:</span>
                  </div>
                  <div className="font-semibold text-xs text-white mt-1">
                    {equippedFlooring ? equippedFlooring.name : 'Walnut Parquet'}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                    {equippedFlooring ? `+${equippedFlooring.dividendBonusPerHour} chips/hr` : 'Classic hardwood'}
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="relative z-10 flex items-center justify-between text-xs text-stone-400 bg-black/40 px-4 py-2 rounded-xl">
                <span>Want to upgrade furniture or change window views?</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('decorate')}
                  className="text-amber-300 font-bold hover:underline cursor-pointer"
                >
                  Open Decor Gallery →
                </button>
              </div>
            </div>

            {/* Estate Tier Upgrade Path */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  <span>Real Estate Progression Tiers</span>
                </h3>
                <span className="text-xs text-stone-400">Upgrade to unlock grander suites and larger dividend streams</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {(Object.keys(ESTATE_TIERS) as EstateTierId[]).map((tierKey) => {
                  const tDef = ESTATE_TIERS[tierKey];
                  const isCurrent = estate.tier === tierKey;
                  const tierIndex = ['speakeasy', 'penthouse', 'villa', 'chateau', 'palace'].indexOf(tierKey);
                  const currentTierIndex = ['speakeasy', 'penthouse', 'villa', 'chateau', 'palace'].indexOf(estate.tier);
                  const isUnlocked = tierIndex <= currentTierIndex;
                  const canAffordChips = profile.chips >= tDef.upgradeCostChips;
                  const canAffordGold = estate.goldBars >= tDef.upgradeCostGoldBars;

                  return (
                    <div
                      key={tierKey}
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'bg-amber-500/15 border-amber-400 shadow-lg'
                          : isUnlocked
                          ? 'bg-stone-900/60 border-stone-700/60 text-stone-300'
                          : 'bg-stone-950/80 border-stone-800 text-stone-500'
                      }`}
                    >
                      <div>
                        <div className="text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-amber-400 mb-1">
                          Tier {tierIndex + 1}
                        </div>
                        <div className="font-black text-xs text-white leading-tight">{tDef.name}</div>
                        <div className="text-[10px] text-stone-400 mt-1">{tDef.tagline}</div>
                        <div className="mt-2.5 pt-2 border-t border-stone-800 text-[10px] space-y-0.5">
                          <div className="text-emerald-300 font-semibold">
                            +{tDef.baseDividendRatePerHour.toLocaleString()} chips/hr
                          </div>
                          <div className="text-amber-200">+{tDef.prestigePoints.toLocaleString()} Prestige</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        {isCurrent ? (
                          <div className="py-2 text-center text-[10px] font-black uppercase text-amber-400 bg-amber-500/20 rounded-xl border border-amber-400/30">
                            Equipped Residence
                          </div>
                        ) : isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => onUpdateEstate({ tier: tierKey })}
                            className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            Move In
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAffordChips && !canAffordGold}
                            onClick={() => handleUpgradeTier(tierKey)}
                            className="w-full py-2 btn-arcade-gold rounded-xl text-[10px] font-black uppercase cursor-pointer disabled:opacity-40"
                          >
                            Upgrade ({tDef.upgradeCostChips.toLocaleString()} Chips)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Decorate & Furnish */}
        {activeTab === 'decorate' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Category Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'seating' as const, label: 'Seating & Sofas' },
                { id: 'lighting' as const, label: 'Lighting & Chandeliers' },
                { id: 'entertainment' as const, label: 'Grand Entertainment' },
                { id: 'treasury' as const, label: 'Vaults & Bars' },
                { id: 'flooring' as const, label: 'Flooring & Marble' },
                { id: 'view' as const, label: 'Window Panorama' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCategory === cat.id
                      ? 'btn-arcade-gold shadow'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Decor Catalog Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ESTATE_DECORATIONS.filter((d) => d.category === selectedCategory).map((decor) => {
                const isUnlocked = estate.unlockedDecorations.includes(decor.id);
                const isEquipped = estate.equippedDecorations[decor.category] === decor.id;
                const canAfford = profile.chips >= decor.costChips || estate.goldBars >= decor.costGoldBars;

                return (
                  <div
                    key={decor.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isEquipped
                        ? 'bg-amber-500/15 border-amber-400 shadow-lg ring-2 ring-amber-400/40'
                        : isUnlocked
                        ? 'bg-[#0d1612] border-emerald-500/30'
                        : 'bg-[#080f0c] border-stone-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-white">{decor.name}</span>
                        {isEquipped && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[9px] uppercase">
                            Equipped
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 leading-relaxed">{decor.description}</p>

                      <div className="mt-3 pt-3 border-t border-stone-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono-tabular">
                        <div className="text-emerald-300 font-semibold">
                          +{decor.dividendBonusPerHour} chips/hr
                        </div>
                        <div className="text-amber-300 font-semibold text-right">
                          +{decor.prestigeBonus} Prestige
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2">
                      {isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleToggleDecor(decor)}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            isEquipped
                              ? 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                              : 'btn-arcade-emerald'
                          }`}
                        >
                          {isEquipped ? 'Unequip Piece' : 'Equip in Penthouse'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => handleToggleDecor(decor)}
                          className="w-full py-2.5 btn-arcade-gold font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40"
                        >
                          Acquire ({decor.costChips.toLocaleString()} Chips)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Gold Bullion Exchange */}
        {activeTab === 'exchange' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-5 rounded-2xl bg-[#0b1410] border border-amber-500/30">
              <h3 className="font-display text-sm font-bold text-amber-200">
                The Royal Mint & Bullion Reserve Exchange
              </h3>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Convert standard parlor chips into solid 24K Gold Bullion Bars (1 Gold Bar = 25,000 chips). Gold Bars protect your fortune from loss at tables, advance your high-roller status on the Leaderboard, and can be liquidated back into chips at any time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Cash Out Chips to Gold */}
              <div className="p-6 rounded-2xl bg-[#09110d] border border-amber-500/30 flex flex-col justify-between shadow">
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Deposit & Cash Out
                  </div>
                  <h4 className="font-bold text-base text-white mt-1">Chips → 24K Gold Bullion</h4>
                  <p className="text-xs text-stone-400 mt-1">
                    Lock in your casino winnings into high-society gold bars.
                  </p>

                  <div className="my-6 space-y-3">
                    <label className="text-xs text-stone-300 font-semibold block">
                      Number of Gold Bars to Mint:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={cashoutBarsInput}
                        onChange={(e) => setCashoutBarsInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono-tabular font-bold text-white text-center"
                      />
                      <div className="text-xs text-stone-400">
                        = {(cashoutBarsInput * GOLD_BAR_RATE).toLocaleString()} Chips
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={profile.chips < cashoutBarsInput * GOLD_BAR_RATE}
                  onClick={handleCashOutToGold}
                  className="w-full py-3.5 btn-arcade-gold font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40 shadow-md"
                >
                  Cash Out for {cashoutBarsInput} Gold Bar(s)
                </button>
              </div>

              {/* Liquidate Gold to Chips */}
              <div className="p-6 rounded-2xl bg-[#09110d] border border-emerald-500/30 flex flex-col justify-between shadow">
                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Liquidate Reserve
                  </div>
                  <h4 className="font-bold text-base text-white mt-1">24K Gold Bullion → Chips</h4>
                  <p className="text-xs text-stone-400 mt-1">
                    Convert bullion back into chips when you need bankroll at high-stakes tables.
                  </p>

                  <div className="my-6 space-y-3">
                    <label className="text-xs text-stone-300 font-semibold block">
                      Number of Gold Bars to Liquidate:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={estate.goldBars || 1}
                        value={cashoutBarsInput}
                        onChange={(e) => setCashoutBarsInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono-tabular font-bold text-white text-center"
                      />
                      <div className="text-xs text-stone-400">
                        = {(cashoutBarsInput * GOLD_BAR_RATE).toLocaleString()} Chips
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={estate.goldBars < cashoutBarsInput}
                  onClick={handleLiquidateGold}
                  className="w-full py-3.5 btn-arcade-emerald font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40 shadow-md"
                >
                  Liquidate into {(cashoutBarsInput * GOLD_BAR_RATE).toLocaleString()} Chips
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
