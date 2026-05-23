import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STATS = [
  { key: "fitness", label: "Fitness", icon: "⚡" },
  { key: "discipline", label: "Discipline", icon: "🎯" },
  { key: "mental", label: "Mental", icon: "🧠" },
  { key: "social", label: "Social", icon: "🤝" },
  { key: "diet", label: "Diet", icon: "🥗" },
  { key: "sleep", label: "Sleep", icon: "🌙" },
  { key: "learning", label: "Learning", icon: "📚" },
  { key: "skills", label: "Skills", icon: "🔧" },
  { key: "hygiene", label: "Hygiene", icon: "✨" },
  { key: "screen", label: "Screen", icon: "📱" },
  { key: "hobbies", label: "Hobbies", icon: "🎨" },
  { key: "creativity", label: "Creativity", icon: "💡" },
];

const HABITS = [
  { id: "workout", label: "Workout", xp: 25, penalty: 8, stat: "fitness", icon: "⚡" },
  { id: "water", label: "Water Goal", xp: 10, penalty: 2, stat: "diet", icon: "💧" },
  { id: "sleep", label: "Sleep Goal", xp: 20, penalty: 5, stat: "sleep", icon: "🌙" },
  { id: "reading", label: "Reading", xp: 15, penalty: 3, stat: "learning", icon: "📖" },
  { id: "meditation", label: "Meditation", xp: 15, penalty: 3, stat: "mental", icon: "🧘" },
  { id: "social", label: "Social Interaction", xp: 10, penalty: 2, stat: "social", icon: "🤝" },
  { id: "screen", label: "Screen Time Controlled", xp: 25, penalty: 10, stat: "screen", icon: "📵" },
  { id: "skill", label: "Skill Practice", xp: 20, penalty: 5, stat: "skills", icon: "🔧" },
  { id: "diet", label: "Diet Goal", xp: 25, penalty: 8, stat: "diet", icon: "🥗" },
  { id: "hygiene", label: "Hygiene Routine", xp: 15, penalty: 2, stat: "hygiene", icon: "✨" },
  { id: "hobby", label: "Hobby / Fun", xp: 20, penalty: 3, stat: "hobbies", icon: "🎨" },
];

const RANKS = [
  { name: "Beginner", minLevel: 1, color: "#94a3b8" },
  { name: "Disciplined", minLevel: 5, color: "#22d3ee" },
  { name: "Focused", minLevel: 10, color: "#818cf8" },
  { name: "Elite", minLevel: 20, color: "#f59e0b" },
  { name: "Ascended", minLevel: 35, color: "#ec4899" },
  { name: "Legendary", minLevel: 50, color: "#ff6b35" },
];

const xpForLevel = (level) => Math.floor(100 * Math.pow(level, 1.6));
const totalXpForLevel = (level) => {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
};

const getRank = (level) => {
  let rank = RANKS[0];
  for (const r of RANKS) { if (level >= r.minLevel) rank = r; }
  return rank;
};

const getMotivation = (level, streak) => {
  const lines = [
    "Every rep counts. Every day matters.",
    "You're building the version of yourself that future you will thank.",
    "Discipline is choosing between what you want now and what you want most.",
    "The grind is quiet. The results are loud.",
    "Small wins compound into legendary outcomes.",
    "You showed up today. That's already more than most.",
    "Progress isn't always visible — but it's always real.",
  ];
  return lines[(level + streak) % lines.length];
};

const today = () => new Date().toISOString().split("T")[0];

