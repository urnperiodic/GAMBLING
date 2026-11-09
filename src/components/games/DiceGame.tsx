import React, { useState } from 'react';
import { sound } from '../../utils/sound';
import { ChipRack } from './ChipRack';
import confetti from 'canvas-confetti';
import { shouldPlayerWin53, getRandomInt } from '../../utils/fairRng';

interface DiceGameProps {
  balance: number;
  isPractice: boolean;
  isSpectator: boolean;
  minBet: number;
  onEmergencyBailout?: () => void;
  onCompleteRound: (result: {
    wager: number;
    payout: number;
    multiplier: number;
    summary: string;
  }) => void;
}

type DiceMode = 'precision' | 'craps2d6';
type CrapsBetType = 'lucky7' | 'high_8_12' | 'low_2_6' | 'doubles';

// Render authentic 3D Pip Die
const DieFace3D: React.FC<{ value: number; rolling: boolean }> = ({ value, rolling }) => {
  const pipPositions: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const activePips = pipPositions[value] || [4];

  return (
    <div
      className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-4 border-amber-500 p-3 grid grid-cols-3 grid-rows-3 gap-1 shadow-2xl transition-transform duration-300 ${
        rolling ? 'rotate-45 scale-90' : 'rotate-0 scale-100'
      }`}
    >
      {Array.from({ length: 9 }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-center">
          {activePips.includes(idx) && (
            <span
              className={`w-3.5 h-3.5 rounded-full shadow-inner ${
                value === 1 || value === 4 ? 'bg-rose-600' : 'bg-stone-900'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export const DiceGame: React.FC<DiceGameProps> = ({
  balance,
  isSpectator,
  minBet,
  onEmergencyBailout,
  onCompleteRound,
}) => {
  const [wager, setWager] = useState<number>(Math.max(10, minBet));
  const [mode, setMode] = useState<DiceMode>('precision');

  const [target, setTarget] = useState<number>(50);
  const [direction, setDirection] = useState<'over' | 'under'>('over');
  const [lastPercentileRoll, setLastPercentileRoll] = useState<number | null>(68);

  const [crapsBet, setCrapsBet] = useState<CrapsBetType>('lucky7');
  const [dicePair, setDicePair] = useState<[number, number]>([4, 3]);
  const [rolling, setRolling] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Set your target or craps bet and press ROLL DICE!');

  const winChance = direction === 'over' ? 100 - target : target;
  const precisionMultiplier = Number((99 / Math.max(1, winChance)).toFixed(2));

  const handleRoll = () => {
    if (rolling || isSpectator || wager > balance || wager < minBet) return;
    setRolling(true);
    sound.playChipClick();

    setTimeout(() => {
      setRolling(false);
      const willPlayerWin = shouldPlayerWin53();
      if (mode === 'precision') {
        let rolled: number;
        if (willPlayerWin) {
          rolled = direction === 'over' ? getRandomInt(Math.min(99, target + 1), 100) : getRandomInt(1, Math.max(2, target - 1));
        } else {
          rolled = direction === 'over' ? getRandomInt(1, target) : getRandomInt(target, 100);
        }
        setLastPercentileRoll(rolled);
        const won = direction === 'over' ? rolled > target : rolled < target;
        const payout = won ? Math.round(wager * precisionMultiplier) : 0;
        const summary = `Brass Dice rolled ${rolled} (${direction.toUpperCase()} ${target})`;

        if (won) {
          sound.playWinChime(precisionMultiplier >= 4);
          if (precisionMultiplier >= 4) {
            confetti({ particleCount: 45, spread: 55, origin: { y: 0.65 } });
          }
        } else {
          sound.playLossThud();
        }
        setStatusText(`${summary} · ${won ? `WON +${payout.toLocaleString()} CHIPS!` : 'Missed target'}`);
        onCompleteRound({
          wager,
          payout,
          multiplier: won ? precisionMultiplier : 0,
          summary,
        });
      } else {
        let d1: number;
        let d2: number;
        if (willPlayerWin) {
          if (crapsBet === 'lucky7') { d1 = 4; d2 = 3; }
          else if (crapsBet === 'high_8_12') { d1 = 5; d2 = 4; }
          else if (crapsBet === 'low_2_6') { d1 = 2; d2 = 2; }
          else { d1 = 3; d2 = 3; } // doubles
        } else {
          if (crapsBet === 'lucky7') { d1 = 2; d2 = 3; }
          else if (crapsBet === 'high_8_12') { d1 = 2; d2 = 3; }
          else if (crapsBet === 'low_2_6') { d1 = 5; d2 = 4; }
          else { d1 = 2; d2 = 3; } // non-doubles
        }
        const sum = d1 + d2;
        setDicePair([d1, d2]);

        let won = false;
        let mult = 0;
        if (crapsBet === 'lucky7') {
          won = sum === 7;
          mult = 4.5;
        } else if (crapsBet === 'high_8_12') {
          won = sum >= 8;
          mult = 2.1;
        } else if (crapsBet === 'low_2_6') {
          won = sum <= 6;
          mult = 2.1;
        } else if (crapsBet === 'doubles') {
          won = d1 === d2;
          mult = 5.5;
        }

        const payout = won ? Math.round(wager * mult) : 0;
        const summary = `2D6 Parlor Craps rolled ${d1} + ${d2} = ${sum}`;

        if (won) {
          sound.playWinChime(mult >= 4);
        } else {
          sound.playLossThud();
        }
        setStatusText(`${summary} · ${won ? `WON +${payout.toLocaleString()} CHIPS!` : 'No match'}`);
        onCompleteRound({
          wager,
          payout,
          multiplier: won ? mult : 0,
          summary,
        });
      }
    }, 320);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      {/* Left Arcade Control Console */}
      <div className="xl:col-span-4 bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
          <ChipRack
            wager={wager}
            balance={balance}
            minBet={minBet}
            disabled={rolling || isSpectator}
            onChangeWager={setWager}
            onEmergencyBailout={onEmergencyBailout}
          />

          {/* Mode Switcher */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1.5">
              Select Dice Table Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('precision')}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  mode === 'precision' ? 'btn-arcade-gold' : 'btn-arcade-dark text-stone-300'
                }`}
              >
                1–100 Target
              </button>
              <button
                type="button"
                onClick={() => setMode('craps2d6')}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  mode === 'craps2d6' ? 'btn-arcade-gold' : 'btn-arcade-dark text-stone-300'
                }`}
              >
                2D6 Craps Pit
              </button>
            </div>
          </div>

          {balance < minBet && onEmergencyBailout && (
            <button
              type="button"
              onClick={onEmergencyBailout}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-stone-950 shadow-md uppercase tracking-wide cursor-pointer transition-transform active:scale-95"
            >
              ⚡ Broke? Request +5,000 Bailout
            </button>
          )}

          <button
            type="button"
            disabled={rolling || isSpectator || wager > balance || wager < minBet}
            onClick={handleRoll}
            className="btn-arcade-gold w-full py-4 px-5 rounded-xl font-extrabold text-sm uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
          >
            {rolling ? 'Rolling Dice...' : `ROLL BRASS DICE (${wager.toLocaleString()})`}
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-stone-800">
          <div className="text-xs font-bold text-amber-300 bg-[#060d0a] border border-amber-500/30 rounded-lg p-3">
            {statusText}
          </div>
        </div>
      </div>

      {/* Right Dice Pit Arena */}
      <div className="xl:col-span-8 casino-table-rail casino-felt-surface rounded-2xl p-6 flex flex-col justify-between min-h-[400px]">
        {mode === 'precision' ? (
          <div className="my-auto space-y-6">
            {/* Big Telemetry Readout */}
            <div className="grid grid-cols-3 gap-4 bg-black/40 border-2 border-amber-400/30 rounded-2xl p-4 text-center">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                  Payout Multiplier
                </div>
                <div className="font-mono-tabular text-3xl font-extrabold text-amber-300 mt-1">
                  {precisionMultiplier}x
                </div>
              </div>
              <div className="border-x border-stone-700/80">
                <div className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                  Rolled Number
                </div>
                <div className="font-mono-tabular text-4xl font-extrabold text-white mt-0.5">
                  {lastPercentileRoll !== null ? lastPercentileRoll : '--'}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                  Win Chance
                </div>
                <div className="font-mono-tabular text-3xl font-extrabold text-emerald-300 mt-1">
                  {winChance}%
                </div>
              </div>
            </div>

            {/* Visual Win/Loss Range Bar */}
            <div className="bg-[#06120d] p-5 rounded-2xl border-2 border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-200">
                  Target Threshold: {target}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('under')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase cursor-pointer whitespace-nowrap shrink-0 ${
                      direction === 'under' ? 'btn-arcade-emerald' : 'btn-arcade-dark'
                    }`}
                  >
                    Roll Under {target}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('over')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase cursor-pointer whitespace-nowrap shrink-0 ${
                      direction === 'over' ? 'btn-arcade-emerald' : 'btn-arcade-dark'
                    }`}
                  >
                    Roll Over {target}
                  </button>
                </div>
              </div>

              {/* Dual-Colored Visual Track */}
              <div className="relative h-6 rounded-full overflow-hidden border-2 border-stone-700 flex">
                <div
                  style={{ width: `${target}%` }}
                  className={`h-full transition-all ${
                    direction === 'under' ? 'bg-emerald-500' : 'bg-rose-600'
                  }`}
                />
                <div
                  style={{ width: `${100 - target}%` }}
                  className={`h-full transition-all ${
                    direction === 'over' ? 'bg-emerald-500' : 'bg-rose-600'
                  }`}
                />
                {lastPercentileRoll !== null && (
                  <div
                    style={{ left: `calc(${lastPercentileRoll}% - 8px)` }}
                    className="absolute top-0 bottom-0 w-4 bg-white border-2 border-stone-950 rounded shadow-lg transition-all duration-300"
                    title={`Last Roll: ${lastPercentileRoll}`}
                  />
                )}
              </div>

              <input
                type="range"
                min={4}
                max={96}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="my-auto space-y-6">
            {/* 3D Pip Dice Pair */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-8">
                <DieFace3D value={dicePair[0]} rolling={rolling} />
                <DieFace3D value={dicePair[1]} rolling={rolling} />
              </div>
              <div className="mt-4 font-mono-tabular text-sm font-extrabold text-amber-300 bg-black/40 px-4 py-1 rounded-full border border-amber-400/30">
                TOTAL SUM: {dicePair[0] + dicePair[1]}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'low_2_6' as CrapsBetType, title: 'LOW (2–6)', odds: '2.1x' },
                { id: 'lucky7' as CrapsBetType, title: 'LUCKY SEVEN (7)', odds: '4.5x' },
                { id: 'high_8_12' as CrapsBetType, title: 'HIGH (8–12)', odds: '2.1x' },
                { id: 'doubles' as CrapsBetType, title: 'HARD DOUBLES', odds: '5.5x' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCrapsBet(opt.id)}
                  className={`p-3.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                    crapsBet === opt.id
                      ? 'bg-amber-400 text-stone-950 border-white font-extrabold shadow-lg -translate-y-1'
                      : 'bg-black/40 border-amber-400/30 text-stone-200 hover:border-amber-400'
                  }`}
                >
                  <div className="text-xs font-extrabold">{opt.title}</div>
                  <div
                    className={`font-mono-tabular text-base font-extrabold mt-1 ${
                      crapsBet === opt.id ? 'text-stone-950' : 'text-amber-300'
                    }`}
                  >
                    {opt.odds}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
