import React from 'react';
import { sound } from '../../utils/sound';

interface ChipRackProps {
  wager: number;
  balance: number;
  minBet: number;
  disabled?: boolean;
  onChangeWager: (newWager: number) => void;
}

const CHIP_VALUES = [
  { value: 25, label: '25', bg: 'bg-emerald-600' },
  { value: 50, label: '50', bg: 'bg-sky-600' },
  { value: 100, label: '100', bg: 'bg-stone-900' },
  { value: 250, label: '250', bg: 'bg-rose-600' },
  { value: 500, label: '500', bg: 'bg-purple-700' },
  { value: 1000, label: '1K', bg: 'bg-amber-500 text-stone-950' },
];

export const ChipRack: React.FC<ChipRackProps> = ({
  wager,
  balance,
  minBet,
  disabled = false,
  onChangeWager,
}) => {
  const handleAddChip = (val: number) => {
    if (disabled) return;
    sound.playChipClick();
    const next = Math.min(balance, wager + val);
    onChangeWager(Math.max(minBet, next));
  };

  const handleSetExact = (val: number) => {
    if (disabled) return;
    sound.playChipClick();
    onChangeWager(Math.max(minBet, Math.min(balance, val)));
  };

  return (
    <div className="bg-[#07110d] border border-amber-500/30 rounded-xl p-2.5 space-y-2.5 shadow-inner">
      {/* Compact Digital Bet Pot Display */}
      <div className="flex items-center justify-between bg-[#040a07] border border-amber-500/35 rounded-lg px-3 py-1.5">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-stone-400 font-bold">
            Table Wager
          </div>
          <div className="font-mono-tabular text-base font-extrabold text-amber-300 leading-tight">
            {wager.toLocaleString()} <span className="text-[10px] font-normal text-amber-200/70">CHIPS</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSetExact(minBet)}
            className="btn-arcade-dark px-2 py-1 rounded text-[10px] font-mono-tabular font-bold cursor-pointer whitespace-nowrap shrink-0"
          >
            MIN
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSetExact(Math.floor(wager / 2))}
            className="btn-arcade-dark px-2 py-1 rounded text-[10px] font-mono-tabular font-bold cursor-pointer whitespace-nowrap shrink-0"
          >
            1/2
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSetExact(wager * 2)}
            className="btn-arcade-dark px-2 py-1 rounded text-[10px] font-mono-tabular font-bold cursor-pointer whitespace-nowrap shrink-0"
          >
            2X
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSetExact(balance)}
            className="btn-arcade-dark px-2 py-1 rounded text-[10px] font-mono-tabular font-bold text-amber-300 cursor-pointer whitespace-nowrap shrink-0"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Physical 3D Casino Chips Tray */}
      <div>
        <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1.5">
          <span>Tap chips to stack bet</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSetExact(minBet)}
            className="text-amber-300 hover:underline cursor-pointer"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-6 gap-1.5 justify-items-center">
          {CHIP_VALUES.map((chip) => (
            <button
              key={chip.value}
              type="button"
              disabled={disabled || balance < minBet}
              onClick={() => handleAddChip(chip.value)}
              className={`casino-chip w-9 h-9 flex items-center justify-center font-mono-tabular text-[11px] font-extrabold cursor-pointer select-none ${chip.bg} ${
                chip.value === 1000 ? 'text-stone-950' : 'text-white'
              }`}
              title={`Add +${chip.value} Chips`}
            >
              <span className="w-6 h-6 rounded-full border border-white/40 flex items-center justify-center bg-black/20">
                {chip.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
