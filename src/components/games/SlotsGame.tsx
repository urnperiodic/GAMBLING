import React, { useState } from 'react';
import { sound } from '../../utils/sound';
import { ChipRack } from './ChipRack';
import confetti from 'canvas-confetti';

interface SlotsGameProps {
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

interface SlotSymbol {
  id: string;
  glyph: string;
  label: string;
  payout3: number;
  payout4: number;
  payout5: number;
  weight: number;
}

const SYMBOLS: SlotSymbol[] = [
  { id: 'crown', glyph: '👑', label: 'Royal Crown (Wild)', payout3: 8, payout4: 25, payout5: 100, weight: 8 },
  { id: 'diamond', glyph: '💎', label: 'Imperial Diamond', payout3: 5, payout4: 15, payout5: 50, weight: 12 },
  { id: 'seven', glyph: '7️⃣', label: 'Brass Seven', payout3: 4, payout4: 10, payout5: 30, weight: 16 },
  { id: 'bell', glyph: '🔔', label: 'Golden Bell', payout3: 3, payout4: 7, payout5: 18, weight: 22 },
  { id: 'clover', glyph: '🍀', label: 'Monte Carlo Clover', payout3: 2, payout4: 5, payout5: 12, weight: 28 },
  { id: 'cherry', glyph: '🍒', label: 'Velvet Cherry', payout3: 1.5, payout4: 3, payout5: 8, weight: 36 },
];

function pickWeightedSymbol(): SlotSymbol {
  const totalWeight = SYMBOLS.reduce((acc, s) => acc + s.weight, 0);
  let r = Math.random() * totalWeight;
  for (const sym of SYMBOLS) {
    if (r < sym.weight) return sym;
    r -= sym.weight;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

type GridState = SlotSymbol[][];

function generateGrid(): GridState {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => pickWeightedSymbol()));
}

const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
];

