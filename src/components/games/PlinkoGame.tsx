import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/sound';
import { CHIP_THEMES, ChipThemeId, TableActivityEvent } from '../../types/casino';
import { ChipRack } from './ChipRack';
import confetti from 'canvas-confetti';

interface PlinkoGameProps {
  balance: number;
  isPractice: boolean;
  isSpectator: boolean;
  chipTheme: ChipThemeId;
  minBet: number;
  recentActivity: TableActivityEvent[];
  onCompleteRound: (result: {
    wager: number;
    payout: number;
    multiplier: number;
    summary: string;
    extraVisual?: unknown;
  }) => void;
}

type RiskLevel = 'low' | 'medium' | 'high';
type RowCount = 8 | 12 | 16;

const MULTIPLIERS: Record<RowCount, Record<RiskLevel, number[]>> = {
  8: {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    high: [76, 18, 5, 1.7, 0.7, 0.2, 0.2, 0.2, 0.7, 1.7, 5, 18, 76],
  },
  16: {
    low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medium: [58, 18, 7, 4, 2, 1.3, 0.7, 0.4, 0.3, 0.4, 0.7, 1.3, 2, 4, 7, 18, 58],
    high: [110, 41, 10, 5, 3, 1.5, 0.5, 0.3, 0.2, 0.3, 0.5, 1.5, 3, 5, 10, 41, 110],
  },
};

interface ActiveBall {
  id: string;
  wager: number;
  path: number[];
  currentRow: number;
  progress: number;
  color: string;
  finalBucket: number;
  multiplier: number;
}

interface FloatingPopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
}