// ─── DEFAULT STATE ────────────────────────────────────────────────────────────
const defaultState = () => ({
  level: 1,
  totalXp: 0,
  streak: 0,
  lastActiveDate: null,
  stats: Object.fromEntries(STATS.map(s => [s.key, 20])),
  completedToday: {},
  history: [],
  hobbies: [{ id: "hobby1", name: "Guitar", xp: 0, sessions: 0 }],
  screenTime: [],
  settings: { darkMode: true, animations: true },
  floatingXp: [],
  xpLog: [],
});

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const save = (state) => {
  try { localStorage.setItem("lifemaxxing_v2", JSON.stringify(state)); } catch {}
};
const load = () => {
  try {
    const raw = localStorage.getItem("lifemaxxing_v2");
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch {}
  return defaultState();
};

// ─── RADAR CHART ──────────────────────────────────────────────────────────────
function RadarChart({ stats, size = 260, animated = true }) {
  const center = size / 2;
  const radius = size * 0.38;
  const n = STATS.length;
  const [displayed, setDisplayed] = useState(
    Object.fromEntries(STATS.map(s => [s.key, 0]))
  );

  useEffect(() => {
    if (!animated) { setDisplayed(stats); return; }
    let frame;
    const animate = () => {
      setDisplayed(prev => {
        const next = { ...prev };
        let changed = false;
        for (const s of STATS) {
          const target = stats[s.key] || 0;
          const diff = target - prev[s.key];
          if (Math.abs(diff) > 0.5) { next[s.key] = prev[s.key] + diff * 0.08; changed = true; }
          else next[s.key] = target;
        }
        if (changed) frame = requestAnimationFrame(animate);
        return next;
      });
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stats, animated]);

  const getPoint = (i, val) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = (val / 100) * radius;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  };
  const getLabelPoint = (i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = radius + 22;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  };

  const rings = [20, 40, 60, 80, 100];
  const polygon = (val) =>
    STATS.map((s, i) => getPoint(i, val).join(",")).join(" ");
  const dataPolygon = STATS.map((s, i) => getPoint(i, displayed[s.key])).map(p => p.join(",")).join(" ");

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.05" />
        </radialGradient>
        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Grid rings */}
      {rings.map(r => (
        <polygon key={r} points={polygon(r)}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {STATS.map((s, i) => {
        const [x, y] = getPoint(i, 100);
        return <line key={s.key} x1={center} y1={center} x2={x} y2={y}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <polygon points={dataPolygon} fill="url(#radarFill)"
        stroke="#22d3ee" strokeWidth="2" filter="url(#radarGlow)" />
      {/* Data dots */}
      {STATS.map((s, i) => {
        const [x, y] = getPoint(i, displayed[s.key]);
        return <circle key={s.key} cx={x} cy={y} r="3.5"
          fill="#22d3ee" filter="url(#radarGlow)" />;
      })}
      {/* Labels */}
      {STATS.map((s, i) => {
        const [x, y] = getLabelPoint(i);
        return (
          <text key={s.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'Sora', sans-serif"
            fontWeight="500">
            {s.label.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

// ─── XP BAR ───────────────────────────────────────────────────────────────────
function XpBar({ totalXp, level }) {
  const levelStart = totalXpForLevel(level);
  const levelEnd = totalXpForLevel(level + 1);
  const progress = Math.min(((totalXp - levelStart) / (levelEnd - levelStart)) * 100, 100);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
          XP {totalXp - levelStart} / {levelEnd - levelStart}
        </span>
        <span style={{ fontSize: 11, color: "#22d3ee", letterSpacing: "0.1em" }}>
          LVL {level + 1} →
        </span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: "linear-gradient(90deg, #0891b2, #22d3ee)",
          borderRadius: 99, transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: "0 0 12px #22d3ee88"
        }} />
      </div>
    </div>
  );
}

// ─── AVATAR (Canvas hologram) ─────────────────────────────────────────────────
function Avatar({ level }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const timeRef   = useRef(0);

  const tier = level < 5 ? 0 : level < 10 ? 1 : level < 20 ? 2 : level < 35 ? 3 : 4;
  const COLORS = ["#475569","#22d3ee","#818cf8","#f59e0b","#ec4899"];
  const color  = COLORS[tier];

  // Parse hex color → rgb components for canvas rgba()
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return [r,g,b];
  };
  const [cr,cg,cb] = hexToRgb(color);
  const rgba = (a) => `rgba(${cr},${cg},${cb},${a})`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;   // 160
    const H = canvas.height;  // 200
    const cx = W / 2;

    // ── Build the human silhouette path (half-body: head→mid-thigh) ────────
    // All coords scaled to 160×200 canvas
    const buildPath = () => {
      const p = new Path2D();
      // HEAD — realistic oval, not a circle
      // Center ~(80,28), rx=18, ry=22
      p.ellipse(cx, 28, 18, 22, 0, 0, Math.PI * 2);
      return p;
    };

    // Build torso as a separate path so we can fill body shape
    const buildTorso = () => {
      const p = new Path2D();
      // Neck
      p.moveTo(cx - 7, 48);
      p.lineTo(cx - 7, 54);
      // Left shoulder sweep out
      p.bezierCurveTo(cx - 12, 55, cx - 28, 58, cx - 34, 66);
      // Left arm stub / shoulder cap
      p.bezierCurveTo(cx - 36, 70, cx - 34, 75, cx - 30, 77);
      // Left side of torso
      p.bezierCurveTo(cx - 27, 80, cx - 22, 82, cx - 20, 90);
      p.bezierCurveTo(cx - 19, 98, cx - 18, 110, cx - 17, 124);
      // Left waist / hip
      p.bezierCurveTo(cx - 17, 132, cx - 20, 138, cx - 22, 148);
      // bottom-left
      p.lineTo(cx - 22, 160);
      // bottom-right
      p.lineTo(cx + 22, 160);
      // Right hip / waist up
      p.lineTo(cx + 22, 148);
      p.bezierCurveTo(cx + 20, 138, cx + 17, 132, cx + 17, 124);
      p.bezierCurveTo(cx + 16, 110, cx + 19, 98, cx + 20, 90);
      p.bezierCurveTo(cx + 22, 82, cx + 27, 80, cx + 30, 77);
      // Right shoulder cap
      p.bezierCurveTo(cx + 34, 75, cx + 36, 70, cx + 34, 66);
      // Right shoulder sweep in
      p.bezierCurveTo(cx + 28, 58, cx + 12, 55, cx + 7, 54);
      // Back to neck right side
      p.lineTo(cx + 7, 48);
      p.closePath();
      return p;
    };

    const headPath  = buildPath();
    const torsoPath = buildTorso();

    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);

      const breathe = Math.sin(t * 0.0008) * 0.012; // subtle scale

      ctx.save();
      ctx.translate(cx, H * 0.5);
      ctx.scale(1 + breathe, 1 + breathe * 0.5);
      ctx.translate(-cx, -H * 0.5);

      // ── AURA glow behind figure ───────────────────────────────────────
      if (tier > 0) {
        const auraRadius = 50 + tier * 18 + Math.sin(t * 0.0006) * 4;
        const aura = ctx.createRadialGradient(cx, 100, 10, cx, 100, auraRadius);
        aura.addColorStop(0, rgba(0.18 + tier * 0.05));
        aura.addColorStop(1, rgba(0));
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, W, H);
      }

      // ── BODY FILL (dark translucent with top glow) ───────────────────
      const bodyFill = ctx.createLinearGradient(cx, 6, cx, H);
      bodyFill.addColorStop(0,   rgba(0.22 + tier * 0.04));
      bodyFill.addColorStop(0.4, rgba(0.10));
      bodyFill.addColorStop(1,   rgba(0.02));
      ctx.fillStyle = bodyFill;
      ctx.fill(headPath);
      ctx.fill(torsoPath);

      // ── SCAN LINES inside body ────────────────────────────────────────
      ctx.save();
      ctx.clip(torsoPath);
      ctx.globalAlpha = 0.09 + tier * 0.025;
      for (let y = 50; y < 168; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      ctx.restore();

      // Also scan lines in head
      ctx.save();
      ctx.clip(headPath);
      ctx.globalAlpha = 0.07 + tier * 0.02;
      for (let y = 8; y < 52; y += 5) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();

      // ── EDGE GLOW STROKE ──────────────────────────────────────────────
      const glowPasses = tier >= 2 ? 3 : tier >= 1 ? 2 : 1;
      for (let pass = 0; pass < glowPasses; pass++) {
        ctx.shadowColor   = color;
        ctx.shadowBlur    = 6 + pass * 5 + tier * 3;
        ctx.strokeStyle   = rgba(0.9 - pass * 0.25);
        ctx.lineWidth     = 1.2 + tier * 0.3 - pass * 0.3;
        ctx.stroke(headPath);
        ctx.stroke(torsoPath);
      }
      ctx.shadowBlur = 0;

      // ── COLLARBONE LINE ───────────────────────────────────────────────
      if (tier >= 1) {
        ctx.beginPath();
        ctx.moveTo(cx - 22, 60);
        ctx.quadraticCurveTo(cx, 56, cx + 22, 60);
        ctx.strokeStyle = rgba(0.4);
        ctx.lineWidth   = 1;
        ctx.shadowColor = color;
        ctx.shadowBlur  = 4;
        ctx.stroke();
        ctx.shadowBlur  = 0;
      }

      // ── CHEST CENTER LINE ─────────────────────────────────────────────
      if (tier >= 1) {
        const grad = ctx.createLinearGradient(cx, 62, cx, 130);
        grad.addColorStop(0, rgba(0.45));
        grad.addColorStop(1, rgba(0.05));
        ctx.beginPath();
        ctx.moveTo(cx, 62);
        ctx.lineTo(cx, 130);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 0.8;
        ctx.shadowColor = color;
        ctx.shadowBlur  = 5;
        ctx.stroke();
        ctx.shadowBlur  = 0;
      }

      // ── SHOULDER CAPS (extra definition at tier 2+) ───────────────────
      if (tier >= 2) {
        [[cx - 33, 68], [cx + 33, 68]].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.arc(sx, sy, 5, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(0.35);
          ctx.lineWidth   = 0.8;
          ctx.shadowColor = color;
          ctx.shadowBlur  = 6;
          ctx.stroke();
          ctx.shadowBlur  = 0;
        });
      }

      // ── ORBIT RING around head (tier 3+) ─────────────────────────────
      if (tier >= 3) {
        const angle = t * 0.0004;
        ctx.save();
        ctx.translate(cx, 28);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(0.45);
        ctx.lineWidth   = 0.9;
        ctx.shadowColor = color;
        ctx.shadowBlur  = 8;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur  = 0;
        ctx.restore();
      }

      // ── HOLOGRAM FADE (bottom) ────────────────────────────────────────
      const fade = ctx.createLinearGradient(0, 130, 0, H);
      fade.addColorStop(0,   "rgba(7,11,18,0)");
      fade.addColorStop(0.7, "rgba(7,11,18,0.6)");
      fade.addColorStop(1,   "rgba(7,11,18,1)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, W, H);

      // ── FLOATING PARTICLE (tier 1+) ───────────────────────────────────
      if (tier >= 1) {
        const px = cx + Math.sin(t * 0.0005) * 22;
        const py = 90 + Math.cos(t * 0.0007) * 18;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(0.6);
        ctx.shadowColor = color;
        ctx.shadowBlur  = 8;
        ctx.fill();
        ctx.shadowBlur  = 0;
      }

      ctx.restore();
    };

    const loop = (t) => {
      timeRef.current = t;
      draw(t);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [tier, color, cr, cg, cb]);

  return (
    <div style={{ position: "relative", width: 80, height: 100, flexShrink: 0 }}>
      <canvas
        ref={canvasRef}
        width={160} height={200}
        style={{ width: 80, height: 100, display: "block" }}
      />
    </div>
  );
}

// ─── FLOATING XP ─────────────────────────────────────────────────────────────
function FloatingXp({ items }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {items.map(item => (
        <div key={item.id} style={{
          position: "absolute", left: "50%", top: "40%",
          transform: "translateX(-50%)",
          color: item.positive ? "#22d3ee" : "#ef4444",
          fontFamily: "'Sora', sans-serif",
          fontWeight: 700, fontSize: 22,
          textShadow: `0 0 20px ${item.positive ? "#22d3ee" : "#ef4444"}`,
          animation: "floatUp 1.5s ease-out forwards",
          letterSpacing: "0.05em"
        }}>
          {item.positive ? "+" : ""}{item.xp} XP
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function LifeMaxxing() {
  const [state, setState] = useState(load);
  const [tab, setTab] = useState("dashboard");
  const [floatingXp, setFloatingXp] = useState([]);
  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const [hobbyInput, setHobbyInput] = useState("");
  const [screenInput, setScreenInput] = useState("");
  const floatIdRef = useRef(0);

  // Persist
  useEffect(() => { save(state); }, [state]);

  // Daily reset
  useEffect(() => {
    const todayStr = today();
    if (state.lastActiveDate !== todayStr) {
      setState(prev => {
        // Save history
        const historyEntry = {
          date: todayStr,
          xpGained: Object.entries(prev.completedToday)
            .filter(([, v]) => v)
            .reduce((sum, [id]) => sum + (HABITS.find(h => h.id === id)?.xp || 0), 0),
          stats: { ...prev.stats },
          level: prev.level,
        };
        // Streak check
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split("T")[0];
        const streakContinues = prev.lastActiveDate === yStr;

        return {
          ...prev,
          completedToday: {},
          lastActiveDate: todayStr,
          streak: streakContinues ? prev.streak : 0,
          history: [historyEntry, ...prev.history].slice(0, 90),
        };
      });
    }
  }, []);

  const showFloatingXp = useCallback((xp, positive = true) => {
    const id = floatIdRef.current++;
    setFloatingXp(prev => [...prev, { id, xp, positive }]);
    setTimeout(() => setFloatingXp(prev => prev.filter(x => x.id !== id)), 1600);
  }, []);

  const completeHabit = useCallback((habitId) => {
    const habit = HABITS.find(h => h.id === habitId);
    if (!habit) return;
    const alreadyDone = state.completedToday[habitId];

    setState(prev => {
      const gain = alreadyDone ? -habit.xp : habit.xp;
      const newXp = Math.max(0, prev.totalXp + gain);
      const newCompleted = { ...prev.completedToday, [habitId]: !alreadyDone };
      const newStats = { ...prev.stats };
      const delta = alreadyDone ? -Math.min(3, habit.xp / 8) : Math.min(5, habit.xp / 5);
      newStats[habit.stat] = Math.max(0, Math.min(100, (newStats[habit.stat] || 0) + delta));

      // Level up check
      let newLevel = prev.level;
      while (newXp >= totalXpForLevel(newLevel + 1)) newLevel++;

      if (newLevel > prev.level) setLevelUpAnim(true), setTimeout(() => setLevelUpAnim(false), 2500);

      // Streak
      const doneCount = Object.values(newCompleted).filter(Boolean).length;
      const streak = doneCount >= HABITS.length * 0.7 ? Math.max(prev.streak, prev.streak + 1) : prev.streak;

      return { ...prev, totalXp: newXp, level: newLevel, stats: newStats, completedToday: newCompleted, streak };
    });
    showFloatingXp(habit.xp, !alreadyDone);
  }, [state.completedToday, showFloatingXp]);

  const completedCount = Object.values(state.completedToday).filter(Boolean).length;
  const rank = getRank(state.level);
  const todayXp = Object.entries(state.completedToday)
    .filter(([, v]) => v)
    .reduce((sum, [id]) => sum + (HABITS.find(h => h.id === id)?.xp || 0), 0);

  const styles = {
    app: {
      minHeight: "100vh",
      background: "#070b12",
      color: "#e2e8f0",
      fontFamily: "'Sora', 'DM Sans', sans-serif",
      position: "relative",
      maxWidth: 430,
      margin: "0 auto",
      paddingBottom: 80,
    },
    nav: {
      position: "fixed", bottom: 0, left: "50%",
      transform: "translateX(-50%)",
      width: "100%", maxWidth: 430,
      background: "rgba(7,11,18,0.95)",
      backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      display: "flex", zIndex: 100,
      padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
    },
    navBtn: (active) => ({
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      gap: 3, padding: "6px 0", cursor: "pointer", border: "none",
      background: "none", color: active ? "#22d3ee" : "rgba(255,255,255,0.3)",
      fontSize: 10, fontFamily: "inherit", fontWeight: 500, letterSpacing: "0.05em",
      transition: "all 0.2s",
    }),
  };

  const TABS = [
    { id: "dashboard", icon: "⊞", label: "HOME" },
    { id: "stats", icon: "◎", label: "STATS" },
    { id: "quests", icon: "◈", label: "QUESTS" },
    { id: "analytics", icon: "▦", label: "DATA" },
    { id: "settings", icon: "⊙", label: "MORE" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #070b12; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 0; }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-80px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes levelUp {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.04; transform: scaleY(1); }
          50% { opacity: 0.12; transform: scaleY(1.12); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); transform-origin: 44px 16px; }
          to   { transform: rotate(360deg); transform-origin: 44px 16px; }
        }
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 20px;
          backdrop-filter: blur(10px);
          animation: fadeIn 0.4s ease;
        }
        .habit-btn {
          width: 100%;
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          cursor: pointer;
          color: inherit;
          font-family: inherit;
          transition: all 0.2s;
          text-align: left;
        }
        .habit-btn:hover { background: rgba(34,211,238,0.06); border-color: rgba(34,211,238,0.2); }
        .habit-btn.done {
          background: rgba(34,211,238,0.08);
          border-color: rgba(34,211,238,0.25);
        }
        .tab-content { padding: 20px 16px; animation: fadeIn 0.3s ease; }
        .section-title {
          font-size: 10px; font-weight: 600; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.3); text-transform: uppercase; margin-bottom: 12px;
        }
        input[type="text"], input[type="number"] {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #e2e8f0;
          font-family: inherit;
          font-size: 14px;
          padding: 10px 14px;
          outline: none;
          width: 100%;
        }
        input:focus { border-color: rgba(34,211,238,0.4); }
        .glow-text {
          background: linear-gradient(135deg, #22d3ee, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div style={styles.app}>
        <FloatingXp items={floatingXp} />

        {levelUpAnim && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9998,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)"
          }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              animation: "levelUp 2.5s ease forwards",
              textAlign: "center"
            }}>
              <div style={{ fontSize: 14, letterSpacing: "0.3em", color: "#22d3ee", marginBottom: 8 }}>
                LEVEL UP
              </div>
              <div style={{
                fontSize: 72, fontWeight: 800, lineHeight: 1,
                background: "linear-gradient(135deg, #22d3ee, #818cf8)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>
                {state.level}
              </div>
              <div style={{ fontSize: 14, color: rank.color, marginTop: 8, letterSpacing: "0.2em" }}>
                {rank.name}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: DASHBOARD ── */}
        {tab === "dashboard" && (
          <div className="tab-content">
            {/* Header */}
            <div style={{ marginBottom: 24, paddingTop: 8 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>
                LIFE MAXXING
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div className="glow-text" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
                    Level {state.level}
                  </div>
                  <div style={{ fontSize: 13, color: rank.color, fontWeight: 600, marginTop: 2, letterSpacing: "0.1em" }}>
                    {rank.name}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>STREAK</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>
                    {state.streak}🔥
                  </div>
                </div>
              </div>
            </div>

            {/* Avatar + Radar */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <Avatar level={state.level} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, lineHeight: 1.5 }}>
                    {getMotivation(state.level, state.streak)}
                  </div>
                  <XpBar totalXp={state.totalXp} level={state.level} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RadarChart stats={state.stats} size={240} />
              </div>
            </div>

            {/* Today's XP */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "TODAY'S XP", value: `+${todayXp}`, color: "#22d3ee" },
                { label: "QUESTS DONE", value: `${completedCount}/${HABITS.length}`, color: "#818cf8" },
              ].map(item => (
                <div key={item.label} className="card" style={{ textAlign: "center", padding: 16 }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", marginBottom: 6 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: item.color }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick habits */}
            <div className="section-title">TODAY'S HABITS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {HABITS.map(habit => {
                const done = !!state.completedToday[habit.id];
                return (
                  <button key={habit.id}
                    className={`habit-btn${done ? " done" : ""}`}
                    onClick={() => completeHabit(habit.id)}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: `2px solid ${done ? "#22d3ee" : "rgba(255,255,255,0.15)"}`,
                      background: done ? "#22d3ee22" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.2s"
                    }}>
                      {done && <span style={{ fontSize: 11, color: "#22d3ee" }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13 }}>{habit.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: done ? "#22d3ee" : "#e2e8f0" }}>
                        {habit.label}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#22d3ee", fontWeight: 600 }}>
                      +{habit.xp} XP
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB: STATS ── */}
        {tab === "stats" && (
          <div className="tab-content">
            <div style={{ marginBottom: 20, paddingTop: 8 }}>
              <div className="glow-text" style={{ fontSize: 28, fontWeight: 800 }}>Life Stats</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                Your attributes at a glance
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
              <RadarChart stats={state.stats} size={280} />
            </div>

            <div className="section-title">ATTRIBUTE BREAKDOWN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {STATS.map(s => {
                const val = Math.round(state.stats[s.key] || 0);
                return (
                  <div key={s.key} className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#22d3ee" }}>{val}</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${val}%`,
                        background: val >= 70 ? "linear-gradient(90deg,#22d3ee,#818cf8)" :
                          val >= 40 ? "linear-gradient(90deg,#0891b2,#22d3ee)" :
                            "linear-gradient(90deg,#475569,#64748b)",
                        borderRadius: 99, transition: "width 1s ease"
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB: QUESTS ── */}
        {tab === "quests" && (
          <div className="tab-content">
            <div style={{ marginBottom: 20, paddingTop: 8 }}>
              <div className="glow-text" style={{ fontSize: 28, fontWeight: 800 }}>Daily Quests</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                {completedCount}/{HABITS.length} completed · +{todayXp} XP earned today
              </div>
            </div>

            {/* Progress ring */}
            <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <svg width="70" height="70" viewBox="0 0 70 70">
                <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle cx="35" cy="35" r="28" fill="none" stroke="#22d3ee" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - completedCount / HABITS.length)}`}
                  strokeLinecap="round" transform="rotate(-90 35 35)"
                  style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)", filter: "drop-shadow(0 0 6px #22d3ee)" }}
                />
                <text x="35" y="40" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="700" fontFamily="Sora,sans-serif">
                  {Math.round(completedCount / HABITS.length * 100)}%
                </text>
              </svg>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {completedCount >= HABITS.length ? "All Quests Done! 🏆" :
                    completedCount >= HABITS.length * 0.7 ? "Almost there!" :
                      completedCount > 0 ? "Keep going!" : "Start your day!"}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  {completedCount >= HABITS.length * 0.7 ? "Streak bonus unlocked" : `${HABITS.length - completedCount} quests remaining`}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {HABITS.map(habit => {
                const done = !!state.completedToday[habit.id];
                return (
                  <button key={habit.id}
                    className={`habit-btn${done ? " done" : ""}`}
                    onClick={() => completeHabit(habit.id)}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: done ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${done ? "#22d3ee44" : "rgba(255,255,255,0.08)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0, transition: "all 0.2s"
                    }}>
                      {done ? "✓" : habit.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: done ? "#22d3ee" : "#e2e8f0" }}>
                        {habit.label}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                        Affects {STATS.find(s => s.key === habit.stat)?.label}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "#22d3ee", fontWeight: 600 }}>+{habit.xp}</div>
                      <div style={{ fontSize: 10, color: "#ef4444" }}>-{habit.penalty}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Hobbies */}
            <div style={{ marginTop: 24 }}>
              <div className="section-title">HOBBIES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {state.hobbies.map(h => (
                  <div key={h.id} className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>🎨 {h.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                          {h.sessions} sessions · {h.xp} XP total
                        </div>
                      </div>
                      <button onClick={() => {
                        const name = prompt("Rename hobby:", h.name);
                        if (name) setState(prev => ({
                          ...prev,
                          hobbies: prev.hobbies.map(x =>
                            x.id === h.id ? { ...x, name, history: [...(x.history || []), { from: x.name, to: name, date: today() }] } : x
                          )
                        }));
                      }} style={{
                        background: "none", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.4)", borderRadius: 8,
                        padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit"
                      }}>
                        rename
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" placeholder="Add new hobby..."
                  value={hobbyInput}
                  onChange={e => setHobbyInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && hobbyInput.trim()) {
                      setState(prev => ({
                        ...prev,
                        hobbies: [...prev.hobbies, { id: `h${Date.now()}`, name: hobbyInput.trim(), xp: 0, sessions: 0 }]
                      }));
                      setHobbyInput("");
                    }
                  }}
                />
                <button onClick={() => {
                  if (!hobbyInput.trim()) return;
                  setState(prev => ({
                    ...prev,
                    hobbies: [...prev.hobbies, { id: `h${Date.now()}`, name: hobbyInput.trim(), xp: 0, sessions: 0 }]
                  }));
                  setHobbyInput("");
                }} style={{
                  background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)",
                  color: "#22d3ee", borderRadius: 10, padding: "10px 16px",
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"
                }}>
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: ANALYTICS ── */}
        {tab === "analytics" && (
          <div className="tab-content">
            <div style={{ marginBottom: 20, paddingTop: 8 }}>
              <div className="glow-text" style={{ fontSize: 28, fontWeight: 800 }}>Analytics</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                Your progress over time
              </div>
            </div>

            {/* Stats summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "TOTAL XP", value: state.totalXp.toLocaleString() },
                { label: "LEVEL", value: state.level },
                { label: "BEST STREAK", value: state.streak + "🔥" },
              ].map(item => (
                <div key={item.label} className="card" style={{ padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", marginBottom: 6 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#22d3ee" }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* XP History bars */}
            <div className="section-title">RECENT XP HISTORY</div>
            <div className="card" style={{ marginBottom: 16 }}>
              {state.history.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, padding: "20px 0" }}>
                  Complete habits to see history
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                  {state.history.slice(0, 14).reverse().map((entry, i) => {
                    const maxXp = Math.max(...state.history.slice(0, 14).map(e => e.xpGained), 1);
                    const h = Math.max(4, (entry.xpGained / maxXp) * 72);
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{
                          width: "100%", height: h,
                          background: "linear-gradient(180deg, #22d3ee, #0891b2)",
                          borderRadius: 4, opacity: 0.7 + (i / 14) * 0.3
                        }} />
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 8, textAlign: "center" }}>
                Last 14 days · daily XP earned
              </div>
            </div>

            {/* Screen time tracker */}
            <div className="section-title">SCREEN TIME LOG</div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input type="number" placeholder="Hours today..."
                  value={screenInput}
                  onChange={e => setScreenInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button onClick={() => {
                  const hrs = parseFloat(screenInput);
                  if (isNaN(hrs)) return;
                  setState(prev => ({
                    ...prev,
                    screenTime: [{ date: today(), hours: hrs }, ...prev.screenTime].slice(0, 30)
                  }));
                  setScreenInput("");
                  const xp = hrs < 2 ? 25 : hrs < 4 ? 10 : 0;
                  const penalty = hrs >= 6 ? 10 : hrs >= 4 ? 5 : 0;
                  if (xp > 0) { setState(prev => ({ ...prev, totalXp: prev.totalXp + xp })); showFloatingXp(xp, true); }
                  if (penalty > 0) { setState(prev => ({ ...prev, totalXp: Math.max(0, prev.totalXp - penalty) })); showFloatingXp(penalty, false); }
                }} style={{
                  background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)",
                  color: "#22d3ee", borderRadius: 10, padding: "10px 14px",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit"
                }}>
                  Log
                </button>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>
                &lt;2h → +25 XP · 2-4h → +10 XP · 4-6h → no bonus · 6h+ → penalty
              </div>
              {state.screenTime.slice(0, 7).map((entry, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)"
                }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{entry.date}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: entry.hours < 2 ? "#22d3ee" : entry.hours < 4 ? "#f59e0b" : "#ef4444"
                  }}>
                    {entry.hours}h
                  </span>
                </div>
              ))}
            </div>

            {/* Consistency score */}
            <div className="card">
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>CONSISTENCY SCORE</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#22d3ee" }}>
                {state.history.length === 0 ? "—" :
                  Math.round(state.history.slice(0, 7).reduce((sum, e) => sum + (e.xpGained > 0 ? 1 : 0), 0) / Math.min(7, state.history.length) * 100)}%
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                Last 7 days of activity
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: SETTINGS ── */}
        {tab === "settings" && (
          <div className="tab-content">
            <div style={{ marginBottom: 20, paddingTop: 8 }}>
              <div className="glow-text" style={{ fontSize: 28, fontWeight: 800 }}>Settings</div>
            </div>

            <div className="section-title">PROFILE</div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Avatar level={state.level} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Level {state.level} — {rank.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                    {state.totalXp.toLocaleString()} total XP earned
                  </div>
                  <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 2 }}>
                    {state.streak} day streak 🔥
                  </div>
                </div>
              </div>
            </div>

            <div className="section-title">RANKS</div>
            <div className="card" style={{ marginBottom: 16 }}>
              {RANKS.map(r => (
                <div key={r.name} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color }} />
                    <span style={{ fontSize: 13, color: state.level >= r.minLevel ? r.color : "rgba(255,255,255,0.3)" }}>
                      {r.name}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Level {r.minLevel}+</span>
                </div>
              ))}
            </div>

            <div className="section-title">DATA</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <button onClick={() => {
                const data = JSON.stringify(state, null, 2);
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "lifemaxxing_backup.json"; a.click();
              }} style={{
                padding: "14px 20px", background: "rgba(34,211,238,0.06)",
                border: "1px solid rgba(34,211,238,0.2)", borderRadius: 14,
                color: "#22d3ee", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                textAlign: "left", fontWeight: 500
              }}>
                ↓ Export Progress Data
              </button>
              <button onClick={() => {
                if (confirm("This will reset ALL progress. Are you sure?")) {
                  setState(defaultState());
                }
              }} style={{
                padding: "14px 20px", background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14,
                color: "#ef4444", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                textAlign: "left", fontWeight: 500
              }}>
                ⚠ Reset All Progress
              </button>
            </div>

            <div className="section-title">APP INFO</div>
            <div className="card">
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.8 }}>
                Life Maxxing v1.0<br />
                Your personal real-life RPG<br />
                All data stored locally · No cloud
              </div>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <nav style={styles.nav}>
          {TABS.map(t => (
            <button key={t.id} style={styles.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
