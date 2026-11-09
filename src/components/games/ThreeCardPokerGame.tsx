import React, { useState } from 'react';
import { sound } from '../../utils/sound';
import { ChipRack } from './ChipRack';
import confetti from 'canvas-confetti';
import { shouldPlayerWin53 } from '../../utils/fairRng';
import { Spade, Sparkles, Trophy, ShieldAlert, Award } from 'lucide-react';

interface ThreeCardPokerGameProps {
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
interface Card {
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

interface HandEvaluation {
  name: string;
  score: number; // Higher is better
  pairPlusMult: number;
  anteBonusMult: number;
}

// 3-card poker ranking: Straight Flush > Three of a Kind > Straight > Flush > Pair > High Card
function evaluate3CardHand(hand: Card[]): HandEvaluation {
  if (hand.length !== 3) {
    return { name: 'High Card', score: 0, pairPlusMult: 0, anteBonusMult: 0 };
  }

  const sorted = [...hand].sort((a, b) => b.numValue - a.numValue);
  const values = sorted.map((c) => c.numValue);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isStraight =
    (values[0] - values[1] === 1 && values[1] - values[2] === 1) ||
    (values[0] === 14 && values[1] === 3 && values[2] === 2); // Wheel A-2-3

  const isThreeOfAKind = values[0] === values[1] && values[1] === values[2];
  const isPair = values[0] === values[1] || values[1] === values[2] || values[0] === values[2];

  if (isFlush && isStraight) {
    return { name: 'Straight Flush', score: 6000000 + values[0], pairPlusMult: 40, anteBonusMult: 5 };
  }
  if (isThreeOfAKind) {
    return { name: 'Three of a Kind', score: 5000000 + values[0], pairPlusMult: 30, anteBonusMult: 4 };
  }
  if (isStraight) {
    return { name: 'Straight', score: 4000000 + values[0], pairPlusMult: 6, anteBonusMult: 1 };
  }
  if (isFlush) {
    return { name: 'Flush', score: 3000000 + values[0] * 100 + values[1], pairPlusMult: 3, anteBonusMult: 0 };
  }
  if (isPair) {
    const pairVal = values[0] === values[1] ? values[0] : values[1] === values[2] ? values[1] : values[0];
    return { name: `Pair of ${sorted.find((c) => c.numValue === pairVal)?.rank}s`, score: 2000000 + pairVal * 100, pairPlusMult: 1, anteBonusMult: 0 };
  }

  return { name: `High Card (${sorted[0].rank})`, score: values[0] * 1000 + values[1] * 10 + values[2], pairPlusMult: 0, anteBonusMult: 0 };
}

// Dealer qualifies with Queen-High or better (score >= 12000)
function doesDealerQualify(dealerHand: Card[]): boolean {
  const evalResult = evaluate3CardHand(dealerHand);
  if (evalResult.score >= 2000000) return true; // Has pair or better
  const highest = Math.max(...dealerHand.map((c) => c.numValue));
  return highest >= 12; // Queen or higher
}

export const ThreeCardPokerGame: React.FC<ThreeCardPokerGameProps> = ({
  balance,
  isSpectator,
  minBet,
  onCompleteRound,
}) => {
  const [anteBet, setAnteBet] = useState<number>(Math.max(25, minBet));
  const [pairPlusBet, setPairPlusBet] = useState<number>(0);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [phase, setPhase] = useState<'betting' | 'decision' | 'complete'>('betting');
  const [playerEval, setPlayerEval] = useState<HandEvaluation | null>(null);
  const [dealerEval, setDealerEval] = useState<HandEvaluation | null>(null);
  const [roundOutcome, setRoundOutcome] = useState<{
    status: 'win' | 'loss' | 'push' | 'fold';
    title: string;
    description: string;
    totalPayout: number;
  } | null>(null);

  const totalCurrentWager = anteBet + pairPlusBet;

  const handleDeal = () => {
    if (isSpectator || totalCurrentWager > balance || anteBet < minBet) return;
    sound.playCardDeal();

    const willPlayerWin = shouldPlayerWin53();
    let pHand: Card[];
    let dHand: Card[];

    // Attempt until target win condition met
    let attempts = 0;
    while (attempts < 20) {
      const deck = createShuffledDeck();
      const testP = deck.slice(0, 3);
      const testD = deck.slice(3, 6);
      const pScore = evaluate3CardHand(testP).score;
      const dScore = evaluate3CardHand(testD).score;
      const dQual = doesDealerQualify(testD);

      const isWinCondition = !dQual || pScore > dScore;
      if ((willPlayerWin && isWinCondition) || (!willPlayerWin && !isWinCondition)) {
        pHand = testP;
        dHand = testD;
        break;
      }
      attempts++;
    }

    if (!pHand! || !dHand!) {
      const deck = createShuffledDeck();
      pHand = deck.slice(0, 3);
      dHand = deck.slice(3, 6);
    }

    const pEval = evaluate3CardHand(pHand);
    const dEval = evaluate3CardHand(dHand);

    setPlayerHand(pHand);
    setDealerHand(dHand);
    setPlayerEval(pEval);
    setDealerEval(dEval);
    setPhase('decision');
    setRoundOutcome(null);
  };

  const handleFold = () => {
    if (phase !== 'decision') return;
    sound.playLossThud();

    setPhase('complete');
    setRoundOutcome({
      status: 'fold',
      title: 'Hand Folded',
      description: `Surrendered Ante (${anteBet.toLocaleString()}) and Pair Plus (${pairPlusBet.toLocaleString()}).`,
      totalPayout: 0,
    });

    onCompleteRound({
      wager: totalCurrentWager,
      payout: 0,
      multiplier: 0,
      summary: 'Three Card Poker: Folded',
    });
  };

  const handlePlay = () => {
    if (phase !== 'decision' || !playerEval || !dealerEval) return;
    const playBet = anteBet;
    const totalWager = anteBet + playBet + pairPlusBet;
    if (totalWager > balance) return;

    sound.playCardDeal();
    const dealerQualifies = doesDealerQualify(dealerHand);

    let payout = 0;
    let statusText = '';
    let outcomeStatus: 'win' | 'loss' | 'push' = 'loss';

    // Pair Plus Payout (independent of dealer hand!)
    const pairPlusWin = pairPlusBet > 0 && playerEval.pairPlusMult > 0 ? pairPlusBet + pairPlusBet * playerEval.pairPlusMult : 0;
    payout += pairPlusWin;

    // Ante Bonus (independent of dealer!)
    const anteBonusWin = playerEval.anteBonusMult > 0 ? anteBet * playerEval.anteBonusMult : 0;
    payout += anteBonusWin;

    if (!dealerQualifies) {
      // Dealer does not qualify: Ante pays 1:1, Play bet pushes (returns play bet)
      payout += anteBet * 2; // Ante bet + 1:1 payout
      payout += playBet; // Play bet push
      outcomeStatus = 'win';
      statusText = `Dealer does not qualify (needs Queen-High). Ante pays 1:1, Play bet pushes.`;
    } else if (playerEval.score > dealerEval.score) {
      // Player beats Dealer: Ante pays 1:1, Play pays 1:1
      payout += anteBet * 2;
      payout += playBet * 2;
      outcomeStatus = 'win';
      statusText = `Player ${playerEval.name} beats Dealer ${dealerEval.name}! Ante and Play both pay 1:1.`;
    } else if (playerEval.score === dealerEval.score) {
      // Push: Ante and Play return
      payout += anteBet + playBet;
      outcomeStatus = 'push';
      statusText = `Tied hands (${playerEval.name}). Push.`;
    } else {
      // Dealer wins: Ante and Play lost
      outcomeStatus = 'loss';
      statusText = `Dealer ${dealerEval.name} beats Player ${playerEval.name}.`;
    }

    setPhase('complete');
    setRoundOutcome({
      status: outcomeStatus,
      title: outcomeStatus === 'win' ? 'Player Victory!' : outcomeStatus === 'push' ? 'Push (Tie)' : 'House Wins',
      description: statusText,
      totalPayout: payout,
    });

    const multiplier = totalWager > 0 ? Number((payout / totalWager).toFixed(2)) : 0;

    if (payout > totalWager) {
      sound.playWinChime(multiplier >= 3);
      if (multiplier >= 4) {
        confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
      }
    } else {
      sound.playLossThud();
    }

    onCompleteRound({
      wager: totalWager,
      payout,
      multiplier,
      summary: `Three Card Poker: ${playerEval.name} vs ${dealerEval.name}`,
    });
  };

  const cardSuitColor = (suit: Suit) => (suit === '♥' || suit === '♦' ? 'text-rose-400' : 'text-stone-200');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Paytable & Pair Plus Rules */}
      <div className="lg:col-span-4 bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="font-display text-sm font-bold text-amber-200">Pair Plus Paytable</h3>
            </div>
            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
              Bonus Side Bet
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {[
              { hand: 'Straight Flush', mult: '40 to 1', anteBonus: '5 to 1' },
              { hand: 'Three of a Kind', mult: '30 to 1', anteBonus: '4 to 1' },
              { hand: 'Straight', mult: '6 to 1', anteBonus: '1 to 1' },
              { hand: 'Flush', mult: '3 to 1', anteBonus: '—' },
              { hand: 'Pair', mult: '1 to 1', anteBonus: '—' },
            ].map((row) => (
              <div
                key={row.hand}
                className="flex items-center justify-between p-2 rounded-lg bg-stone-900/60 border border-stone-800"
              >
                <span className="font-medium text-stone-200">{row.hand}</span>
                <div className="flex items-center gap-3 font-mono-tabular">
                  <span className="text-amber-300 font-bold">{row.mult}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-stone-300 space-y-1 leading-relaxed">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Table Rules:</span>
            </div>
            <p>• Dealer qualifies with Queen-High or better.</p>
            <p>• If dealer does not qualify, Ante pays 1:1 and Play pushes.</p>
            <p>• Straight beats Flush in 3-Card Poker odds!</p>
          </div>
        </div>

        {/* Wager Adjusters */}
        <div className="pt-4 border-t border-stone-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-300">Pair Plus Bet:</span>
            <div className="flex items-center gap-1">
              {[0, 25, 50, 100, 250].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={phase !== 'betting'}
                  onClick={() => setPairPlusBet(amt)}
                  className={`px-2 py-1 rounded text-[11px] font-mono-tabular cursor-pointer ${
                    pairPlusBet === amt
                      ? 'bg-amber-400 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {amt === 0 ? 'Off' : amt}
                </button>
              ))}
            </div>
          </div>
          <ChipRack
            balance={balance}
            wager={anteBet}
            onChangeWager={(val: number) => setAnteBet(val)}
            minBet={minBet}
            disabled={phase !== 'betting'}
          />
        </div>
      </div>

      {/* Right Felt Table */}
      <div className="lg:col-span-8 relative rounded-3xl p-6 sm:p-8 border-4 border-[#3d2719] bg-gradient-to-b from-[#0a2318] via-[#071911] to-[#040e0a] shadow-2xl flex flex-col justify-between min-h-[500px]">
        {/* Dealer Section */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-stone-900 border border-amber-500/40 flex items-center justify-center text-xs">
              🎩
            </div>
            <div className="text-xs font-bold text-stone-300 uppercase tracking-widest">
              House Dealer
            </div>
          </div>

          {/* Dealer 3 Cards */}
          <div className="flex items-center gap-3">
            {[0, 1, 2].map((idx) => {
              const card = dealerHand[idx];
              return (
                <div
                  key={idx}
                  className={`w-16 sm:w-20 h-24 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-between p-2 shadow-lg transition-all ${
                    card
                      ? phase === 'complete'
                        ? 'bg-gradient-to-b from-stone-50 to-stone-100 border-amber-400/80 text-stone-900'
                        : 'bg-red-950 border-amber-500/40 text-amber-200'
                      : 'border-dashed border-emerald-500/30 bg-emerald-950/20'
                  }`}
                >
                  {card ? (
                    phase === 'complete' ? (
                      <>
                        <div className={`self-start text-xs font-black ${cardSuitColor(card.suit)}`}>
                          {card.rank}
                        </div>
                        <div className={`text-2xl ${cardSuitColor(card.suit)}`}>{card.suit}</div>
                        <div className={`self-end text-xs font-black ${cardSuitColor(card.suit)}`}>
                          {card.rank}
                        </div>
                      </>
                    ) : (
                      <div className="m-auto font-serif text-2xl text-amber-300/60">♠</div>
                    )
                  ) : (
                    <div className="m-auto text-[10px] text-emerald-600/40 uppercase">Card {idx + 1}</div>
                  )}
                </div>
              );
            })}
          </div>

          {phase === 'complete' && dealerEval && (
            <div className="mt-2 text-xs font-semibold text-amber-300">
              Dealer Hand: {dealerEval.name} ·{' '}
              {doesDealerQualify(dealerHand) ? 'Qualifies' : 'Did Not Qualify (Q High required)'}
            </div>
          )}
        </div>

        {/* Center Plaque / Table Bet Circles */}
        <div className="my-auto py-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-6">
            {/* Ante Bet Circle */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-400/70 bg-amber-500/10 flex flex-col items-center justify-center shadow-inner">
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">ANTE</span>
                <span className="font-mono-tabular text-xs font-black text-white">
                  {anteBet.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Pair Plus Circle */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-400/70 bg-emerald-500/10 flex flex-col items-center justify-center shadow-inner">
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">PAIR+</span>
                <span className="font-mono-tabular text-xs font-black text-white">
                  {pairPlusBet.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Play Bet Circle (when in decision / complete) */}
            <div className="flex flex-col items-center">
              <div
                className={`w-16 h-16 rounded-full border-2 border-dashed flex flex-col items-center justify-center shadow-inner ${
                  phase === 'complete'
                    ? 'border-amber-400 bg-amber-500/15'
                    : 'border-stone-700 bg-stone-900/40 text-stone-500'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-bold">PLAY</span>
                <span className="font-mono-tabular text-xs font-black">
                  {phase === 'complete' ? anteBet.toLocaleString() : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Result Banner */}
          {roundOutcome && (
            <div
              className={`mt-4 px-6 py-2 rounded-2xl border text-xs font-semibold text-center max-w-md ${
                roundOutcome.status === 'win'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : roundOutcome.status === 'push'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-rose-500/20 border-rose-400 text-rose-200'
              }`}
            >
              <div className="font-bold text-sm">{roundOutcome.title}</div>
              <div className="text-[11px] opacity-90 mt-0.5">{roundOutcome.description}</div>
            </div>
          )}
        </div>

        {/* Player Section */}
        <div className="flex flex-col items-center">
          {/* Player 3 Cards */}
          <div className="flex items-center gap-3">
            {[0, 1, 2].map((idx) => {
              const card = playerHand[idx];
              return (
                <div
                  key={idx}
                  className={`w-16 sm:w-20 h-24 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-between p-2 shadow-lg transition-all ${
                    card
                      ? 'bg-gradient-to-b from-stone-50 via-white to-stone-100 border-amber-400 text-stone-900 scale-100'
                      : 'border-dashed border-emerald-500/30 bg-emerald-950/20 text-emerald-600/40'
                  }`}
                >
                  {card ? (
                    <>
                      <div className={`self-start text-xs font-black ${cardSuitColor(card.suit)}`}>
                        {card.rank}
                      </div>
                      <div className={`text-2xl ${cardSuitColor(card.suit)}`}>{card.suit}</div>
                      <div className={`self-end text-xs font-black ${cardSuitColor(card.suit)}`}>
                        {card.rank}
                      </div>
                    </>
                  ) : (
                    <div className="m-auto text-[10px] text-emerald-600/40 uppercase">Your Card</div>
                  )}
                </div>
              );
            })}
          </div>

          {playerEval && (
            <div className="mt-2 text-xs font-bold text-white flex items-center gap-2">
              <span>Your Hand: {playerEval.name}</span>
              {playerEval.pairPlusMult > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-400/30">
                  Pair+ Bonus {playerEval.pairPlusMult}x!
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-3">
            {phase === 'betting' && (
              <button
                type="button"
                onClick={handleDeal}
                disabled={isSpectator || totalCurrentWager > balance || anteBet < minBet}
                className="px-8 py-3.5 btn-arcade-gold font-black rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Deal 3-Card Poker ({totalCurrentWager.toLocaleString()} Chips)</span>
              </button>
            )}

            {phase === 'decision' && (
              <>
                <button
                  type="button"
                  onClick={handleFold}
                  className="px-6 py-3 btn-arcade-crimson font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Fold Hand
                </button>
                <button
                  type="button"
                  onClick={handlePlay}
                  className="px-8 py-3 btn-arcade-gold font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Play ({anteBet.toLocaleString()} Chips)
                </button>
              </>
            )}

            {phase === 'complete' && (
              <button
                type="button"
                onClick={() => setPhase('betting')}
                className="px-8 py-3 btn-arcade-emerald font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                Next Hand
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
