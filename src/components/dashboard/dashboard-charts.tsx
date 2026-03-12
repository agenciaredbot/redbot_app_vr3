"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── Theme colors ──────────────────────────────────────────
const COLORS = [
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#06B6D4", // cyan
  "#10B981", // green
  "#F59E0B", // orange
  "#EF4444", // red
  "#EC4899", // pink
  "#6366F1", // indigo
];

// ── Custom Tooltip ────────────────────────────────────────
function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-sm backdrop-blur-xl bg-bg-secondary/90 border border-border-glass shadow-lg">
      {label && <p className="text-text-muted text-xs mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-text-primary font-medium">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full mr-2"
            style={{ backgroundColor: entry.color || COLORS[i] }}
          />
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Donut / Pie Chart ─────────────────────────────────────
interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

export function GlassDonutChart({ data, height = 260 }: DonutChartProps) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return (
      <p className="text-text-muted text-sm text-center py-10">Sin datos</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
          stroke="none"
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<GlassTooltip />} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#94A3B8" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Bar Chart (vertical) ──────────────────────────────────
interface BarChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  color?: string;
}

export function GlassBarChart({
  data,
  height = 260,
  color = "#3B82F6",
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-text-muted text-sm text-center py-10">Sin datos</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<GlassTooltip />} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} name="Cantidad" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Horizontal Bar Chart (for pipeline) ───────────────────
interface HBarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
}

export function GlassHBarChart({ data, height = 280 }: HBarChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-text-muted text-sm text-center py-10">Sin datos</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip content={<GlassTooltip />} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Leads">
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color || COLORS[i % COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Progress Bar ──────────────────────────────────────────
interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

export function GlassProgressBar({ value, max, label }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isHigh = pct > 80;

  return (
    <div>
      {label && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text-secondary">{label}</span>
          <span className={isHigh ? "text-accent-orange font-semibold" : "text-text-primary font-semibold"}>
            {value} / {max}
          </span>
        </div>
      )}
      <div className="w-full h-3 rounded-full bg-bg-glass border border-border-glass overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: isHigh
              ? "linear-gradient(90deg, #F59E0B, #EF4444)"
              : "linear-gradient(90deg, #3B82F6, #8B5CF6)",
          }}
        />
      </div>
    </div>
  );
}

// ── Mini stat card ────────────────────────────────────────
interface MiniStatProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

export function MiniStat({ label, value, icon, color }: MiniStatProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-xl bg-white/[0.03] border border-border-glass">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke={color}
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div>
        <p className="text-xl font-bold text-text-primary">{value}</p>
        <p className="text-xs text-text-secondary">{label}</p>
      </div>
    </div>
  );
}
