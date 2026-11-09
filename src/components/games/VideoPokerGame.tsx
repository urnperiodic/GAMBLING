import React, { useState } from 'react';
import { sound } from '../../utils/sound';
import { ChipRack } from './ChipRack';
import confetti from 'canvas-confetti';
import { shouldPlayerWin53 } from '../../utils/fairRng';
import { Sparkles, Award } from 'lucide-react';

interface VideoPokerGameProps {
  balance: number;
  isPractice: boolean;
  isSpectator: boolean;
  minBet: number;
  onCompleteRound: (result: {
    wager: number;
    payout: number;
    multiplier: number;
    summary: string;
  }) => void;
}

type VideoPokerVariant = 'jacks-or-better' | 'deuces-wild' | 'double-bonus';

type Suit = '♠' | '♥' | '♦' | '♣';
interface PokerCard {
  rank: string;
  numValue: number;
  suit: Suit;
  isWild?: boolean;
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { rank: '2', numValue: 2 },
  { rank: '3', numValue: 3 },
  { rank: '4', numValue: 4 },
  { rank: '5', numValue: 5 },
  { rank: '6', numValue: 6 },
  { rank: '7', numValue: 7 },
  { rank: '8', numValue: 8 },
  { rank: '9', numValue: 9 },
  { rank: '10', numValue: 10 },
  { rank: 'J', numValue: 11 },
  { rank: 'Q', numValue: 12 },
  { rank: 'K', numValue: 13 },
  { rank: 'A', numValue: 14 },
];

const PAYTABLES: Record<VideoPokerVariant, Array<{ name: string; mult: number }>> = {
  'jacks-or-better': [
    { name: 'Royal Flush', mult: 800 },
    { name: 'Straight Flush', mult: 50 },
    { name: 'Four of a Kind', mult: 25 },
    { name: 'Full House', mult: 9 },
    { name: 'Flush', mult: 6 },
    { name: 'Straight', mult: 4 },
    { name: 'Three of a Kind', mult: 3 },
    { name: 'Two Pair', mult: 2 },
    { name: 'Jacks or Better', mult: 1 },
  ],
  'deuces-wild': [
    { name: 'Natural Royal Flush', mult: 800 },
    { name: 'Four Deuces (Wilds)', mult: 200 },
    { name: 'Wild Royal Flush', mult: 25 },
    { name: 'Five of a Kind', mult: 15 },
    { name: 'Straight Flush', mult: 9 },
    { name: 'Four of a Kind', mult: 5 },
    { name: 'Full House', mult: 3 },
    { name: 'Flush', mult: 2 },
    { name: 'Straight', mult: 2 },
    { name: 'Three of a Kind', mult: 1 },
  ],
  'double-bonus': [
    { name: 'Royal Flush', mult: 800 },
    { name: 'Straight Flush', mult: 50 },
    { name: 'Four Aces', mult: 160 },
    { name: 'Four 2s, 3s, or 4s', mult: 80 },
    { name: 'Four 5s thru Kings', mult: 50 },
    { name: 'Full House', mult: 10 },
    { name: 'Flush', mult: 7 },
    { name: 'Straight', mult: 5 },
    { name: 'Three of a Kind', mult: 3 },
    { name: 'Two Pair', mult: 1 },
    { name: 'Jacks or Better', mult: 1 },
  ],
};

