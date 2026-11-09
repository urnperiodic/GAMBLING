import React, { useState, useEffect } from 'react';
import { sound } from '../../utils/sound';
import { ChipRack } from './ChipRack';
import confetti from 'canvas-confetti';
import { shouldPlayerWin53 } from '../../utils/fairRng';
import { Trophy, HelpCircle, Flame, Users, Sparkles, AlertCircle } from 'lucide-react';

interface HoldemGameProps {
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
  onEmergencyBailout?: () => void;
}

type Suit = '♠' | '♥' | '♦' | '♣';
interface Card {
  rank: string;
  numValue: number;
  suit: Suit;
}

interface PlayerSeat {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  folded: boolean;
  role: 'bot' | 'user';
  handName?: string;
  handRankVal?: number;
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

function createShuffledDeck(): Card[] {
  const deck: Card[] = [];
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

// 7-card evaluator picking best 5
function evaluateBest5Of7(allCards: Card[]): { name: string; score: number } {
  if (allCards.length < 5) return { name: 'High Card', score: 0 };

  // Generate all 21 combinations of 5 from 7
  const combos: Card[][] = [];
  function k_combinations(set: Card[], k: number) {
    function run(sub: Card[], index: number) {
      if (sub.length === k) {
        combos.push(sub);
        return;
      }
      for (let i = index; i < set.length; i++) {
        run([...sub, set[i]], i + 1);
      }
    }
    run([], 0);
  }
  k_combinations(allCards, 5);

  let bestScore = -1;
  let bestName = 'High Card';

  for (const hand of combos) {
    const evalRes = evaluate5CardHand(hand);
    if (evalRes.score > bestScore) {
      bestScore = evalRes.score;
      bestName = evalRes.name;
    }
  }

  return { name: bestName, score: bestScore };
}

function evaluate5CardHand(hand: Card[]): { name: string; score: number } {
  const sorted = [...hand].sort((a, b) => b.numValue - a.numValue);
  const values = sorted.map((c) => c.numValue);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);
  const isStraight =
    (values[0] - values[1] === 1 &&
      values[1] - values[2] === 1 &&
      values[2] - values[3] === 1 &&
      values[3] - values[4] === 1) ||
    (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2); // Wheel A-2-3-4-5

  const counts: Record<number, number> = {};
  values.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  const countsEntries = Object.entries(counts).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]));

  // Hand rank base scores:
  // Royal Flush: 9000000
  // Straight Flush: 8000000
  // Four of a Kind: 7000000
  // Full House: 6000000
  // Flush: 5000000
  // Straight: 4000000
  // Three of a Kind: 3000000
  // Two Pair: 2000000
  // One Pair: 1000000
  // High Card: 0

  if (isFlush && isStraight && values[0] === 14 && values[1] === 13) {
    return { name: 'Royal Flush', score: 9000000 };
  }
  if (isFlush && isStraight) {
    return { name: `Straight Flush (${sorted[0].rank} High)`, score: 8000000 + values[0] };
  }
  if (countsEntries[0][1] === 4) {
    const quadVal = Number(countsEntries[0][0]);
    return { name: `Four of a Kind (${quadVal}s)`, score: 7000000 + quadVal * 100 + values[4] };
  }
  if (countsEntries[0][1] === 3 && countsEntries[1][1] === 2) {
    const tripVal = Number(countsEntries[0][0]);
    const pairVal = Number(countsEntries[1][0]);
    return { name: `Full House (${tripVal}s full of ${pairVal}s)`, score: 6000000 + tripVal * 100 + pairVal };
  }
  if (isFlush) {
    return { name: `Flush (${sorted[0].rank} High)`, score: 5000000 + values[0] * 1000 + values[1] };
  }
  if (isStraight) {
    return { name: `Straight (${sorted[0].rank} High)`, score: 4000000 + values[0] };
  }
  if (countsEntries[0][1] === 3) {
    const tripVal = Number(countsEntries[0][0]);
    return { name: `Three of a Kind (${tripVal}s)`, score: 3000000 + tripVal * 100 + values[3] };
  }
  if (countsEntries[0][1] === 2 && countsEntries[1][1] === 2) {
    const highPair = Math.max(Number(countsEntries[0][0]), Number(countsEntries[1][0]));
    const lowPair = Math.min(Number(countsEntries[0][0]), Number(countsEntries[1][0]));
    return { name: `Two Pair (${highPair}s and ${lowPair}s)`, score: 2000000 + highPair * 1000 + lowPair * 10 };
  }
  if (countsEntries[0][1] === 2) {
    const pairVal = Number(countsEntries[0][0]);
    return { name: `One Pair of ${pairVal}s`, score: 1000000 + pairVal * 100 + values[2] };
  }

  return { name: `High Card (${sorted[0].rank})`, score: values[0] * 1000 + values[1] * 100 };
}

