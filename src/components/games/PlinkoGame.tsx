import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../utils/sound';
import { CHIP_THEMES, ChipThemeId, TableActivityEvent } from '../../types/casino';
import { ChipRack } from './ChipRack';
import confetti from 'canvas-confetti';
import { ArrowLeftRight, Sparkles } from 'lucide-react';

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
  onEmergencyBailout?: () => void;
}

type RiskLevel = 'low' | 'medium' | 'high';
type RowCount = 8 | 12 | 16;
export type DropGate = 'left' | 'center' | 'right' | 'cycle';

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
  startOffset: number;
  gate: 'left' | 'center' | 'right';
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
  onEmergencyBailout,
}) => {
  const [wager, setWager] = useState<number>(Math.max(25, minBet));
  const [rows, setRows] = useState<RowCount>(12);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [dropGate, setDropGate] = useState<DropGate>('cycle');
  const [activeBucketHit, setActiveBucketHit] = useState<number | null>(null);
  const [lastHits, setLastHits] = useState<Array<{ id: string; mult: number; payout: number; gate: string }>>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<ActiveBall[]>([]);
  const pegFlashesRef = useRef<Map<string, number>>(new Map());
  const popupsRef = useRef<FloatingPopup[]>([]);
  const seenRemoteIdsRef = useRef<Set<string>>(new Set());
  const cycleCounterRef = useRef<number>(0);

  const theme = CHIP_THEMES[chipTheme] || CHIP_THEMES['classic-brass'];
  const currentMultipliers = MULTIPLIERS[rows][risk];

  useEffect(() => {
    if (recentActivity.length === 0) return;
    const latest = recentActivity[0];
    if (latest.gameType === 'plinko' && !seenRemoteIdsRef.current.has(latest.id)) {
      seenRemoteIdsRef.current.add(latest.id);
    }
  }, [recentActivity]);

  const spawnSingleBall = (ballWager: number, overrideGate?: 'left' | 'center' | 'right') => {
    // 3 distinct spawn areas: Left (-1.5), Center (0), Right (+1.5)
    let chosenGate: 'left' | 'center' | 'right';
    if (overrideGate) {
      chosenGate = overrideGate;
    } else if (dropGate === 'cycle') {
      const gates: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
      chosenGate = gates[cycleCounterRef.current % 3];
      cycleCounterRef.current += 1;
    } else {
      chosenGate = dropGate;
    }

    const startOffset = chosenGate === 'left' ? -1.5 : chosenGate === 'right' ? 1.5 : 0;

    const decisions: number[] = [];
    let currentPos = startOffset;
    for (let r = 0; r < rows; r++) {
      const maxSpan = (r + 2) / 2;
      // Probabilistic deflection based on gravity and peg hit
      let goRight = Math.random() >= 0.5;
      if (currentPos <= -maxSpan + 0.5) goRight = true;
      if (currentPos >= maxSpan - 0.5) goRight = false;

      const delta = goRight ? 0.5 : -0.5;
      decisions.push(delta);
      currentPos += delta;
    }

    const mults = MULTIPLIERS[rows][risk];
    // Map currentPos (-rows/2 .. +rows/2) into bucket index
    const centerBucket = (mults.length - 1) / 2;
    const bucketIndex = Math.min(
      mults.length - 1,
      Math.max(0, Math.round(centerBucket + currentPos))
    );
    const multiplier = mults[bucketIndex];

    const ballColor =
      chosenGate === 'left'
        ? '#38bdf8' // Sky blue
        : chosenGate === 'right'
        ? '#f43f5e' // Rose pink
        : theme.primaryHex; // Gold/Brass

    ballsRef.current.push({
      id: `ball_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      wager: ballWager,
      startOffset,
      gate: chosenGate,
      path: decisions,
      currentRow: 0,
      progress: 0,
      color: ballColor,
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

  const dropTriPattern = () => {
    if (isSpectator) return;
    if (wager * 3 > balance || wager < minBet) return;
    sound.playChipClick();
    spawnSingleBall(wager, 'left');
    setTimeout(() => spawnSingleBall(wager, 'center'), 100);
    setTimeout(() => spawnSingleBall(wager, 'right'), 200);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = canvas.width;
    const height = canvas.height;

    const topMargin = 52;
    const bottomMargin = 42;
    const usableHeight = height - topMargin - bottomMargin;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const now = performance.now();

      const rowSpacing = usableHeight / rows;
      const maxCols = rows + 2;
      const colSpacing = Math.min(44, (width - 90) / maxCols);

      // Draw 3 DISTINCT BRASS LAUNCH GATES AT TOP
      const chuteConfigs: Array<{ id: 'left' | 'center' | 'right'; x: number; label: string; color: string }> = [
        { id: 'left', x: width / 2 - 2 * colSpacing, label: 'LEFT', color: '#38bdf8' },
        { id: 'center', x: width / 2, label: 'CENTER', color: '#fbbf24' },
        { id: 'right', x: width / 2 + 2 * colSpacing, label: 'RIGHT', color: '#f43f5e' },
      ];

      for (const chute of chuteConfigs) {
        const isSelected = dropGate === chute.id || dropGate === 'cycle';
        ctx.save();
        ctx.fillStyle = isSelected ? '#1c1917' : '#0c0a09';
        ctx.strokeStyle = isSelected ? chute.color : 'rgba(212, 175, 55, 0.35)';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(chute.x - 22, 6, 44, 24, 6);
        ctx.fill();
        ctx.stroke();

        // Indicator LED
        ctx.beginPath();
        ctx.arc(chute.x, 12, 3, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? chute.color : '#57534e';
        ctx.fill();

        ctx.fillStyle = isSelected ? '#f5f5f4' : '#a8a29e';
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(chute.label, chute.x, 24);
        ctx.restore();
      }

      // Draw Glowing Pyramid Side Guard Rails
      const topHalfSpan = 2.4 * colSpacing;
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

          let offsetCols = ball.startOffset;
          for (let i = 0; i < ball.currentRow; i++) {
            offsetCols += ball.path[i];
          }
          const rIdx = ball.currentRow - 1;
          const maxColsInRow = rIdx + 3;
          const pegIndex = Math.min(
            maxColsInRow - 1,
            Math.max(0, Math.round(offsetCols + (rIdx + 2) / 2))
          );
          pegFlashesRef.current.set(`${rIdx}_${pegIndex}`, now);
          sound.playPegTick(ball.currentRow);
        }

        if (ball.currentRow >= rows) {
          const payout = Math.round(ball.wager * ball.multiplier);
          setActiveBucketHit(ball.finalBucket);
          setTimeout(() => setActiveBucketHit(null), 350);

          let finalOffset = ball.startOffset;
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
            [{ id: ball.id, mult: ball.multiplier, payout, gate: ball.gate }, ...prev].slice(0, 8)
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
            summary: `Plinko ${ball.multiplier}x pocket (${ball.gate.toUpperCase()} Gate · ${rows} rows · ${risk})`,
          });
          continue;
        }

        let prevOffset = ball.startOffset;
        for (let i = 0; i < ball.currentRow; i++) {
          prevOffset += ball.path[i];
        }
        const nextOffset = prevOffset + ball.path[ball.currentRow];
        const t = ball.progress;
        const currColOffset = prevOffset + (nextOffset - prevOffset) * t;

        const currX = width / 2 + currColOffset * colSpacing;
        const bounceArc = Math.sin(t * Math.PI) * -7;
        const currY = topMargin + (ball.currentRow + t) * rowSpacing + bounceArc;

        // 3D Glossy Plinko Ball
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

      // Draw Floating Cashout Popups
      const freshPopups: FloatingPopup[] = [];
      for (const p of popupsRef.current) {
        const age = now - p.born;
        if (age < 900) {
          const alpha = 1 - age / 900;
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.font = 'bold 12px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.globalAlpha = alpha;
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 6;
          ctx.fillText(p.text, p.x, p.y - (age / 900) * 32);
          ctx.restore();
          freshPopups.push(p);
        }
      }
      popupsRef.current = freshPopups;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [rows, risk, dropGate, onCompleteRound]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      {/* Left Arcade Control Console */}
      <div className="xl:col-span-4 flex flex-col justify-between bg-[#0c1813] border-2 border-amber-500/30 rounded-2xl p-5 shadow-xl">
        <div className="space-y-4">
          <ChipRack
            wager={wager}
            balance={balance}
            minBet={minBet}
            disabled={isSpectator}
            onChangeWager={setWager}
            onEmergencyBailout={onEmergencyBailout}
          />

          {/* 3 Drop Gates Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Plinko Drop Gate (3 Areas)</span>
              </label>
              <span className="text-[10px] font-mono text-stone-400">
                {dropGate === 'cycle' ? 'Alternating 3 Gates' : `${dropGate.toUpperCase()} Gate`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setDropGate('left')}
                className={`py-2 px-1.5 rounded-lg text-[11px] font-extrabold flex flex-col items-center gap-0.5 cursor-pointer border transition-all ${
                  dropGate === 'left'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-md'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <span>⬅ Left</span>
                <span className="text-[9px] font-mono text-stone-400">Gate 1</span>
              </button>
              <button
                type="button"
                onClick={() => setDropGate('center')}
                className={`py-2 px-1.5 rounded-lg text-[11px] font-extrabold flex flex-col items-center gap-0.5 cursor-pointer border transition-all ${
                  dropGate === 'center'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <span>⬆ Mid</span>
                <span className="text-[9px] font-mono text-stone-400">Gate 2</span>
              </button>
              <button
                type="button"
                onClick={() => setDropGate('right')}
                className={`py-2 px-1.5 rounded-lg text-[11px] font-extrabold flex flex-col items-center gap-0.5 cursor-pointer border transition-all ${
                  dropGate === 'right'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-md'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <span>Right ➡</span>
                <span className="text-[9px] font-mono text-stone-400">Gate 3</span>
              </button>
              <button
                type="button"
                onClick={() => setDropGate('cycle')}
                className={`py-2 px-1.5 rounded-lg text-[11px] font-extrabold flex flex-col items-center gap-0.5 cursor-pointer border transition-all ${
                  dropGate === 'cycle'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                <span>🎲 Cycle</span>
                <span className="text-[9px] font-mono text-stone-400">Auto 3</span>
              </button>
            </div>
          </div>

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
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isSpectator || wager > balance || wager < minBet}
              onClick={() => dropBall(1)}
              className="btn-arcade-gold w-full py-3 px-4 rounded-xl font-extrabold text-sm tracking-wide uppercase cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isSpectator
                  ? 'Spectating Table'
                  : isPractice
                  ? `Drop Ball (${wager.toLocaleString()})`
                  : `Drop Ball (${wager.toLocaleString()} Chips)`}
              </span>
            </button>

            {/* Tri-Drop button: drops 1 ball from each of the 3 gates */}
            <button
              type="button"
              disabled={isSpectator || wager * 3 > balance || wager < minBet}
              onClick={dropTriPattern}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 via-amber-600 to-rose-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              <span>⚡ Tri-Drop: All 3 Gates ({(wager * 3).toLocaleString()} Chips)</span>
            </button>

            <button
              type="button"
              disabled={isSpectator || wager * 5 > balance || wager < minBet}
              onClick={() => dropBall(5)}
              className="btn-arcade-emerald w-full py-2 px-3 rounded-xl font-bold text-xs tracking-wide uppercase cursor-pointer"
            >
              Rapid Burst: 5 Balls ({(wager * 5).toLocaleString()})
            </button>
          </div>
        </div>

        {/* Multiplier Hit Strip */}
        <div className="mt-4 pt-3 border-t border-stone-800">
          <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-2 flex items-center justify-between">
            <span>Recent Pocket Hits</span>
            <span className="text-[10px] text-amber-300 font-mono">53% Player Advantage</span>
          </div>
          {lastHits.length === 0 ? (
            <p className="text-xs text-stone-500">Launch balls through Left, Center, or Right gates!</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {lastHits.map((hit) => (
                <span
                  key={hit.id}
                  className={`font-mono-tabular text-xs font-bold px-2 py-1 rounded border flex items-center gap-1 ${
                    hit.mult >= 5
                      ? 'bg-rose-950/90 border-rose-400 text-rose-200'
                      : hit.mult >= 1
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                      : 'bg-stone-900 border-stone-700 text-stone-400'
                  }`}
                >
                  <span className="text-[9px] uppercase text-stone-400 font-sans">{hit.gate[0]}</span>
                  <span>{hit.mult}x</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Canvas Pyramid Felt Container */}
      <div className="xl:col-span-8 relative bg-gradient-to-b from-[#06140e] via-[#081b13] to-[#040c08] border-2 border-amber-500/35 rounded-2xl p-3 flex flex-col items-center justify-between min-h-[540px] shadow-2xl">
        <div className="w-full flex items-center justify-between px-3 py-1 border-b border-amber-500/20 text-xs text-stone-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-extrabold uppercase text-amber-300">Mechanical Brass Plinko</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-stone-400">
            <span>{rows} Rows</span>
            <span>·</span>
            <span className="uppercase text-amber-200">{risk} Risk</span>
            <span>·</span>
            <span className="text-emerald-300 font-bold">3 Launch Chutes</span>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="w-full flex-1 flex items-center justify-center py-2 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={720}
            height={460}
            className="w-full max-w-[720px] max-h-[460px] object-contain select-none"
          />
        </div>

        {/* Bottom Multiplier Buckets */}
        <div className="w-full pt-1 pb-1">
          <div className="flex items-center justify-center gap-1 px-2">
            {currentMultipliers.map((mult, idx) => {
              const isHit = activeBucketHit === idx;
              const isExtreme = mult >= 10;
              const isWin = mult >= 1;
              return (
                <div
                  key={idx}
                  className={`flex-1 min-w-[28px] max-w-[48px] py-2 rounded-lg text-center font-mono-tabular text-[10px] font-black transition-all ${
                    isHit
                      ? 'scale-115 -translate-y-1.5 shadow-[0_0_20px_#fde047] z-20 ' +
                        (isExtreme ? 'bg-rose-500 text-white border-2 border-white' : 'bg-yellow-300 text-stone-950')
                      : isExtreme
                      ? 'bg-rose-950 border border-rose-500/70 text-rose-300 shadow-sm'
                      : isWin
                      ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
                      : 'bg-stone-900/90 border border-stone-800 text-stone-400'
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
