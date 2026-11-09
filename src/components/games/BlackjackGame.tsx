import React, { useState } from 'react';
import { sound } from '../../utils/sound';
import { ChipRack } from './ChipRack';
import confetti from 'canvas-confetti';
import { shouldPlayerWin53 } from '../../utils/fairRng';

interface BlackjackGameProps {
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
interface PlayingCard {
  rank: string;
  suit: Suit;
  value: number;
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS = [
  { rank: 'A', value: 11 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: 10 },
];

function drawRandomCard(): PlayingCard {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const r = RANKS[Math.floor(Math.random() * RANKS.length)];
  return { rank: r.rank, suit, value: r.value };
}

function calculateHandTotal(cards: PlayingCard[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.value;
    if (c.rank === 'A') aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export const BlackjackGame: React.FC<BlackjackGameProps> = ({
  balance,
  isSpectator,
  minBet,
  onCompleteRound,
  onEmergencyBailout,
}) => {
  const [wager, setWager] = useState<number>(Math.max(50, minBet));
  const [activeWager, setActiveWager] = useState<number>(0);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [phase, setPhase] = useState<'betting' | 'player-turn' | 'complete'>('betting');
  const [outcomeText, setOutcomeText] = useState<string>('Stack your chips and press DEAL HAND!');

  const renderCard = (card: PlayingCard, hidden: boolean = false, index: number = 0) => {
    if (hidden) {
      return (
        <div
          key={index}
          className="w-24 h-34 rounded-xl bg-gradient-to-br from-amber-900 via-amber-950 to-stone-950 border-2 border-amber-400 flex flex-col items-center justify-center shadow-xl -ml-3 first:ml-0"
        >
          <div className="w-18 h-28 rounded-lg border border-amber-400/40 flex items-center justify-center">
            <span className="font-display text-amber-300 font-bold text-lg">V&amp;B</span>
          </div>
        </div>
      );
    }
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
      <div
        key={index}
        className="w-24 h-34 rounded-xl bg-white border-2 border-stone-200 p-2.5 flex flex-col justify-between shadow-xl text-stone-900 -ml-3 first:ml-0 transition-transform hover:-translate-y-1"
      >
        <div className={`text-base font-extrabold leading-none ${isRed ? 'text-rose-600' : 'text-stone-900'}`}>
          <div>{card.rank}</div>
          <div className="text-sm">{card.suit}</div>
        </div>
        <div className={`text-3xl text-center select-none ${isRed ? 'text-rose-600' : 'text-stone-900'}`}>
          {card.suit}
        </div>
        <div
          className={`text-base font-extrabold leading-none text-right ${
            isRed ? 'text-rose-600' : 'text-stone-900'
          }`}
        >
          {card.rank}
        </div>
      </div>
    );
  };

  const resolveDealerAndFinish = (currentPlayerCards: PlayingCard[], currentDealerCards: PlayingCard[], bet: number) => {
    const pTotal = calculateHandTotal(currentPlayerCards);
    const dCards = [...currentDealerCards];

    const willPlayerWin = shouldPlayerWin53();
    if (pTotal <= 21 && willPlayerWin) {
      // 53% of games: Dealer either stops below player or busts
      while (calculateHandTotal(dCards) < 17 && calculateHandTotal(dCards) < pTotal) {
        dCards.push(drawRandomCard());
      }
      if (calculateHandTotal(dCards) >= 17 && calculateHandTotal(dCards) > pTotal && calculateHandTotal(dCards) <= 21 && Math.random() < 0.6) {
        // Dealer takes an extra hit and busts
        dCards.push(drawRandomCard());
      }
    } else {
      // 47% of games: Standard house draw
      while (calculateHandTotal(dCards) < 17) {
        dCards.push(drawRandomCard());
      }
    }
    const dTotal = calculateHandTotal(dCards);
    setDealerHand(dCards);
    setPhase('complete');

    let payout = 0;
    let multiplier = 0;
    let summary = '';

    if (pTotal > 21) {
      payout = 0;
      multiplier = 0;
      summary = `BUST! (${pTotal} vs Dealer ${dTotal})`;
      sound.playLossThud();
    } else if (dTotal > 21 || pTotal > dTotal) {
      payout = bet * 2;
      multiplier = 2;
      summary = `VICTORY! ${pTotal} beats Dealer ${dTotal} (+${payout.toLocaleString()})`;
      sound.playWinChime(false);
    } else if (pTotal === dTotal) {
      payout = bet;
      multiplier = 1;
      summary = `PUSH! Tied at ${pTotal} (Wager Returned)`;
      sound.playChipClick();
    } else {
      payout = 0;
      multiplier = 0;
      summary = `DEALER WINS (${dTotal} vs ${pTotal})`;
      sound.playLossThud();
    }

    setOutcomeText(summary);
    onCompleteRound({ wager: bet, payout, multiplier, summary });
  };

  const startHand = () => {
    if (isSpectator || wager > balance || wager < minBet) return;
    sound.playCardDeal();

    const pCards = [drawRandomCard(), drawRandomCard()];
    const dCards = [drawRandomCard(), drawRandomCard()];

    setPlayerHand(pCards);
    setDealerHand(dCards);
    setActiveWager(wager);

    const pTotal = calculateHandTotal(pCards);
    const dTotal = calculateHandTotal(dCards);

    if (pTotal === 21) {
      setPhase('complete');
      if (dTotal === 21) {
        const summary = 'Double Natural Blackjack Push (21 vs 21)';
        setOutcomeText(summary);
        onCompleteRound({ wager, payout: wager, multiplier: 1, summary });
      } else {
        const payout = Math.round(wager * 2.5);
        const summary = `BLACKJACK 21! Pays 3:2 (+${payout.toLocaleString()} Chips)`;
        setOutcomeText(summary);
        sound.playWinChime(true);
        confetti({ particleCount: 55, spread: 65, origin: { y: 0.65 } });
        onCompleteRound({ wager, payout, multiplier: 2.5, summary });
      }
      return;
    }

    setPhase('player-turn');
    setOutcomeText(`Hand Value: ${pTotal} — Choose HIT, STAND, or DOUBLE 2X`);
  };

  const handleHit = () => {
    if (phase !== 'player-turn') return;
    sound.playCardDeal();
    const nextCards = [...playerHand, drawRandomCard()];
    setPlayerHand(nextCards);
    const total = calculateHandTotal(nextCards);
    if (total >= 21) {
      resolveDealerAndFinish(nextCards, dealerHand, activeWager);
    } else {
      setOutcomeText(`Hand Value: ${total} — HIT or STAND?`);
    }
  };

  const handleStand = () => {
    if (phase !== 'player-turn') return;
    sound.playCardDeal();
    resolveDealerAndFinish(playerHand, dealerHand, activeWager);
  };

  const handleDoubleDown = () => {
    if (phase !== 'player-turn' || playerHand.length !== 2 || activeWager * 2 > balance) return;
    sound.playCardDeal();
    const doubledBet = activeWager * 2;
    setActiveWager(doubledBet);
    const nextCards = [...playerHand, drawRandomCard()];
    setPlayerHand(nextCards);
    resolveDealerAndFinish(nextCards, dealerHand, doubledBet);
  };

  const playerTotal = calculateHandTotal(playerHand);
  const dealerVisibleTotal =
    phase === 'player-turn' && dealerHand.length > 0
      ? dealerHand[0].value
      : calculateHandTotal(dealerHand);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      {/* Left Arcade Control Console */}
      <div className="xl:col-span-4 bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
        <div className="space-y-5">
          <ChipRack
            wager={wager}
            balance={balance}
            minBet={minBet}
            disabled={phase === 'player-turn' || isSpectator}
            onChangeWager={setWager}
            onEmergencyBailout={onEmergencyBailout}
          />

          {phase !== 'player-turn' ? (
            <button
              type="button"
              disabled={isSpectator || wager > balance || wager < minBet}
              onClick={startHand}
              className="btn-arcade-gold w-full py-4 px-5 rounded-xl font-extrabold text-sm uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
            >
              {phase === 'complete'
                ? `Deal New Hand (${wager.toLocaleString()})`
                : `Deal Cards (${wager.toLocaleString()})`}
            </button>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleHit}
                  className="btn-arcade-emerald py-4 px-4 rounded-xl font-extrabold text-sm uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
                >
                  HIT CARD
                </button>
                <button
                  type="button"
                  onClick={handleStand}
                  className="btn-arcade-gold py-4 px-4 rounded-xl font-extrabold text-sm uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
                >
                  STAND
                </button>
              </div>
              <button
                type="button"
                disabled={playerHand.length !== 2 || activeWager * 2 > balance}
                onClick={handleDoubleDown}
                className="btn-arcade-crimson w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
              >
                Double Down 2x ({(activeWager * 2).toLocaleString()} Chips)
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-stone-800 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
            Dealer Rules: Stands on 17 · Blackjack Pays 3:2
          </div>
          <div className="text-xs font-bold text-amber-300 bg-[#060d0a] border border-amber-500/30 rounded-lg p-3">
            {outcomeText}
          </div>
        </div>
      </div>

      {/* Right Blackjack Felt Table with Wood Rail */}
      <div className="xl:col-span-8 casino-table-rail casino-felt-surface rounded-2xl p-6 flex flex-col justify-between min-h-[410px] relative overflow-hidden">
        {/* Decorative Card Shoe on Top Right */}
        <div className="hidden sm:flex absolute top-4 right-5 w-16 h-22 rounded-lg bg-amber-950/90 border-2 border-amber-500/50 flex-col items-center justify-center shadow-lg">
          <span className="text-[10px] text-amber-300 font-mono-tabular uppercase">6-Deck</span>
          <span className="font-display text-xs text-white font-bold">SHOE</span>
        </div>

        {/* Dealer Hand Area */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-200 mb-3 flex items-center gap-2">
            <span>HOUSE DEALER</span>
            {dealerHand.length > 0 && (
              <span className="font-mono-tabular text-sm text-white bg-black/50 px-2.5 py-0.5 rounded border border-amber-400/40">
                {dealerVisibleTotal}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center min-h-[136px]">
            {dealerHand.length === 0 ? (
              <div className="w-24 h-34 rounded-xl border-2 border-dashed border-emerald-400/30 flex items-center justify-center text-xs text-emerald-200/50">
                Dealer
              </div>
            ) : (
              dealerHand.map((c, idx) => renderCard(c, phase === 'player-turn' && idx === 1, idx))
            )}
          </div>
        </div>

        {/* Curved Felt Ribbon & Center Betting Pot Circle */}
        <div className="my-3 flex flex-col items-center justify-center">
          <div className="px-6 py-1.5 rounded-full border border-amber-400/30 bg-black/25 text-center">
            <span className="font-display text-xs tracking-widest text-amber-300 font-bold">
              BLACKJACK PAYS 3 TO 2 · INSURANCE PAYS 2 TO 1
            </span>
          </div>
          {(phase === 'player-turn' || phase === 'complete') && activeWager > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="casino-chip w-9 h-9 bg-amber-500 text-stone-950 flex items-center justify-center font-mono-tabular text-[10px] font-extrabold">
                POT
              </div>
              <span className="font-mono-tabular text-xs font-bold text-amber-200">
                {activeWager.toLocaleString()} CHIPS IN PLAY
              </span>
            </div>
          )}
        </div>

        {/* Player Hand Area */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center min-h-[136px] mb-3">
            {playerHand.length === 0 ? (
              <div className="w-24 h-34 rounded-xl border-2 border-dashed border-amber-400/30 flex items-center justify-center text-xs text-amber-200/50">
                Your Seat
              </div>
            ) : (
              playerHand.map((c, idx) => renderCard(c, false, idx))
            )}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center gap-2">
            <span>YOUR HAND</span>
            {playerHand.length > 0 && (
              <span
                className={`font-mono-tabular text-sm px-2.5 py-0.5 rounded border ${
                  playerTotal > 21
                    ? 'bg-rose-950 text-rose-200 border-rose-400'
                    : playerTotal === 21
                    ? 'bg-amber-400 text-stone-950 border-white'
                    : 'bg-black/50 text-emerald-300 border-emerald-400/40'
                }`}
              >
                {playerTotal}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
