import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';
import { Lock, Unlock, X, Sparkles } from 'lucide-react';

interface VaultPuzzleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessClaim: () => void;
}

interface SealTile {
  id: number;
  symbol: string;
  matched: boolean;
  flipped: boolean;
}

const SYMBOLS = ['👑', '💎', '7️⃣', '🍀'];

function createShuffledTiles(): SealTile[] {
  const pairList = [...SYMBOLS, ...SYMBOLS];
  for (let i = pairList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairList[i], pairList[j]] = [pairList[j], pairList[i]];
  }
  return pairList.map((symbol, idx) => ({
    id: idx,
    symbol,
    matched: false,
    flipped: false,
  }));
}

export const VaultPuzzleModal: React.FC<VaultPuzzleModalProps> = ({
  isOpen,
  onClose,
  onSuccessClaim,
}) => {
  const [tiles, setTiles] = useState<SealTile[]>(() => createShuffledTiles());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Stage 2: Tumbler timing lock after matching all 4 pairs
  const [tumblerPos, setTumblerPos] = useState<number>(50);
  const [tumblerUnlocked, setTumblerUnlocked] = useState<boolean>(false);
  const [tumblerMissed, setTumblerMissed] = useState<boolean>(false);

  const dirRef = useRef<number>(1);

  const matchedCount = tiles.filter((t) => t.matched).length;
  const allPairsMatched = matchedCount === tiles.length;

  // Reset puzzle state whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setTiles(createShuffledTiles());
    setSelectedIds([]);
    setIsChecking(false);
    setElapsedSeconds(0);
    setTumblerUnlocked(false);
    setTumblerMissed(false);
  }, [isOpen]);

  // Timer ticker
  useEffect(() => {
    if (!isOpen || tumblerUnlocked) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, tumblerUnlocked]);

  // Animate Stage 2 brass tumbler needle when all pairs are matched
  useEffect(() => {
    if (!isOpen || !allPairsMatched || tumblerUnlocked) return;
    let animId: number;
    const step = () => {
      setTumblerPos((prev) => {
        let next = prev + dirRef.current * 1.65;
        if (next >= 96) {
          next = 96;
          dirRef.current = -1;
        } else if (next <= 4) {
          next = 4;
          dirRef.current = 1;
        }
        return next;
      });
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, allPairsMatched, tumblerUnlocked]);

  if (!isOpen) return null;

  const handleTileClick = (idx: number) => {
    if (isChecking || tiles[idx].flipped || tiles[idx].matched) return;
    sound.playChipClick();

    const updated = tiles.map((t, i) => (i === idx ? { ...t, flipped: true } : t));
    setTiles(updated);

    const nextSelected = [...selectedIds, idx];
    setSelectedIds(nextSelected);

    if (nextSelected.length === 2) {
      setIsChecking(true);
      const [firstIdx, secondIdx] = nextSelected;
      if (updated[firstIdx].symbol === updated[secondIdx].symbol) {
        // Match found!
        setTimeout(() => {
          sound.playPegTick(4);
          setTiles((prev) =>
            prev.map((t, i) =>
              i === firstIdx || i === secondIdx ? { ...t, matched: true, flipped: true } : t
            )
          );
          setSelectedIds([]);
          setIsChecking(false);
        }, 240);
      } else {
        // Mismatch — flip back after short pause
        setTimeout(() => {
          sound.playLossThud();
          setTiles((prev) =>
            prev.map((t, i) =>
              i === firstIdx || i === secondIdx ? { ...t, flipped: false } : t
            )
          );
          setSelectedIds([]);
          setIsChecking(false);
        }, 580);
      }
    }
  };

  const handleLockTumbler = () => {
    if (!allPairsMatched || tumblerUnlocked) return;
    // Target zone is 38% to 62%
    if (tumblerPos >= 36 && tumblerPos <= 64) {
      setTumblerUnlocked(true);
      sound.playWinChime(true);
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });
      setTimeout(() => {
        onSuccessClaim();
        onClose();
      }, 650);
    } else {
      sound.playLossThud();
      setTumblerMissed(true);
      setTimeout(() => setTumblerMissed(false), 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0d1813] border-2 border-amber-400/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-800 bg-[#070e0b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tumblerUnlocked ? (
              <Unlock className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-amber-400" />
            )}
            <h2 className="font-display text-sm font-bold text-amber-300 tracking-wide">
              CRACK THE HOUSE VAULT (+1,500 CHIPS)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-tabular text-xs text-stone-400">{elapsedSeconds}s</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Step 1: Match 4 Vault Seal Pairs */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-stone-200">
                1. Match all 4 Brass Seal Pairs ({matchedCount / 2}/4)
              </span>
              <span className="text-[11px] text-amber-300 font-mono-tabular">
                {allPairsMatched ? 'SEALS ALIGNED ✓' : 'Flip 2 tiles'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {tiles.map((tile, idx) => {
                const isRevealed = tile.flipped || tile.matched;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={isRevealed || isChecking}
                    onClick={() => handleTileClick(idx)}
                    className={`h-16 rounded-xl border-2 flex items-center justify-center text-2xl transition-all cursor-pointer shadow-md ${
                      tile.matched
                        ? 'bg-emerald-950/90 border-emerald-400 scale-95'
                        : tile.flipped
                        ? 'bg-amber-950 border-amber-300 scale-105'
                        : 'bg-[#07100c] hover:bg-[#11221b] border-amber-500/35'
                    }`}
                  >
                    {isRevealed ? (
                      <span>{tile.symbol}</span>
                    ) : (
                      <span className="font-display text-xs font-bold text-amber-400/70">V&amp;B</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Final Brass Tumbler Lock */}
          <div
            className={`p-3.5 rounded-xl border-2 transition-opacity ${
              allPairsMatched
                ? 'bg-[#07100c] border-amber-400/50 opacity-100'
                : 'bg-stone-950/50 border-stone-800/70 opacity-45 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-stone-200">
                2. Stop the Vault Needle in the Gold Zone
              </span>
              {tumblerMissed && (
                <span className="text-rose-400 font-bold text-[11px]">Missed! Try again</span>
              )}
            </div>

            {/* Tumbler Bar */}
            <div className="relative h-6 rounded-full bg-stone-900 border-2 border-stone-700 overflow-hidden mb-3">
              {/* Target Gold Zone (36% to 64%) */}
              <div
                style={{ left: '36%', width: '28%' }}
                className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500/40 via-amber-400/80 to-amber-500/40 border-x-2 border-amber-300"
              />
              {/* Moving Needle */}
              <div
                style={{ left: `calc(${tumblerPos}% - 5px)` }}
                className="absolute top-0 bottom-0 w-2.5 bg-white border border-stone-950 rounded shadow-lg"
              />
            </div>

            <button
              type="button"
              disabled={!allPairsMatched || tumblerUnlocked}
              onClick={handleLockTumbler}
              className="btn-arcade-gold w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {tumblerUnlocked
                  ? 'VAULT UNLOCKED! +1,500 CHIPS!'
                  : 'LOCK TUMBLER & CLAIM +1,500 CHIPS'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
