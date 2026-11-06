import React, { useState } from 'react';
import { GameType, GAME_CATALOG } from '../types/casino';
import { X, Lock, Globe } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  defaultName: string;
  onClose: () => void;
  onCreateRoom: (config: {
    name: string;
    gameType: GameType;
    isPrivate: boolean;
    password?: string;
    minBet: number;
  }) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  defaultName,
  onClose,
  onCreateRoom,
}) => {
  const [name, setName] = useState(`${defaultName}'s Salon`);
  const [gameType, setGameType] = useState<GameType>('plinko');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [minBet, setMinBet] = useState(25);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom({
      name: name.trim() || `${defaultName}'s Salon`,
      gameType,
      isPrivate,
      password: isPrivate ? password : undefined,
      minBet,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-[#111c17] border border-amber-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-[#0b1310]">
          <h2 className="font-display text-base font-bold text-amber-200">
            Create Multiplayer Parlor Table
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs text-stone-300 mb-1.5">Table Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
              required
              className="w-full bg-[#0b1310] border border-stone-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-300 mb-1.5">Select Parlor Game</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(GAME_CATALOG).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGameType(g.id);
                    setMinBet(g.minWager);
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    gameType === g.id
                      ? 'bg-amber-400/15 border-amber-400 text-white'
                      : 'bg-[#0b1310] border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{g.title}</div>
                  <div className="text-[11px] text-amber-300 font-mono-tabular mt-0.5">
                    Max {g.maxMultiplier}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-stone-300 mb-1.5">Minimum Wager</label>
              <select
                value={minBet}
                onChange={(e) => setMinBet(Number(e.target.value))}
                className="w-full bg-[#0b1310] border border-stone-700 rounded-lg px-3 py-2.5 text-xs text-amber-200 font-mono-tabular"
              >
                <option value={10}>10 Virtual Chips</option>
                <option value={25}>25 Virtual Chips</option>
                <option value={50}>50 Virtual Chips</option>
                <option value={100}>100 Virtual Chips</option>
                <option value={250}>250 Virtual Chips</option>
                <option value={500}>500 Virtual Chips</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-stone-300 mb-1.5">Room Access</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0b1310] rounded-lg border border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`py-2 px-2 rounded text-xs font-medium flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                    !isPrivate
                      ? 'bg-amber-400 text-stone-950 font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`py-2 px-2 rounded text-xs font-medium flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                    isPrivate
                      ? 'bg-amber-400 text-stone-950 font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private</span>
                </button>
              </div>
            </div>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-xs text-stone-300 mb-1.5">
                Private Room Passcode (Required for non-invited players)
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room passcode..."
                required
                className="w-full bg-[#0b1310] border border-stone-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-300 cursor-pointer whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-xs font-semibold text-stone-950 cursor-pointer whitespace-nowrap shrink-0"
            >
              Open Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