export const SlotsGame: React.FC<SlotsGameProps> = ({
  balance,
  isSpectator,
  minBet,
  onCompleteRound,
}) => {
  const [wager, setWager] = useState<number>(Math.max(20, minBet));
  const [grid, setGrid] = useState<GridState>(() => generateGrid());
  const [spinning, setSpinning] = useState<boolean>(false);
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [lastWinPayout, setLastWinPayout] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Pull the Brass Lever or press SPIN REELS!');

  const spinReels = () => {
    if (spinning || isSpectator || wager > balance || wager < minBet) return;
    setSpinning(true);
    setWinningLines([]);
    setLastWinPayout(0);
    sound.playChipClick();

    let ticks = 0;
    const interval = setInterval(() => {
      ticks += 1;
      setGrid(generateGrid());
      sound.playPegTick(ticks);
      if (ticks >= 7) {
        clearInterval(interval);
        const finalGrid = generateGrid();
        setGrid(finalGrid);
        setSpinning(false);

        let totalMult = 0;
        const hitLineIndices: number[] = [];
        const winDescriptions: string[] = [];

        PAYLINES.forEach((line, lineIdx) => {
          const lineSymbols = line.map((rowIdx, reelIdx) => finalGrid[reelIdx][rowIdx]);
          const baseSym = lineSymbols.find((s) => s.id !== 'crown') || SYMBOLS[0];
          let matchCount = 0;
          for (const sym of lineSymbols) {
            if (sym.id === baseSym.id || sym.id === 'crown') {
              matchCount += 1;
            } else {
              break;
            }
          }
          if (matchCount >= 3) {
            hitLineIndices.push(lineIdx);
            const lineMult =
              matchCount === 5
                ? baseSym.payout5
                : matchCount === 4
                ? baseSym.payout4
                : baseSym.payout3;
            totalMult += lineMult;
            winDescriptions.push(`${matchCount}x ${baseSym.label} (${lineMult}x)`);
          }
        });

        let diamondCount = 0;
        for (const col of finalGrid) {
          for (const cell of col) {
            if (cell.id === 'diamond') diamondCount += 1;
          }
        }
        if (diamondCount >= 3) {
          const scatterMult = diamondCount * 2;
          totalMult += scatterMult;
          winDescriptions.push(`${diamondCount} Diamond Scatters (+${scatterMult}x)`);
        }

        const payout = Math.round(wager * totalMult);
        setWinningLines(hitLineIndices);
        setLastWinPayout(payout);

        const summary =
          totalMult > 0
            ? `JACKPOT LINE: ${winDescriptions.join(' + ')}`
            : 'Velvet Reels Spin (No Payline Match)';

        if (payout > wager) {
          sound.playWinChime(totalMult >= 8);
          if (totalMult >= 8) {
            confetti({ particleCount: 60, spread: 65, origin: { y: 0.65 } });
          }
        } else {
          sound.playLossThud();
        }

        setStatusMessage(
          payout > 0
            ? `${summary} · WON ${payout.toLocaleString()} CHIPS!`
            : 'No winning line this spin. Pull the lever again!'
        );

        onCompleteRound({
          wager,
          payout,
          multiplier: Number(totalMult.toFixed(2)),
          summary,
        });
      }
    }, 85);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Arcade Control Console & Paytable */}
      <div className="lg:col-span-4 bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
          <ChipRack
            wager={wager}
            balance={balance}
            minBet={minBet}
            disabled={spinning || isSpectator}
            onChangeWager={setWager}
          />

          <button
            type="button"
            disabled={spinning || isSpectator || wager > balance || wager < minBet}
            onClick={spinReels}
            className="btn-arcade-gold w-full py-4 px-5 rounded-xl font-extrabold text-sm uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
          >
            {spinning ? 'Spinning Brass Reels...' : `SPIN REELS (${wager.toLocaleString()} CHIPS)`}
          </button>

          {/* Compact Paytable */}
          <div className="pt-3 border-t border-stone-800">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 mb-2">
              Reel Symbol Payouts (3x / 4x / 5x)
            </div>
            <div className="space-y-1.5">
              {SYMBOLS.map((sym) => (
                <div
                  key={sym.id}
                  className="flex items-center justify-between text-xs bg-[#060d0a] px-2.5 py-1.5 rounded border border-stone-800/80"
                >
                  <span className="text-stone-200 font-medium">
                    {sym.glyph} {sym.label}
                  </span>
                  <span className="font-mono-tabular font-bold text-amber-300">
                    {sym.payout3}x / {sym.payout4}x / {sym.payout5}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Mechanical Slot Machine Cabinet */}
      <div className="lg:col-span-8 casino-table-rail bg-gradient-to-b from-[#23140d] via-[#160d08] to-[#0d0704] rounded-2xl p-6 flex flex-col justify-between relative">
        {/* Top Lit Jackpot Marquee */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-800/40 to-amber-950 border-2 border-amber-400 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-lg">
          <span className="font-display text-sm font-bold tracking-widest text-amber-200">
            ★ VELVET &amp; BRASS GRAND SLOTS ★
          </span>
          <span className="font-mono-tabular text-sm font-extrabold text-amber-300">
            {lastWinPayout > 0 ? `WIN: +${lastWinPayout.toLocaleString()} CHIPS!` : 'MAX 250X JACKPOT'}
          </span>
        </div>

        {/* 5x3 Mechanical Reels Window + Interactive Side Lever */}
        <div className="flex items-center gap-3 my-auto py-3">
          <div className="flex-1 grid grid-cols-5 gap-2.5 bg-[#060504] p-4 rounded-2xl border-4 border-amber-500/60 shadow-inner relative">
            {grid.map((col, reelIdx) => (
              <div key={reelIdx} className="flex flex-col gap-2.5">
                {col.map((sym, rowIdx) => {
                  const isMidRow = rowIdx === 1;
                  const isWinningCell = winningLines.some(
                    (lineIdx) => PAYLINES[lineIdx][reelIdx] === rowIdx
                  );
                  return (
                    <div
                      key={rowIdx}
                      className={`h-24 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                        spinning ? 'blur-[0.5px] scale-95 opacity-80' : 'scale-100'
                      } ${
                        isWinningCell
                          ? 'bg-gradient-to-b from-amber-300 to-amber-500 border-white text-stone-950 scale-105 shadow-lg'
                          : isMidRow
                          ? 'bg-gradient-to-b from-stone-800 to-stone-900 border-amber-400/50 text-white'
                          : 'bg-stone-950 border-stone-800 text-stone-300'
                      }`}
                    >
                      <span className="text-4xl select-none drop-shadow">{sym.glyph}</span>
                      <span
                        className={`text-[10px] font-bold uppercase mt-1 truncate max-w-[90%] ${
                          isWinningCell ? 'text-stone-950' : 'text-amber-200/70'
                        }`}
                      >
                        {sym.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Interactive Mechanical Pull Handle */}
          <button
            type="button"
            disabled={spinning || isSpectator || wager > balance}
            onClick={spinReels}
            title="Pull Slot Machine Handle"
            className="hidden sm:flex flex-col items-center justify-start h-56 w-10 bg-stone-900 border-2 border-amber-500/40 rounded-full p-1.5 cursor-pointer group"
          >
            <div
              className={`w-7 h-7 rounded-full bg-gradient-to-b from-rose-400 to-rose-700 border-2 border-white shadow-lg transition-transform duration-300 ${
                spinning ? 'translate-y-36' : 'group-hover:translate-y-3'
              }`}
            />
            <div className="w-2 flex-1 bg-gradient-to-r from-amber-300 to-amber-600 rounded-full -mt-1" />
          </button>
        </div>

        {/* Bottom Status Readout */}
        <div className="bg-[#090604] border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
          <span className="font-bold text-amber-200">{statusMessage}</span>
          <span className="text-stone-400 hidden sm:inline">👑 Wild · 💎 3+ Scatter Bonus</span>
        </div>
      </div>
    </div>
  );
};