export const PlinkoGame: React.FC<PlinkoGameProps> = ({
  balance,
  isPractice,
  isSpectator,
  chipTheme,
  minBet,
  recentActivity,
  onCompleteRound,
}) => {
  const [wager, setWager] = useState<number>(Math.max(25, minBet));
  const [rows, setRows] = useState<RowCount>(12);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [activeBucketHit, setActiveBucketHit] = useState<number | null>(null);
  const [lastHits, setLastHits] = useState<Array<{ id: string; mult: number; payout: number }>>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<ActiveBall[]>([]);
  const pegFlashesRef = useRef<Map<string, number>>(new Map());
  const popupsRef = useRef<FloatingPopup[]>([]);
  const seenRemoteIdsRef = useRef<Set<string>>(new Set());

  const theme = CHIP_THEMES[chipTheme] || CHIP_THEMES['classic-brass'];
  const currentMultipliers = MULTIPLIERS[rows][risk];

  useEffect(() => {
    if (recentActivity.length === 0) return;
    const latest = recentActivity[0];
    if (latest.gameType === 'plinko' && !seenRemoteIdsRef.current.has(latest.id)) {
      seenRemoteIdsRef.current.add(latest.id);
    }
  }, [recentActivity]);

  const spawnSingleBall = (ballWager: number) => {
    const decisions: number[] = [];
    let rightCount = 0;
    for (let r = 0; r < rows; r++) {
      const goRight = Math.random() >= 0.5;
      decisions.push(goRight ? 0.5 : -0.5);
      if (goRight) rightCount++;
    }

    const mults = MULTIPLIERS[rows][risk];
    const bucketIndex = Math.min(mults.length - 1, Math.max(0, rightCount));
    const multiplier = mults[bucketIndex];

    ballsRef.current.push({
      id: `ball_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      wager: ballWager,
      path: decisions,
      currentRow: 0,
      progress: 0,
      color: theme.primaryHex,
      finalBucket: bucketIndex,
      multiplier,
    });
  };

  const dropBall = (count: number = 1) => {
    if (isSpectator) return;
    if (wager * count > balance || wager < minBet) return;
    sound.playChipClick();

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        spawnSingleBall(wager);
      }, i * 110);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = canvas.width;
    const height = canvas.height;

    const topMargin = 48;
    const bottomMargin = 42;
    const usableHeight = height - topMargin - bottomMargin;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const now = performance.now();

      const rowSpacing = usableHeight / rows;
      const maxCols = rows + 2;
      const colSpacing = Math.min(44, (width - 90) / maxCols);

      // Draw Brass Ball Launcher Nozzle at top center
      ctx.save();
      ctx.fillStyle = '#292524';
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 22, 4, 44, 24, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DROP', width / 2, 19);
      ctx.restore();

      // Draw Glowing Pyramid Side Guard Rails
      const topHalfSpan = 1.6 * colSpacing;
      const bottomHalfSpan = ((rows + 2) / 2 + 0.6) * colSpacing;
      ctx.save();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - topHalfSpan, topMargin - 8);
      ctx.lineTo(width / 2 - bottomHalfSpan, topMargin + (rows - 1) * rowSpacing + 14);
      ctx.moveTo(width / 2 + topHalfSpan, topMargin - 8);
      ctx.lineTo(width / 2 + bottomHalfSpan, topMargin + (rows - 1) * rowSpacing + 14);
      ctx.stroke();
      ctx.restore();

      // Draw Brass Pegs
      for (let r = 0; r < rows; r++) {
        const pegsInRow = r + 3;
        const rowY = topMargin + r * rowSpacing;
        const rowWidth = (pegsInRow - 1) * colSpacing;
        const startX = width / 2 - rowWidth / 2;

        for (let c = 0; c < pegsInRow; c++) {
          const pegX = startX + c * colSpacing;
          const pegKey = `${r}_${c}`;
          const flashTime = pegFlashesRef.current.get(pegKey) || 0;
          const flashAge = now - flashTime;
          const isFlashing = flashAge < 240;

          // Outer peg shadow
          ctx.beginPath();
          ctx.arc(pegX, rowY + 2, isFlashing ? 6 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fill();

          // Metallic peg body
          ctx.beginPath();
          ctx.arc(pegX, rowY, isFlashing ? 6 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = isFlashing ? '#fef08a' : '#eab308';
          ctx.fill();

          if (isFlashing) {
            ctx.beginPath();
            ctx.arc(pegX, rowY, 11, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(250, 204, 21, ${1 - flashAge / 240})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      // Update & Draw Active Balls
      const remainingBalls: ActiveBall[] = [];
      for (const ball of ballsRef.current) {
        ball.progress += 0.14;

        if (ball.progress >= 1) {
          ball.progress = 0;
          ball.currentRow += 1;

          let offsetCols = 0;
          for (let i = 0; i < ball.currentRow; i++) {
            offsetCols += ball.path[i];
          }
          const rIdx = ball.currentRow - 1;
          const pegIndex = Math.round(offsetCols + (rIdx + 2) / 2);
          pegFlashesRef.current.set(`${rIdx}_${pegIndex}`, now);
          sound.playPegTick(ball.currentRow);
        }

        if (ball.currentRow >= rows) {
          const payout = Math.round(ball.wager * ball.multiplier);
          setActiveBucketHit(ball.finalBucket);
          setTimeout(() => setActiveBucketHit(null), 350);

          let finalOffset = 0;
          for (let i = 0; i < rows; i++) finalOffset += ball.path[i];
          const landX = width / 2 + finalOffset * colSpacing;

          popupsRef.current.push({
            id: ball.id,
            x: landX,
            y: height - 24,
            text: `${ball.multiplier}x (+${payout})`,
            color: ball.multiplier >= 2 ? '#fde047' : ball.multiplier >= 1 ? '#34d399' : '#a8a29e',
            born: now,
          });

          setLastHits((prev) =>
            [{ id: ball.id, mult: ball.multiplier, payout }, ...prev].slice(0, 8)
          );

          if (ball.multiplier >= 5) {
            sound.playWinChime(true);
            confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
          } else if (ball.multiplier >= 1) {
            sound.playWinChime(false);
          } else {
            sound.playLossThud();
          }

          onCompleteRound({
            wager: ball.wager,
            payout,
            multiplier: ball.multiplier,
            summary: `Plinko ${ball.multiplier}x pocket (${rows} rows · ${risk})`,
          });
          continue;
        }

        let prevOffset = 0;
        for (let i = 0; i < ball.currentRow; i++) {
          prevOffset += ball.path[i];
        }
        const nextOffset = prevOffset + ball.path[ball.currentRow];
        const t = ball.progress;
        const currColOffset = prevOffset + (nextOffset - prevOffset) * t;

        const currX = width / 2 + currColOffset * colSpacing;
        const bounceArc = Math.sin(t * Math.PI) * -7;
        const currY = topMargin + (ball.currentRow + t) * rowSpacing + bounceArc;

        // 3D Glossy Gold Ball
        ctx.beginPath();
        ctx.arc(currX, currY, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Specular highlight
        ctx.beginPath();
        ctx.arc(currX - 2.5, currY - 2.5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();

        remainingBalls.push(ball);
      }

      ballsRef.current = remainingBalls;

      // Render Floating Score Popups
      const activePopups: FloatingPopup[] = [];
      for (const pop of popupsRef.current) {
        const age = now - pop.born;
        if (age < 900) {
          const alpha = 1 - age / 900;
          ctx.save();
          ctx.font = 'bold 12px JetBrains Mono, monospace';
          ctx.fillStyle = pop.color;
          ctx.globalAlpha = alpha;
          ctx.textAlign = 'center';
          ctx.fillText(pop.text, pop.x, pop.y - (age / 900) * 34);
          ctx.restore();
          activePopups.push(pop);
        }
      }
      popupsRef.current = activePopups;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [rows, risk, onCompleteRound]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left Arcade Control Console */}
      <div className="lg:col-span-4 flex flex-col justify-between bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-5 shadow-xl">
        <div className="space-y-4">
          <ChipRack
            wager={wager}
            balance={balance}
            minBet={minBet}
            disabled={isSpectator}
            onChangeWager={setWager}
          />

          {/* Risk Selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1.5">
              Volatility Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as RiskLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={isSpectator}
                  onClick={() => setRisk(level)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    risk === level
                      ? level === 'high'
                        ? 'btn-arcade-crimson'
                        : 'btn-arcade-gold'
                      : 'btn-arcade-dark text-stone-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Row Selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1.5">
              Peg Pyramid Depth
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([8, 12, 16] as RowCount[]).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  disabled={isSpectator}
                  onClick={() => setRows(cnt)}
                  className={`py-2 px-3 rounded-lg text-xs font-mono-tabular font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    rows === cnt ? 'btn-arcade-gold' : 'btn-arcade-dark text-stone-300'
                  }`}
                >
                  {cnt} ROWS
                </button>
              ))}
            </div>
          </div>

          {/* Arcade Launch Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={isSpectator || wager > balance || wager < minBet}
              onClick={() => dropBall(1)}
              className="btn-arcade-gold w-full py-3.5 px-5 rounded-xl font-extrabold text-sm tracking-wide uppercase cursor-pointer whitespace-nowrap shrink-0"
            >
              {isSpectator
                ? 'Spectating Table'
                : isPractice
                ? `Drop Practice Ball (${wager.toLocaleString()})`
                : `Drop Plinko Ball (${wager.toLocaleString()})`}
            </button>

            <button
              type="button"
              disabled={isSpectator || wager * 5 > balance || wager < minBet}
              onClick={() => dropBall(5)}
              className="btn-arcade-emerald w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide uppercase cursor-pointer whitespace-nowrap shrink-0"
            >
              Rapid Burst: Drop 5 Balls ({(wager * 5).toLocaleString()})
            </button>
          </div>
        </div>

        {/* Multiplier Hit Strip */}
        <div className="mt-5 pt-3.5 border-t border-stone-800">
          <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-2">
            Recent Pocket Hits
          </div>
          {lastHits.length === 0 ? (
            <p className="text-xs text-stone-500">Launch balls into the brass pyramid!</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {lastHits.map((hit) => (
                <span
                  key={hit.id}
                  className={`font-mono-tabular text-xs font-bold px-2 py-1 rounded border ${
                    hit.mult >= 5
                      ? 'bg-rose-950/90 border-rose-400 text-rose-200'
                      : hit.mult >= 1
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                      : 'bg-stone-900 border-stone-700 text-stone-400'
                  }`}
                >
                  {hit.mult}x
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Arcade Plinko Cabinet */}
      <div className="lg:col-span-8 casino-table-rail casino-felt-surface rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-amber-200/90 font-semibold mb-1">
          <span>PLINKO GRAND PYRAMID · {rows} ROWS</span>
          <span className="font-mono-tabular text-amber-300">
            JACKPOT POCKET: {Math.max(...currentMultipliers)}X
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <canvas
            ref={canvasRef}
            width={680}
            height={380}
            className="w-full max-w-[680px] h-auto"
          />

          {/* 3D Beveled Multiplier Buckets */}
          <div className="w-full max-w-[640px] flex items-center justify-center gap-1 mt-1 px-2">
            {currentMultipliers.map((mult, idx) => {
              const isEdge = mult >= 10;
              const isMid = mult >= 1.5 && mult < 10;
              const isHit = activeBucketHit === idx;
              return (
                <div
                  key={idx}
                  className={`flex-1 py-2 rounded-md text-center font-mono-tabular text-[11px] font-extrabold border-b-4 transition-transform ${
                    isHit ? '-translate-y-2 scale-110 ring-2 ring-white' : ''
                  } ${
                    isEdge
                      ? 'bg-rose-600 border-rose-900 text-white shadow-md'
                      : isMid
                      ? 'bg-amber-400 border-amber-700 text-stone-950 shadow-md'
                      : 'bg-stone-800 border-stone-950 text-stone-300'
                  }`}
                >
                  {mult}x
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
