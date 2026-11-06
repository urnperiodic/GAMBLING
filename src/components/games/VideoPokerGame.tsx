import React, { useState } from 'react';
import { sound } from '../../utils/sound';
import { ChipRack } from './ChipRack';
import confetti from 'canvas-confetti';

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

type Suit = '♠' | '♥' | '♦' | '♣';
interface PokerCard {
  rank: string;
  numValue: number;
  suit: Suit;
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

const PAYTABLE = [
  { name: 'Royal Flush', mult: 800 },
  { name: 'Straight Flush', mult: 50 },
  { name: 'Four of a Kind', mult: 25 },
  { name: 'Full House', mult: 9 },
  { name: 'Flush', mult: 6 },
  { name: 'Straight', mult: 4 },
  { name: 'Three of a Kind', mult: 3 },
  { name: 'Two Pair', mult: 2 },
  { name: 'Jacks or Better', mult: 1 },
];

function createShuffledDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ rank: r.rank, numValue: r.numValue, suit: s });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function evaluatePokerHand(hand: PokerCard[]): { name: string; mult: number } {
  if (hand.length !== 5) return { name: 'High Card', mult: 0 };
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

  if (freq[0] === 4) return { name: 'Four of a Kind', mult: 25 };
  if (freq[0] === 3 && freq[1] === 2) return { name: 'Full House', mult: 9 };
  if (isFlush) return { name: 'Flush', mult: 6 };
  if (isStraight) return { name: 'Straight', mult: 4 };
  if (freq[0] === 3) return { name: 'Three of a Kind', mult: 3 };
  if (freq[0] === 2 && freq[1] === 2) return { name: 'Two Pair', mult: 2 };

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
  const [wager, setWager] = useState<number>(Math.max(25, minBet));
  const [deck, setDeck] = useState<PokerCard[]>([]);
  const [hand, setHand] = useState<PokerCard[]>([]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [phase, setPhase] = useState<'ready' | 'hold' | 'complete'>('ready');
  const [resultHand, setResultHand] = useState<{ name: string; mult: number } | null>(null);

  const handleDeal = () => {
    if (isSpectator || wager > balance || wager < minBet) return;
    sound.playCardDeal();
    const freshDeck = createShuffledDeck();
    const initialFive = freshDeck.slice(0, 5);
    setDeck(freshDeck.slice(5));
    setHand(initialFive);
    setHeld([false, false, false, false, false]);
    setResultHand(evaluatePokerHand(initialFive));
    setPhase('hold');
  };

  const toggleHold = (idx: number) => {
    if (phase !== 'hold' || isSpectator) return;
    sound.playChipClick();
    setHeld((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const handleDraw = () => {
    if (phase !== 'hold' || isSpectator) return;
    sound.playCardDeal();
    let drawPtr = 0;
    const finalFive = hand.map((card, idx) => {
      if (held[idx]) return card;
      const replacement = deck[drawPtr];
      drawPtr += 1;
      return replacement;
    });

    setHand(finalFive);
    const evalRes = evaluatePokerHand(finalFive);
    setResultHand(evalRes);
    setPhase('complete');

    const payout = wager * evalRes.mult;
    const summary = `Video Poker: ${evalRes.name}`;

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Paytable & 3D ChipRack */}
      <div className="lg:col-span-4 bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
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

          {/* Arcade Neon-Gold Paytable Board */}
          <div className="bg-[#050b08] border-2 border-amber-400/40 rounded-xl p-3 space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-amber-300 mb-1.5">
              9/6 JACKS OR BETTER PAYTABLE
            </div>
            {PAYTABLE.map((row) => {
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
                    {row.mult}x ({(row.mult * wager).toLocaleString()})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Arcade Video Poker Cabinet Screen */}
      <div className="lg:col-span-8 casino-table-rail casino-felt-surface rounded-2xl p-6 flex flex-col justify-between min-h-[400px]">
        <div className="flex items-center justify-between bg-black/40 border border-amber-400/30 rounded-xl px-4 py-2.5">
          <span className="font-display text-sm font-bold text-amber-300 tracking-wider">
            JACKS OR BETTER DRAW POKER
          </span>
          <span className="text-xs font-extrabold text-white uppercase">
            {phase === 'hold'
              ? 'TAP CARDS TO HOLD · THEN PRESS DRAW'
              : resultHand
              ? `${resultHand.name.toUpperCase()} (${resultHand.mult}X)`
              : 'PRESS DEAL TO START'}
          </span>
        </div>

        <div className="my-auto grid grid-cols-5 gap-3 py-4">
          {hand.length === 0
            ? Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-44 rounded-xl bg-gradient-to-br from-amber-900 via-amber-950 to-stone-950 border-2 border-amber-400 flex flex-col items-center justify-center shadow-xl"
                >
                  <div className="w-4/5 h-4/5 rounded-lg border border-amber-400/40 flex items-center justify-center">
                    <span className="font-display text-amber-300 font-bold text-xl">V&amp;B</span>
                  </div>
                </div>
              ))
            : hand.map((card, idx) => {
                const isRed = card.suit === '♥' || card.suit === '♦';
                const isHeld = held[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={phase !== 'hold'}
                    onClick={() => toggleHold(idx)}
                    className={`h-44 rounded-xl bg-white border-4 p-3 flex flex-col justify-between text-left transition-all cursor-pointer relative shadow-xl ${
                      isHeld
                        ? '-translate-y-3 border-amber-400 ring-2 ring-amber-300'
                        : 'border-stone-200 hover:-translate-y-1'
                    }`}
                  >
                    {isHeld && (
                      <div className="absolute -top-3.5 inset-x-2 bg-amber-400 text-stone-950 text-[11px] font-extrabold uppercase text-center py-0.5 rounded border border-stone-950 shadow">
                        HELD
                      </div>
                    )}
                    <div
                      className={`text-lg font-extrabold leading-none ${
                        isRed ? 'text-rose-600' : 'text-stone-900'
                      }`}
                    >
                      <div>{card.rank}</div>
                      <div className="text-sm">{card.suit}</div>
                    </div>
                    <div
                      className={`text-4xl text-center select-none ${
                        isRed ? 'text-rose-600' : 'text-stone-900'
                      }`}
                    >
                      {card.suit}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-stone-400">
                        {phase === 'hold' && !isHeld ? 'HOLD?' : ''}
                      </span>
                      <span
                        className={`text-lg font-extrabold leading-none ${
                          isRed ? 'text-rose-600' : 'text-stone-900'
                        }`}
                      >
                        {card.rank}
                      </span>
                    </div>
                  </button>
                );
              })}
        </div>

        <div className="text-xs font-semibold text-amber-200/80 text-center">
          ROYAL FLUSH PAYS 800 TO 1 · PAIR OF JACKS OR HIGHER WINS
        </div>
      </div>
    </div>
  );
};