export const HoldemGame: React.FC<HoldemGameProps> = ({
  balance,
  isSpectator,
  minBet,
  onCompleteRound,
  onEmergencyBailout,
}) => {
  const [wager, setWager] = useState<number>(Math.max(50, minBet));
  const [deck, setDeck] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pot, setPot] = useState<number>(0);
  const [phase, setPhase] = useState<'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('idle');
  const [seats, setSeats] = useState<PlayerSeat[]>([
    { id: 'user', name: 'You (Hero)', chips: balance, cards: [], currentBet: 0, folded: false, role: 'user' },
    { id: 'bot1', name: 'Baron Von Brass', chips: 15000, cards: [], currentBet: 0, folded: false, role: 'bot' },
    { id: 'bot2', name: 'Lady Eleanor', chips: 22000, cards: [], currentBet: 0, folded: false, role: 'bot' },
    { id: 'bot3', name: 'Jasper Boone', chips: 9500, cards: [], currentBet: 0, folded: false, role: 'bot' },
  ]);
  const [currentCallAmount, setCurrentCallAmount] = useState<number>(0);
  const [heroTotalWagered, setHeroTotalWagered] = useState<number>(0);
  const [outcomeMessage, setOutcomeMessage] = useState<string>('');
  const [winnerId, setWinnerId] = useState<string | null>(null);

  // Sync user chips
  useEffect(() => {
    setSeats((prev) => prev.map((s) => (s.role === 'user' ? { ...s, chips: balance } : s)));
  }, [balance]);

  const handleStartDeal = () => {
    if (isSpectator || wager > balance || wager < minBet) return;
    sound.playCardDeal();
    const freshDeck = createShuffledDeck();

    const blindAmount = wager;
    let cardIdx = 0;

    const newSeats: PlayerSeat[] = [
      { id: 'user', name: 'You (Hero)', chips: balance - blindAmount, cards: [freshDeck[cardIdx++], freshDeck[cardIdx++]], currentBet: blindAmount, folded: false, role: 'user' },
      { id: 'bot1', name: 'Baron Von Brass', chips: 15000 - blindAmount, cards: [freshDeck[cardIdx++], freshDeck[cardIdx++]], currentBet: blindAmount, folded: false, role: 'bot' },
      { id: 'bot2', name: 'Lady Eleanor', chips: 22000 - blindAmount, cards: [freshDeck[cardIdx++], freshDeck[cardIdx++]], currentBet: blindAmount, folded: false, role: 'bot' },
      { id: 'bot3', name: 'Jasper Boone', chips: 9500 - blindAmount, cards: [freshDeck[cardIdx++], freshDeck[cardIdx++]], currentBet: blindAmount, folded: false, role: 'bot' },
    ];

    setDeck(freshDeck.slice(cardIdx));
    setCommunityCards([]);
    setSeats(newSeats);
    setPot(blindAmount * 4);
    setCurrentCallAmount(0);
    setHeroTotalWagered(blindAmount);
    setOutcomeMessage('Pre-Flop Betting · Check or Bet to advance to the Flop');
    setWinnerId(null);
    setPhase('preflop');
  };

  const advanceStage = (nextPhase: 'flop' | 'turn' | 'river' | 'showdown', extraHeroBet: number = 0) => {
    sound.playChipClick();
    let currentDeck = [...deck];
    let newCommunity = [...communityCards];

    if (nextPhase === 'flop') {
      newCommunity = currentDeck.slice(0, 3);
      currentDeck = currentDeck.slice(3);
      sound.playCardDeal();
    } else if (nextPhase === 'turn') {
      newCommunity.push(currentDeck[0]);
      currentDeck = currentDeck.slice(1);
      sound.playCardDeal();
    } else if (nextPhase === 'river') {
      newCommunity.push(currentDeck[0]);
      currentDeck = currentDeck.slice(1);
      sound.playCardDeal();
    }

    setDeck(currentDeck);
    setCommunityCards(newCommunity);

    // Bot reactions: some call, some fold if bet is high
    let additionalPot = extraHeroBet;
    const updatedSeats = seats.map((seat) => {
      if (seat.role === 'user') {
        return { ...seat, currentBet: seat.currentBet + extraHeroBet };
      }
      if (seat.folded) return seat;

      // Realistic bot AI decisions
      const shouldFold = extraHeroBet > 0 && Math.random() < 0.15;
      if (shouldFold) {
        return { ...seat, folded: true };
      }
      additionalPot += extraHeroBet;
      return { ...seat, currentBet: seat.currentBet + extraHeroBet, chips: seat.chips - extraHeroBet };
    });

    const newPot = pot + additionalPot;
    setPot(newPot);
    setSeats(updatedSeats);

    if (nextPhase === 'showdown') {
      handleShowdown(newCommunity, updatedSeats, newPot);
    } else {
      setPhase(nextPhase);
      const stageName = nextPhase.toUpperCase();
      setOutcomeMessage(`${stageName} Dealt · Pot: ${newPot.toLocaleString()} chips. Place your bet or check.`);
    }
  };

  const handleShowdown = (finalCommunity: Card[], currentSeats: PlayerSeat[], totalPot: number) => {
    sound.playCardDeal();
    setPhase('showdown');

    // Evaluate each seat's best 5 cards
    let winningScore = -1;
    let winningSeatId = 'user';
    let winningHandTitle = '';
    const willPlayerWin = shouldPlayerWin53();

    const evaluatedSeats = currentSeats.map((seat) => {
      if (seat.folded) {
        return { ...seat, handName: 'Folded', handRankVal: -1 };
      }
      const evalResult = evaluateBest5Of7([...seat.cards, ...finalCommunity]);
      return {
        ...seat,
        handName: evalResult.name,
        handRankVal: evalResult.score,
      };
    });

    // 53% Player Win / 47% House/Bot Win
    const heroSeat = evaluatedSeats.find((s) => s.id === 'user' && !s.folded);
    if (heroSeat && willPlayerWin) {
      winningSeatId = 'user';
      winningHandTitle = heroSeat.handName || 'Winning Hand';
    } else {
      for (const s of evaluatedSeats) {
        if (!s.folded && (s.handRankVal || 0) > winningScore) {
          winningScore = s.handRankVal || 0;
          winningSeatId = s.id;
          winningHandTitle = s.handName || 'Winning Hand';
        }
      }
    }

    setSeats(evaluatedSeats);
    setWinnerId(winningSeatId);

    const heroWon = winningSeatId === 'user';
    const totalPayout = heroWon ? totalPot : 0;
    const multiplier = heroTotalWagered > 0 ? Number((totalPayout / heroTotalWagered).toFixed(2)) : 0;

    if (heroWon) {
      sound.playWinChime(true);
      confetti({ particleCount: 65, spread: 70, origin: { y: 0.6 } });
      setOutcomeMessage(`VICTORY! You won the ${totalPot.toLocaleString()} chip pot with ${winningHandTitle}!`);
    } else {
      sound.playLossThud();
      const winner = currentSeats.find((s) => s.id === winningSeatId);
      setOutcomeMessage(`${winner?.name} took the pot with ${winningHandTitle}.`);
    }

    onCompleteRound({
      wager: heroTotalWagered,
      payout: totalPayout,
      multiplier,
      summary: heroWon
        ? `Texas Hold'em: Won Pot with ${winningHandTitle}`
        : `Texas Hold'em: Lost to ${winningHandTitle}`,
    });
  };

  const handleFold = () => {
    if (phase === 'idle' || phase === 'showdown') return;
    sound.playLossThud();
    setSeats((prev) => prev.map((s) => (s.role === 'user' ? { ...s, folded: true } : s)));
    setPhase('showdown');
    setWinnerId('bot1');
    setOutcomeMessage('You folded the hand. Pot surrendered to the table.');

    onCompleteRound({
      wager: heroTotalWagered,
      payout: 0,
      multiplier: 0,
      summary: "Texas Hold'em: Hero Folded",
    });
  };

  const handleCheck = () => {
    if (phase === 'preflop') advanceStage('flop', 0);
    else if (phase === 'flop') advanceStage('turn', 0);
    else if (phase === 'turn') advanceStage('river', 0);
    else if (phase === 'river') advanceStage('showdown', 0);
  };

  const handleBetRaise = (extraBet: number) => {
    const betCost = Math.min(extraBet, balance - heroTotalWagered);
    if (betCost <= 0) return;
    setHeroTotalWagered((prev) => prev + betCost);

    if (phase === 'preflop') advanceStage('flop', betCost);
    else if (phase === 'flop') advanceStage('turn', betCost);
    else if (phase === 'turn') advanceStage('river', betCost);
    else if (phase === 'river') advanceStage('showdown', betCost);
  };

  const heroSeat = seats.find((s) => s.role === 'user');
  const botSeats = seats.filter((s) => s.role === 'bot');

  const cardSuitColor = (suit: Suit) => (suit === '♥' || suit === '♦' ? 'text-rose-400' : 'text-stone-200');

  return (
    <div className="space-y-6">
      {/* Oval Poker Table Felt */}
      <div className="relative rounded-3xl p-6 sm:p-8 border-4 border-[#3d2719] bg-gradient-to-b from-[#0e2c20] via-[#091f16] to-[#05140e] shadow-2xl overflow-hidden min-h-[480px] flex flex-col justify-between">
        {/* Felt Watermark / Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <span className="font-display text-8xl font-black text-amber-300">TEXAS HOLD'EM</span>
        </div>

        {/* Top: Opponent Bot Seats */}
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {botSeats.map((bot) => {
            const isWinner = winnerId === bot.id;
            return (
              <div
                key={bot.id}
                className={`p-3 rounded-2xl border transition-all ${
                  isWinner
                    ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20'
                    : bot.folded
                    ? 'bg-black/40 border-stone-800 opacity-50'
                    : 'bg-[#06120d]/80 border-emerald-500/20'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-stone-200 truncate">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="truncate">{bot.name}</span>
                  </div>
                  {isWinner && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {bot.cards.length > 0 ? (
                      bot.cards.map((c, i) => (
                        <div
                          key={i}
                          className="w-8 h-12 rounded bg-gradient-to-b from-stone-100 to-stone-200 border border-stone-300 flex flex-col items-center justify-center text-[11px] font-bold shadow-sm"
                        >
                          {phase === 'showdown' ? (
                            <span className={cardSuitColor(c.suit)}>
                              {c.rank}
                              {c.suit}
                            </span>
                          ) : (
                            <div className="w-6 h-10 rounded bg-red-900 border border-amber-400/50 flex items-center justify-center text-[10px] text-amber-200 font-serif">
                              ♠
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-stone-500 italic">Waiting...</div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-mono-tabular text-xs font-bold text-amber-300">
                      {bot.chips.toLocaleString()}
                    </div>
                    {bot.folded ? (
                      <span className="text-[10px] text-stone-500 uppercase font-semibold">Folded</span>
                    ) : (
                      phase === 'showdown' && (
                        <div className="text-[10px] text-emerald-300 font-semibold max-w-[90px] truncate">
                          {bot.handName}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Community Cards & Pot Chip Plaque */}
        <div className="my-auto py-6 flex flex-col items-center justify-center text-center relative z-10">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-black/60 border border-amber-500/40 shadow-inner mb-4">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Table Pot:</span>
            </div>
            <span className="font-mono-tabular text-xl sm:text-2xl font-black text-white">
              {pot.toLocaleString()}
            </span>
            <span className="text-xs text-amber-400 font-semibold">Chips</span>
          </div>

          {/* 5 Community Cards */}
          <div className="flex items-center gap-2 sm:gap-3">
            {[0, 1, 2, 3, 4].map((idx) => {
              const card = communityCards[idx];
              return (
                <div
                  key={idx}
                  className={`w-14 sm:w-16 h-20 sm:h-24 rounded-xl border-2 flex flex-col items-center justify-between p-1.5 sm:p-2 shadow-lg transition-all ${
                    card
                      ? 'bg-gradient-to-b from-stone-50 via-white to-stone-100 border-amber-400/60 text-stone-900 scale-100'
                      : 'border-dashed border-emerald-500/30 bg-emerald-950/20 text-emerald-600/40'
                  }`}
                >
                  {card ? (
                    <>
                      <div className={`self-start text-xs font-black ${cardSuitColor(card.suit)}`}>
                        {card.rank}
                      </div>
                      <div className={`text-xl sm:text-2xl ${cardSuitColor(card.suit)}`}>
                        {card.suit}
                      </div>
                      <div className={`self-end text-xs font-black ${cardSuitColor(card.suit)}`}>
                        {card.rank}
                      </div>
                    </>
                  ) : (
                    <div className="m-auto text-xs font-display font-semibold uppercase tracking-widest text-emerald-600/30">
                      {idx < 3 ? 'FLOP' : idx === 3 ? 'TURN' : 'RIVER'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Table Outcome / Prompt Banner */}
          <div className="mt-4 px-4 py-1.5 rounded-full bg-stone-950/80 border border-amber-500/30 text-xs font-medium text-amber-200">
            {outcomeMessage || "Place initial wager & deal to play Texas Hold'em"}
          </div>
        </div>

        {/* Bottom: Hero (User) Player Seat */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#06120d]/90 p-4 rounded-2xl border border-amber-500/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center font-bold text-amber-200">
              👑
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{heroSeat?.name}</span>
                {winnerId === 'user' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-400/30">
                    ROUND WINNER
                  </span>
                )}
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">
                Total In Pot:{' '}
                <span className="font-mono-tabular font-bold text-amber-300">
                  {heroTotalWagered.toLocaleString()} chips
                </span>
                {phase === 'showdown' && heroSeat?.handName && (
                  <span className="ml-2 text-emerald-300 font-semibold">({heroSeat.handName})</span>
                )}
              </div>
            </div>
          </div>

          {/* Hero 2 Hole Cards */}
          <div className="flex items-center gap-2">
            {heroSeat?.cards && heroSeat.cards.length > 0 ? (
              heroSeat.cards.map((c, i) => (
                <div
                  key={i}
                  className="w-14 h-20 rounded-xl bg-gradient-to-b from-stone-50 to-stone-100 border-2 border-amber-400 flex flex-col items-center justify-between p-1.5 shadow-md"
                >
                  <div className={`self-start text-xs font-black ${cardSuitColor(c.suit)}`}>
                    {c.rank}
                  </div>
                  <div className={`text-xl ${cardSuitColor(c.suit)}`}>{c.suit}</div>
                  <div className={`self-end text-xs font-black ${cardSuitColor(c.suit)}`}>
                    {c.rank}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-stone-400 italic">2 Hole Cards Dealt on Start</div>
            )}
          </div>
        </div>
      </div>

      {/* Control Strip & Chip Rack */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
        <div className="xl:col-span-6 bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-4 shadow-xl">
          <div className="text-xs font-semibold text-amber-200 mb-2">Stake / Raise Amount:</div>
          <ChipRack
            balance={balance}
            wager={wager}
            onChangeWager={(val: number) => setWager(val)}
            minBet={minBet}
            disabled={phase !== 'idle'}
            onEmergencyBailout={onEmergencyBailout}
          />
        </div>

        <div className="xl:col-span-6 flex flex-wrap items-center justify-end gap-2.5">
          {phase === 'idle' || phase === 'showdown' ? (
            <div className="flex flex-wrap items-center gap-2">
              {balance < minBet && onEmergencyBailout && (
                <button
                  type="button"
                  onClick={onEmergencyBailout}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg animate-pulse"
                >
                  ⚡ Claim +5,000 Bailout
                </button>
              )}
              <button
                type="button"
                onClick={handleStartDeal}
                disabled={isSpectator || wager > balance || wager < minBet}
                className="px-6 py-3.5 btn-arcade-gold font-black rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Deal Texas Hold'em ({wager.toLocaleString()} Chips)</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleFold}
                className="px-5 py-3 btn-arcade-crimson font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                Fold Hand
              </button>
              <button
                type="button"
                onClick={handleCheck}
                className="px-5 py-3 btn-arcade-emerald font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                Check
              </button>
              <button
                type="button"
                onClick={() => handleBetRaise(wager)}
                className="px-5 py-3 btn-arcade-gold font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                Bet / Raise +{wager.toLocaleString()}
              </button>
              <button
                type="button"
                onClick={() => handleBetRaise(wager * 2)}
                className="px-5 py-3 btn-arcade-gold font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                2x Pot ({ (wager * 2).toLocaleString()} )
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
