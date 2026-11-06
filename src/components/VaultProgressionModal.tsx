import React, { useState } from 'react';
import {
  PlayerProfileData,
  ChipTransactionItem,
  ACHIEVEMENTS,
  CHIP_THEMES,
  TABLE_THEMES,
  SEASONAL_REWARDS,
  ChipThemeId,
  TableThemeId,
} from '../types/casino';
import { X, Gift, Award, Palette, History, ShieldCheck } from 'lucide-react';

interface VaultProgressionModalProps {
  isOpen: boolean;
  initialSection: 'vault' | 'ledger' | 'cosmetics';
  profile: PlayerProfileData;
  transactions: ChipTransactionItem[];
  firebaseAuthStatus: 'anonymous' | 'google' | 'local-fallback';
  onClose: () => void;
  onClaimDaily: () => void;
  onClaimAllowance: () => void;
  onUpdateCustomization: (updates: {
    displayName?: string;
    chipTheme?: ChipThemeId;
    tableTheme?: TableThemeId;
  }) => void;
  onSignInGoogle: () => void;
  onRetryAnonymousAuth: () => void;
}

export const VaultProgressionModal: React.FC<VaultProgressionModalProps> = ({
  isOpen,
  initialSection,
  profile,
  transactions,
  firebaseAuthStatus,
  onClose,
  onClaimDaily,
  onClaimAllowance,
  onUpdateCustomization,
  onSignInGoogle,
  onRetryAnonymousAuth,
}) => {
  const [section, setSection] = useState<'vault' | 'ledger' | 'cosmetics' | 'account'>(
    initialSection
  );
  const [aliasInput, setAliasInput] = useState(profile.displayName);

  if (!isOpen) return null;

  const todayKey = new Date().toISOString().slice(0, 10);
  const dailyAlreadyClaimed = profile.lastDailyClaim === todayKey;
  const nextDailyReward = 1000 + Math.min(profile.dailyStreak, 7) * 250;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-[#111c17] border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-[#0b1310]">
          <div>
            <h2 className="font-display text-lg font-bold text-amber-200">
              Club Vault, Progression & Ledger
            </h2>
            <p className="text-xs text-stone-400">
              All chips are virtual parlor points with zero real-world monetary value.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-3 border-b border-stone-800 bg-[#0d1612] flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'vault' as const, label: 'Rewards & Achievements', icon: Gift },
            { id: 'cosmetics' as const, label: 'Chip & Table Themes', icon: Palette },
            { id: 'ledger' as const, label: 'Stats & Chip History', icon: History },
            { id: 'account' as const, label: 'Anonymous Account & Sync', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  section === item.id
                    ? 'bg-amber-400 text-stone-950 font-semibold'
                    : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {section === 'vault' && (
            <>
              {/* Daily Login & Free Chip Allowance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-[#0b1310] border border-amber-500/25 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-amber-300 font-medium">
                      Daily Login Reward · Streak Day {profile.dailyStreak}
                    </div>
                    <h3 className="text-base font-semibold text-white mt-1">
                      +{nextDailyReward.toLocaleString()} Virtual Chips & +150 XP
                    </h3>
                    <p className="text-xs text-stone-400 mt-1">
                      Log in each day to increase your consecutive parlor streak bonus.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={dailyAlreadyClaimed}
                    onClick={onClaimDaily}
                    className="mt-4 py-2.5 px-4 bg-amber-400 hover:bg-amber-300 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-semibold rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {dailyAlreadyClaimed ? 'Claimed for Today' : 'Claim Daily Login Reward'}
                  </button>
                </div>

                <div className="p-5 rounded-xl bg-[#0b1310] border border-emerald-500/25 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-emerald-300 font-medium">
                      Complimentary Virtual Chip Allowance
                    </div>
                    <h3 className="text-base font-semibold text-white mt-1">
                      +1,500 Free Parlor Chips & +50 XP
                    </h3>
                    <p className="text-xs text-stone-400 mt-1">
                      Top up your virtual chip balance anytime for social play with friends.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClaimAllowance}
                    className="mt-4 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Claim +1,500 Chip Allowance
                  </button>
                </div>
              </div>

              {/* Seasonal Pass */}
              <div className="p-5 rounded-xl bg-[#0b1310] border border-stone-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Autumn Royale Seasonal Progression
                    </h3>
                    <p className="text-xs text-stone-400">
                      Level {profile.level} · {profile.xp.toLocaleString()} Total XP
                    </p>
                  </div>
                  <span className="font-mono-tabular text-xs text-amber-300">
                    Next Level at {profile.level * 500} XP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {SEASONAL_REWARDS.map((tier) => {
                    const reached = profile.xp >= tier.xpRequired;
                    return (
                      <div
                        key={tier.tier}
                        className={`p-3 rounded-lg border ${
                          reached
                            ? 'bg-amber-500/10 border-amber-400/50 text-amber-100'
                            : 'bg-stone-900/60 border-stone-800 text-stone-400'
                        }`}
                      >
                        <div className="text-[11px] font-mono-tabular">
                          Tier {tier.tier} · {tier.xpRequired} XP
                        </div>
                        <div className="text-xs font-semibold text-white mt-1">{tier.title}</div>
                        <div className="text-[11px] text-amber-300 mt-1">{tier.cosmeticLabel}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Achievements */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Parlor Achievements & Cosmetic Unlocks</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ACHIEVEMENTS.map((ach) => {
                    const unlocked = profile.unlockedAchievements.includes(ach.id);
                    return (
                      <div
                        key={ach.id}
                        className={`p-4 rounded-xl border ${
                          unlocked
                            ? 'bg-emerald-950/30 border-emerald-500/40'
                            : 'bg-[#0b1310] border-stone-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{ach.title}</span>
                          <span className="font-mono-tabular text-xs text-amber-300">
                            +{ach.rewardChips.toLocaleString()} Chips · +{ach.rewardXp} XP
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-1">{ach.description}</p>
                        {ach.unlocksCosmetic && (
                          <div className="mt-2 text-[11px] text-amber-200">
                            Unlocks: {ach.unlocksCosmetic.label} ·{' '}
                            {unlocked ? 'UNLOCKED' : 'Locked'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {section === 'cosmetics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Virtual Chip Mint Colors
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.values(CHIP_THEMES).map((theme) => {
                    const isEquipped = profile.chipTheme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          isEquipped
                            ? 'bg-amber-500/15 border-amber-400'
                            : 'bg-[#0b1310] border-stone-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full border-2"
                              style={{
                                backgroundColor: theme.primaryHex,
                                borderColor: theme.accentHex,
                              }}
                            />
                            <span className="text-xs font-semibold text-white">{theme.name}</span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1.5">{theme.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onUpdateCustomization({ chipTheme: theme.id })}
                          className={`mt-3 py-2 px-3 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                            isEquipped
                              ? 'bg-amber-400 text-stone-950 font-semibold'
                              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip Chip Style'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Table Felt & Parlor Surface Themes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(TABLE_THEMES).map((theme) => {
                    const isEquipped = profile.tableTheme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        className={`p-4 rounded-xl border flex items-center justify-between ${
                          isEquipped
                            ? 'bg-amber-500/15 border-amber-400'
                            : 'bg-[#0b1310] border-stone-800'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">{theme.name}</div>
                          <p className="text-xs text-stone-400 mt-1">{theme.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onUpdateCustomization({ tableTheme: theme.id })}
                          className={`py-2 px-3.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                            isEquipped
                              ? 'bg-amber-400 text-stone-950 font-semibold'
                              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Apply Felt'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {section === 'ledger' && (
            <div className="space-y-6">
              {/* Personal Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#0b1310] border border-stone-800">
                  <div className="text-xs text-stone-400">Current Balance</div>
                  <div className="font-mono-tabular text-lg font-bold text-amber-300 mt-1">
                    {profile.chips.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#0b1310] border border-stone-800">
                  <div className="text-xs text-stone-400">Rounds Played</div>
                  <div className="font-mono-tabular text-lg font-bold text-white mt-1">
                    {profile.gamesPlayed.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#0b1310] border border-stone-800">
                  <div className="text-xs text-stone-400">Cumulative Won</div>
                  <div className="font-mono-tabular text-lg font-bold text-emerald-300 mt-1">
                    {profile.totalWon.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#0b1310] border border-stone-800">
                  <div className="text-xs text-stone-400">Biggest Single Payout</div>
                  <div className="font-mono-tabular text-lg font-bold text-amber-200 mt-1">
                    {profile.biggestWin.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Transaction History Table */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Virtual Chip Transaction Ledger
                </h3>
                <div className="bg-[#0b1310] border border-stone-800 rounded-xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto divide-y divide-stone-800/80">
                    {transactions.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-500">
                        No virtual chip movements recorded yet.
                      </div>
                    ) : (
                      transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="px-4 py-3 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-medium text-stone-200">{tx.summary}</div>
                            <div className="text-[11px] text-stone-500">
                              {tx.game} · {tx.type} ·{' '}
                              {new Date(tx.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          <div className="text-right font-mono-tabular">
                            <div
                              className={`font-semibold ${
                                tx.amount >= 0 ? 'text-emerald-300' : 'text-rose-400'
                              }`}
                            >
                              {tx.amount >= 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              Bal: {tx.balanceAfter.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'account' && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-[#0b1310] border border-amber-500/25 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Anonymous Account Saving & Pseudonymous Handle
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Your account is saved anonymously without requiring personal details. Customize
                    your public parlor alias below.
                  </p>
                </div>

                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    minLength={2}
                    maxLength={32}
                    className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3.5 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateCustomization({ displayName: aliasInput })}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Save Handle
                  </button>
                </div>

                <div className="text-xs text-stone-400 pt-2 border-t border-stone-800">
                  <div>
                    Anonymous Account UID:{' '}
                    <span className="font-mono-tabular text-amber-200">{profile.uid}</span>
                  </div>
                  <div className="mt-1">
                    Cloud Sync Mode:{' '}
                    <span className="text-emerald-300 font-medium">
                      {firebaseAuthStatus === 'anonymous'
                        ? 'Firebase Anonymous Auth + Server Vault Active'
                        : firebaseAuthStatus === 'google'
                        ? 'Firebase Linked Account + Server Vault Active'
                        : 'Server Anonymous Vault Active'}
                    </span>
                  </div>
                </div>
              </div>

              {firebaseAuthStatus === 'local-fallback' && (
                <div className="p-5 rounded-xl bg-[#0b1310] border border-stone-800 space-y-3">
                  <h4 className="text-xs font-semibold text-amber-300">
                    Optional: Enable Firebase Console Anonymous Provider or Link Google
                  </h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Your anonymous account is already automatically saved on the parlor server. To
                    also enable native Firebase Anonymous Auth in your Firebase project:
                  </p>
                  <ol className="text-xs text-stone-400 list-decimal list-inside space-y-1">
                    <li>Open the Firebase Console for your project.</li>
                    <li>
                      Navigate to <strong>Authentication &gt; Sign-in method</strong>.
                    </li>
                    <li>
                      Select <strong>Anonymous</strong>, toggle <strong>Enable</strong>, and click{' '}
                      <strong>Save</strong>.
                    </li>
                  </ol>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onRetryAnonymousAuth}
                      className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Retry Firebase Anonymous Auth
                    </button>
                    <button
                      type="button"
                      onClick={onSignInGoogle}
                      className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Or Link with Google Sign-In
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
