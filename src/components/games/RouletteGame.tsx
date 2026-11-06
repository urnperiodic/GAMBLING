import React, { useState } from 'react';
import { sound } from '../../utils/sound';
import confetti from 'canvas-confetti';

interface RouletteGameProps {
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

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

type BetSpot =
  | `num_${number}`
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high'
  | 'doz_1'
  | 'doz_2'
  | 'doz_3';

export const RouletteGame: React.FC<RouletteGameProps> = ({
  balance,
  isSpectator,
  minBet,
  onCompleteRound,
}) => {
  const [chipUnit, setChipUnit] = useState<number>(Math.max(25, minBet));
  const [bets, setBets] = useState<Record<string, number>>({});
  const [spinning, setSpinning] = useState<boolean>(false);
  const [wheelAngle, setWheelAngle] = useState<number>(0);
  const [landedNumber, setLandedNumber] = useState<number | null>(null);
  const [recentNumbers, setRecentNumbers] = useState<number[]>([17, 0, 32, 8, 23, 14]);
  const [statusMessage, setStatusMessage] = useState<string>('Select a 3D chip and tap pockets on the felt!');

  const totalWager = Object.values(bets).reduce((acc, v) => acc + v, 0);

  const placeBet = (spot: BetSpot) => {
    if (spinning || isSpectator) return;
    if (totalWager + chipUnit > balance) return;
    sound.playChipClick();
    setBets((prev) => ({
      ...prev,
      [spot]: (prev[spot] || 0) + chipUnit,
    }));
  };

  const clearBets = () => {
    if (spinning) return;
    sound.playChipClick();
    setBets({});
  };

  const spinWheel = () => {
    if (spinning || isSpectator || totalWager === 0 || totalWager > balance) return;
    setSpinning(true);
    sound.playChipClick();
    setStatusMessage('Ivory ball in motion... No more bets!');

    const outcome = Math.floor(Math.random() * 37);
    const pocketIdx = WHEEL_ORDER.indexOf(outcome);
    const pocketAngle = (pocketIdx / 37) * 360;
    const nextAngle = wheelAngle + 1080 + (360 - pocketAngle);
    setWheelAngle(nextAngle);

    setTimeout(() => {
      setLandedNumber(outcome);
      setRecentNumbers((prev) => [outcome, ...prev].slice(0, 10));

      let totalPayout = 0;
      const isRed = RED_NUMBERS.has(outcome);
      const isBlack = outcome !== 0 && !isRed;

      for (const [spot, amount] of Object.entries(bets)) {
        if (spot === `num_${outcome}`) {
          totalPayout += amount * 36;
        } else if (spot === 'red' && isRed) {
          totalPayout += amount * 2;
        } else if (spot === 'black' && isBlack) {
          totalPayout += amount * 2;
        } else if (spot === 'even' && outcome !== 0 && outcome % 2 === 0) {
          totalPayout += amount * 2;
        } else if (spot === 'odd' && outcome % 2 === 1) {
          totalPayout += amount * 2;
        } else if (spot === 'low' && outcome >= 1 && outcome <= 18) {
          totalPayout += amount * 2;
        } else if (spot === 'high' && outcome >= 19 && outcome <= 36) {
          totalPayout += amount * 2;
        } else if (spot === 'doz_1' && outcome >= 1 && outcome <= 12) {
          totalPayout += amount * 3;
        } else if (spot === 'doz_2' && outcome >= 13 && outcome <= 24) {
          totalPayout += amount * 3;
        } else if (spot === 'doz_3' && outcome >= 25 && outcome <= 36) {
          totalPayout += amount * 3;
        }
      }

      const colorLabel = outcome === 0 ? 'GREEN ZERO' : isRed ? 'RED' : 'BLACK';
      const mult = totalWager > 0 ? Number((totalPayout / totalWager).toFixed(2)) : 0;
      const summary = `Roulette #${outcome} (${colorLabel})`;

      if (totalPayout > totalWager) {
        sound.playWinChime(mult >= 5);
        if (mult >= 5) {
          confetti({ particleCount: 55, spread: 65, origin: { y: 0.65 } });
        }
      } else {
        sound.playLossThud();
      }

      setStatusMessage(`${summary} · Payout: ${totalPayout.toLocaleString()} Chips`);
      setSpinning(false);
      onCompleteRound({
        wager: totalWager,
        payout: totalPayout,
        multiplier: mult,
        summary,
      });
    }, 1100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Animated Roulette Wheel & 3D Chip Selector */}
      <div className="lg:col-span-4 bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
          {/* Visual Spinning Monte Carlo Wheel */}
          <div className="bg-[#060d0a] border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Pointer Arrow at Top */}
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-amber-300 z-20 mb-1" />

            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full transition-transform duration-1000 ease-out"
                style={{ transform: `rotate(${wheelAngle}deg)` }}
              >
                <circle cx="100" cy="100" r="96" fill="#2b170e" stroke="#d4af37" strokeWidth="4" />
                {WHEEL_ORDER.map((num, idx) => {
                  const startDeg = (idx / 37) * 360 - 90 - 360 / 74;
                  const endDeg = ((idx + 1) / 37) * 360 - 90 - 360 / 74;
                  const r1 = (startDeg * Math.PI) / 180;
                  const r2 = (endDeg * Math.PI) / 180;
                  const x1 = 100 + 88 * Math.cos(r1);
                  const y1 = 100 + 88 * Math.sin(r1);
                  const x2 = 100 + 88 * Math.cos(r2);
                  const y2 = 100 + 88 * Math.sin(r2);
                  const fill =
                    num === 0 ? '#059669' : RED_NUMBERS.has(num) ? '#be123c' : '#1c1917';
                  return (
                    <path
                      key={num}
                      d={`M 100 100 L ${x1} ${y1} A 88 88 0 0 1 ${x2} ${y2} Z`}
                      fill={fill}
                      stroke="#d4af37"
                      strokeWidth="0.6"
                    />
                  );
                })}
                <circle cx="100" cy="100" r="52" fill="#18120e" stroke="#d4af37" strokeWidth="3" />
                {/* Brass Turret Spokes */}
                <line x1="100" y1="60" x2="100" y2="140" stroke="#d4af37" strokeWidth="3" />
                <line x1="60" y1="100" x2="140" y2="100" stroke="#d4af37" strokeWidth="3" />
              </svg>

              {/* Center Winning Pocket Hub */}
              <div
                className={`absolute w-20 h-20 rounded-full border-2 border-amber-300 flex flex-col items-center justify-center shadow-lg ${
                  landedNumber === null
                    ? 'bg-stone-900'
                    : landedNumber === 0
                    ? 'bg-emerald-700'
                    : RED_NUMBERS.has(landedNumber)
                    ? 'bg-rose-700'
                    : 'bg-stone-950'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider text-amber-200 font-bold">
                  POCKET
                </span>
                <span className="font-mono-tabular text-2xl font-extrabold text-white">
                  {landedNumber !== null ? landedNumber : '00'}
                </span>
              </div>
            </div>

            <p className="mt-2.5 text-xs font-semibold text-amber-200 text-center">{statusMessage}</p>
          </div>

          {/* 3D Casino Chip Selector */}
          <div className="bg-[#08120e] border border-amber-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span>Select Chip Value</span>
              <span className="font-mono-tabular font-bold text-amber-300">
                Total Bet: {totalWager.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 justify-items-center">
              {[
                { val: 25, bg: 'bg-emerald-600' },
                { val: 50, bg: 'bg-sky-600' },
                { val: 100, bg: 'bg-stone-900' },
                { val: 250, bg: 'bg-rose-600' },
                { val: 500, bg: 'bg-amber-500 text-stone-950' },
              ].map((c) => (
                <button
                  key={c.val}
                  type="button"
                  disabled={spinning || isSpectator}
                  onClick={() => {
                    sound.playChipClick();
                    setChipUnit(c.val);
                  }}
                  className={`casino-chip w-11 h-11 flex items-center justify-center font-mono-tabular text-xs font-extrabold cursor-pointer ${
                    c.bg
                  } ${chipUnit === c.val ? 'ring-2 ring-amber-300 -translate-y-1' : 'opacity-80'}`}
                >
                  {c.val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={spinning || isSpectator || totalWager === 0}
              onClick={spinWheel}
              className="btn-arcade-gold flex-1 py-3.5 px-5 rounded-xl font-extrabold text-sm uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
            >
              {spinning ? 'Spinning...' : `Spin Wheel (${totalWager.toLocaleString()})`}
            </button>
            <button
              type="button"
              disabled={spinning || totalWager === 0}
              onClick={clearBets}
              className="btn-arcade-dark py-3.5 px-4 rounded-xl text-xs font-bold uppercase cursor-pointer whitespace-nowrap shrink-0"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Recent Numbers */}
        <div className="mt-4 pt-3 border-t border-stone-800">
          <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1.5">
            History Board
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {recentNumbers.map((num, idx) => (
              <span
                key={idx}
                className={`font-mono-tabular text-xs font-extrabold w-7 h-7 rounded-full flex items-center justify-center border ${
                  num === 0
                    ? 'bg-emerald-700 border-emerald-300 text-white'
                    : RED_NUMBERS.has(num)
                    ? 'bg-rose-700 border-rose-300 text-white'
                    : 'bg-stone-900 border-stone-500 text-stone-200'
                }`}
              >
                {num}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Casino Roulette Felt Board */}
      <div className="lg:col-span-8 casino-table-rail casino-felt-surface rounded-2xl p-5 flex flex-col justify-between">
        <div className="text-xs text-amber-200 font-semibold mb-2 flex items-center justify-between">
          <span>MONTE CARLO SINGLE-ZERO FELT · STRAIGHT UP PAYS 35 TO 1</span>
          <span>TAP ANY NUMBER OR ZONE TO PLACE CHIPS</span>
        </div>

        <div className="space-y-2.5 my-auto">
          {/* Zero Pocket */}
          <button
            type="button"
            onClick={() => placeBet('num_0')}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 border-2 border-amber-400/50 rounded-xl text-white font-mono-tabular text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <span>0 GREEN ZERO</span>
            {bets['num_0'] && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-xs font-extrabold">
                {bets['num_0']}
              </span>
            )}
          </button>

          {/* Numbers 1 - 36 Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-1.5">
            {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
              const isRed = RED_NUMBERS.has(num);
              const betAmt = bets[`num_${num}`];
              const isWinner = landedNumber === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => placeBet(`num_${num}`)}
                  className={`h-12 rounded-lg border-2 flex flex-col items-center justify-center font-mono-tabular text-xs font-extrabold transition-transform cursor-pointer relative shadow ${
                    isRed
                      ? 'bg-rose-700 hover:bg-rose-600 border-amber-300/30 text-white'
                      : 'bg-stone-900 hover:bg-stone-800 border-amber-300/30 text-stone-100'
                  } ${isWinner ? 'ring-2 ring-white scale-105' : ''}`}
                >
                  <span>{num}</span>
                  {betAmt && (
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-stone-950 border border-white text-[9px] font-extrabold flex items-center justify-center shadow">
                      {betAmt >= 1000 ? `${(betAmt / 1000).toFixed(0)}k` : betAmt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dozens (2:1) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { id: 'doz_1' as BetSpot, label: '1ST 12 (1–12) · 2:1' },
              { id: 'doz_2' as BetSpot, label: '2ND 12 (13–24) · 2:1' },
              { id: 'doz_3' as BetSpot, label: '3RD 12 (25–36) · 2:1' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => placeBet(d.id)}
                className={`py-2.5 px-3 rounded-xl bg-black/35 hover:bg-black/50 border-2 border-amber-400/35 text-xs font-extrabold text-amber-100 cursor-pointer whitespace-nowrap shrink-0 ${
                  bets[d.id] ? 'ring-2 ring-amber-300 bg-amber-500/20' : ''
                }`}
              >
                {d.label} {bets[d.id] ? `[${bets[d.id]}]` : ''}
              </button>
            ))}
          </div>

          {/* Outside Even-Money Bets (1:1) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: 'low' as BetSpot, label: '1–18', cls: 'bg-black/35' },
              { id: 'even' as BetSpot, label: 'EVEN', cls: 'bg-black/35' },
              { id: 'red' as BetSpot, label: 'RED ◆', cls: 'bg-rose-700' },
              { id: 'black' as BetSpot, label: 'BLACK ◆', cls: 'bg-stone-900' },
              { id: 'odd' as BetSpot, label: 'ODD', cls: 'bg-black/35' },
              { id: 'high' as BetSpot, label: '19–36', cls: 'bg-black/35' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => placeBet(b.id)}
                className={`py-2.5 px-2 rounded-xl ${b.cls} border-2 border-amber-400/35 text-xs font-extrabold text-white cursor-pointer whitespace-nowrap shrink-0 ${
                  bets[b.id] ? 'ring-2 ring-amber-300' : ''
                }`}
              >
                {b.label} {bets[b.id] ? `[${bets[b.id]}]` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