function createShuffledDeck(variant: VideoPokerVariant): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({
        rank: r.rank,
        numValue: r.numValue,
        suit: s,
        isWild: variant === 'deuces-wild' && r.numValue === 2,
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function evaluatePokerHand(
  hand: PokerCard[],
  variant: VideoPokerVariant
): { name: string; mult: number } {
  if (hand.length !== 5) return { name: 'High Card', mult: 0 };

  const paytable = PAYTABLES[variant];

  if (variant === 'deuces-wild') {
    const wildCount = hand.filter((c) => c.numValue === 2).length;
    const naturals = hand.filter((c) => c.numValue !== 2);

    if (wildCount === 4) {
      return { name: 'Four Deuces (Wilds)', mult: 200 };
    }

    if (wildCount === 0) {
      // Natural checks
      const sorted = [...hand].sort((a, b) => a.numValue - b.numValue);
      const values = sorted.map((c) => c.numValue);
      const isFlush = hand.every((c) => c.suit === hand[0].suit);
      const isStraight = values.every((v, i) => i === 0 || v === values[i - 1] + 1);

      if (isFlush && isStraight && values[0] === 10) return { name: 'Natural Royal Flush', mult: 800 };
      if (isFlush && isStraight) return { name: 'Straight Flush', mult: 9 };
    }

    // Five of a kind check with wilds
    const naturalCounts: Record<number, number> = {};
    naturals.forEach((c) => (naturalCounts[c.numValue] = (naturalCounts[c.numValue] || 0) + 1));
    const highestNaturalCount = Math.max(0, ...Object.values(naturalCounts));
    if (highestNaturalCount + wildCount >= 5) {
      return { name: 'Five of a Kind', mult: 15 };
    }

    // Wild Royal Flush
    const royalValues = [10, 11, 12, 13, 14];
    const royalNaturals = naturals.filter((c) => royalValues.includes(c.numValue));
    const royalSuits = new Set(royalNaturals.map((c) => c.suit));
    if (royalSuits.size <= 1 && royalNaturals.length + wildCount >= 5) {
      return { name: 'Wild Royal Flush', mult: 25 };
    }

    if (highestNaturalCount + wildCount >= 4) return { name: 'Four of a Kind', mult: 5 };
    if (highestNaturalCount + wildCount >= 3) {
      // Full house with wilds
      if (wildCount === 0 && Object.values(naturalCounts).includes(3) && Object.values(naturalCounts).includes(2)) {
        return { name: 'Full House', mult: 3 };
      }
      if (wildCount >= 1 && Object.values(naturalCounts).filter((c) => c >= 2).length >= 2) {
        return { name: 'Full House', mult: 3 };
      }
      return { name: 'Three of a Kind', mult: 1 };
    }

    // Flush check
    const suitCounts: Record<string, number> = {};
    naturals.forEach((c) => (suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1));
    const maxSuit = Math.max(0, ...Object.values(suitCounts));
    if (maxSuit + wildCount >= 5) return { name: 'Flush', mult: 2 };

    return { name: 'High Card', mult: 0 };
  }

  // Jacks or Better and Double Bonus logic
  const sorted = [...hand].sort((a, b) => a.numValue - b.numValue);
  const values = sorted.map((c) => c.numValue);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);
  const isWheelStraight =
    values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14;
  const isStandardStraight = values.every((v, idx) => idx === 0 || v === values[idx - 1] + 1);
  const isStraight = isWheelStraight || isStandardStraight;

  if (isFlush && isStandardStraight && values[0] === 10) {
    return { name: 'Royal Flush', mult: 800 };
  }
  if (isFlush && isStraight) {
    return { name: 'Straight Flush', mult: 50 };
  }

  const counts: Record<number, number> = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const freq = Object.values(counts).sort((a, b) => b - a);

  if (freq[0] === 4) {
    if (variant === 'double-bonus') {
      const quadVal = Number(Object.keys(counts).find((k) => counts[Number(k)] === 4));
      if (quadVal === 14) return { name: 'Four Aces', mult: 160 };
      if (quadVal >= 2 && quadVal <= 4) return { name: 'Four 2s, 3s, or 4s', mult: 80 };
      return { name: 'Four 5s thru Kings', mult: 50 };
    }
    return { name: 'Four of a Kind', mult: 25 };
  }

  if (freq[0] === 3 && freq[1] === 2) {
    const mult = variant === 'double-bonus' ? 10 : 9;
    return { name: 'Full House', mult };
  }

  if (isFlush) {
    const mult = variant === 'double-bonus' ? 7 : 6;
    return { name: 'Flush', mult };
  }

  if (isStraight) {
    const mult = variant === 'double-bonus' ? 5 : 4;
    return { name: 'Straight', mult };
  }

  if (freq[0] === 3) return { name: 'Three of a Kind', mult: 3 };
  if (freq[0] === 2 && freq[1] === 2) {
    const mult = variant === 'double-bonus' ? 1 : 2;
    return { name: 'Two Pair', mult };
  }

  for (const [valStr, count] of Object.entries(counts)) {
    if (count === 2 && Number(valStr) >= 11) {
      return { name: 'Jacks or Better', mult: 1 };
    }
  }

  return { name: 'High Card', mult: 0 };
}

export const VideoPokerGame: React.FC<VideoPokerGameProps> = ({
  balance,
  isSpectator,
  minBet,
  onCompleteRound,
}) => {
  const [variant, setVariant] = useState<VideoPokerVariant>('jacks-or-better');
  const [wager, setWager] = useState<number>(Math.max(25, minBet));
  const [deck, setDeck] = useState<PokerCard[]>([]);
  const [hand, setHand] = useState<PokerCard[]>([]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [phase, setPhase] = useState<'ready' | 'hold' | 'complete'>('ready');
  const [resultHand, setResultHand] = useState<{ name: string; mult: number } | null>(null);

  const activePaytable = PAYTABLES[variant];

  const handleDeal = () => {
    if (isSpectator || wager > balance || wager < minBet) return;
    sound.playCardDeal();
    const freshDeck = createShuffledDeck(variant);
    const initialFive = freshDeck.slice(0, 5);
    setDeck(freshDeck.slice(5));
    setHand(initialFive);
    setHeld([false, false, false, false, false]);
    setResultHand(evaluatePokerHand(initialFive, variant));
    setPhase('hold');
  };

  const toggleHold = (idx: number) => {
    if (phase !== 'hold' || isSpectator) return;
    sound.playChipClick();
    setHeld((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const handleDraw = () => {
    if (phase !== 'hold' || isSpectator) return;
    const willPlayerWin = shouldPlayerWin53();
    let finalFive: PokerCard[] = [];
    let evalRes = { name: 'High Card', mult: 0 };

    let attempts = 0;
    while (attempts < 25) {
      let drawPtr = 0;
      const candidateDeck = [...deck];
      // Shuffle unheld replacements for attempts
      if (attempts > 0) {
        for (let i = candidateDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidateDeck[i], candidateDeck[j]] = [candidateDeck[j], candidateDeck[i]];
        }
      }
      const candidateFive = hand.map((card, idx) => {
        if (held[idx]) return card;
        const replacement = candidateDeck[drawPtr] || card;
        drawPtr += 1;
        return replacement;
      });
      const candidateEval = evaluatePokerHand(candidateFive, variant);

      if ((willPlayerWin && candidateEval.mult >= 1) || (!willPlayerWin && candidateEval.mult === 0)) {
        finalFive = candidateFive;
        evalRes = candidateEval;
        break;
      }
      attempts++;
    }

    if (finalFive.length === 0) {
      let drawPtr = 0;
      finalFive = hand.map((card, idx) => {
        if (held[idx]) return card;
        const replacement = deck[drawPtr];
        drawPtr += 1;
        return replacement;
      });
      evalRes = evaluatePokerHand(finalFive, variant);
    }

    setHand(finalFive);
    setResultHand(evalRes);
    setPhase('complete');

    const payout = wager * evalRes.mult;
    const summary = `Video Poker (${variant}): ${evalRes.name}`;

    if (evalRes.mult >= 4) {
      sound.playWinChime(true);
      confetti({ particleCount: 55, spread: 60, origin: { y: 0.65 } });
    } else if (evalRes.mult >= 1) {
      sound.playWinChime(false);
    } else {
      sound.playLossThud();
    }

    onCompleteRound({
      wager,
      payout,
      multiplier: evalRes.mult,
      summary,
    });
  };

  const cardSuitColor = (suit: Suit) => (suit === '♥' || suit === '♦' ? 'text-rose-400' : 'text-stone-200');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Paytable & Controls */}
      <div className="lg:col-span-4 bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
          {/* Machine Variant Selector */}
          <div>
            <div className="text-xs font-semibold text-stone-300 mb-1.5 flex items-center justify-between">
              <span>Game Machine Type:</span>
              <Award className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 bg-stone-900 rounded-xl border border-stone-800 text-[10px] font-bold">
              {[
                { id: 'jacks-or-better' as const, label: 'Jacks or Better' },
                { id: 'deuces-wild' as const, label: 'Deuces Wild' },
                { id: 'double-bonus' as const, label: 'Double Bonus' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={phase === 'hold'}
                  onClick={() => setVariant(v.id)}
                  className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer truncate ${
                    variant === v.id
                      ? 'bg-amber-400 text-stone-950 font-black shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <ChipRack
            wager={wager}
            balance={balance}
            minBet={minBet}
            disabled={phase === 'hold' || isSpectator}
            onChangeWager={setWager}
          />

          {phase === 'hold' ? (
            <button
              type="button"
              onClick={handleDraw}
              className="btn-arcade-emerald w-full py-4 px-5 rounded-xl font-extrabold text-sm uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
            >
              DRAW NEW CARDS
            </button>
          ) : (
            <button
              type="button"
              disabled={isSpectator || wager > balance || wager < minBet}
              onClick={handleDeal}
              className="btn-arcade-gold w-full py-4 px-5 rounded-xl font-extrabold text-sm uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
            >
              DEAL 5 CARDS ({wager.toLocaleString()} CHIPS)
            </button>
          )}

          {/* Neon Paytable Board */}
          <div className="bg-[#050b08] border-2 border-amber-400/40 rounded-xl p-3 space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-amber-300 mb-1.5 flex items-center justify-between">
              <span>{variant.toUpperCase().replace(/-/g, ' ')} PAYTABLE</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            {activePaytable.map((row) => {
              const isCurrentHit = resultHand?.name === row.name;
              return (
                <div
                  key={row.name}
                  className={`flex items-center justify-between text-xs px-2.5 py-1 rounded ${
                    isCurrentHit
                      ? 'bg-amber-400 text-stone-950 font-extrabold shadow'
                      : 'text-stone-300'
                  }`}
                >
                  <span>{row.name}</span>
                  <span className="font-mono-tabular font-bold">
                    {row.mult}x ({(wager * row.mult).toLocaleString()})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Mechanical Card Rail */}
      <div className="lg:col-span-8 bg-[#0a1712] border-4 border-[#331c12] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[480px]">
        {/* Felt Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <span className="font-display text-8xl font-black text-amber-300">VIDEO POKER</span>
        </div>

        {/* Top Machine Header */}
        <div className="relative z-10 flex items-center justify-between bg-black/60 px-5 py-3 rounded-2xl border border-amber-500/30">
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-400">
              {variant === 'deuces-wild' ? '★ ALL 2s ARE WILD ★' : 'Precision Draw Poker'}
            </div>
            <div className="text-sm font-black text-white">
              {resultHand ? resultHand.name : 'Select Cards to Hold'}
            </div>
          </div>
          {resultHand && resultHand.mult > 0 && (
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono-tabular font-black text-xs border border-emerald-400/40 animate-pulse">
              Pays {resultHand.mult}x (+{(wager * resultHand.mult).toLocaleString()} Chips)
            </div>
          )}
        </div>

        {/* 5 Cards Display */}
        <div className="relative z-10 grid grid-cols-5 gap-2 sm:gap-4 my-auto py-8">
          {[0, 1, 2, 3, 4].map((idx) => {
            const card = hand[idx];
            const isHeld = held[idx];
            return (
              <div
                key={idx}
                onClick={() => toggleHold(idx)}
                className={`relative flex flex-col justify-between p-2 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer aspect-[3/4.2] shadow-xl ${
                  isHeld
                    ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-stone-900 border-amber-300 -translate-y-2'
                    : 'border-stone-400/40 hover:-translate-y-1'
                } ${
                  card
                    ? 'bg-gradient-to-b from-stone-50 via-white to-stone-100 text-stone-900'
                    : 'bg-stone-900/60 border-stone-800'
                }`}
              >
                {/* Held Badge */}
                {phase === 'hold' && isHeld && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow">
                    HELD
                  </div>
                )}

                {card ? (
                  <>
                    <div className={`self-start text-xs sm:text-sm font-black ${cardSuitColor(card.suit)}`}>
                      {card.rank}
                      {card.isWild && (
                        <span className="ml-1 text-[9px] bg-amber-500 text-black px-1 rounded">
                          WILD
                        </span>
                      )}
                    </div>
                    <div className={`text-3xl sm:text-5xl self-center ${cardSuitColor(card.suit)}`}>
                      {card.suit}
                    </div>
                    <div className={`self-end text-xs sm:text-sm font-black ${cardSuitColor(card.suit)}`}>
                      {card.rank}
                    </div>
                  </>
                ) : (
                  <div className="m-auto font-display text-xs text-stone-600 font-bold uppercase tracking-widest">
                    CARD {idx + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Instructions banner */}
        <div className="relative z-10 text-center text-xs text-stone-400 bg-black/40 py-2 rounded-xl border border-stone-800">
          {phase === 'hold'
            ? 'Click cards to HOLD winning pairs or flush draws, then press DRAW NEW CARDS'
            : 'Press DEAL 5 CARDS to start a hand'}
        </div>
      </div>
    </div>
  );
};
