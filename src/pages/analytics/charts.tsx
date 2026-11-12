import type { ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui';

/**
 * Sage & Paper chart palette, validated with the dataviz palette validator (light on #ffffff, dark on #1f1e1a):
 * categorical slots pass lightness, chroma, contrast and colour-blind separation (slot 3↔4 is in the 6–8 band, so
 * charts using all four slots label every bar). Ramps are single-hue and monotone. Text always uses neutral ink.
 */
export function usePalette(dark: boolean) {
  return dark
    ? { blue: '#4f8fdc', orange: '#d96a35', aqua: '#2fa874', yellow: '#c08a12', surface: '#1f1e1a', grid: '#47443a', ink: '#cdc9b9', inkStrong: '#f7f6f1',
        ramp: ['#a3c3f0', '#6b9be0', '#3f78c4', '#2b5a94'] }
    : { blue: '#2f6db5', orange: '#c85a2a', aqua: '#1f8a5f', yellow: '#a87a00', surface: '#ffffff', grid: '#e2dfd3', ink: '#5c584a', inkStrong: '#1f1e1a',
        ramp: ['#1e4f86', '#2f6db5', '#5b8fd0', '#86acde'] };
}
export type Palette = ReturnType<typeof usePalette>;

export interface Datum { name: string; value: number }

export function ChartCard({ title, description, summary, table, children }: {
  title: string; description: string; summary: string; table: ReactNode; children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody>
        <p className="mb-3 text-sm text-ink-700 dark:text-ink-300">{summary}</p>
        <div className="h-64 w-full" aria-hidden="true">{children}</div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-brand-800 dark:text-brand-300">View as table</summary>
          <div className="mt-2 overflow-x-auto">{table}</div>
        </details>
      </CardBody>
    </Card>
  );
}

export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>{head.map((h) => <th key={h} scope="col" className="py-1 pr-4 text-xs font-semibold uppercase text-ink-600 dark:text-ink-400">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} className="py-1 pr-4 text-ink-800 dark:text-ink-200">{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

const tooltipStyle = (p: Palette) => ({
  background: p.surface, border: `1px solid ${p.grid}`, borderRadius: 12, color: p.inkStrong, fontSize: 12,
});

/** Grouped (or stacked) vertical/horizontal bars for one or more series. */
export function SeriesBars({ data, series, p, horizontal, stacked, legend }: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color: string }[];
  p: Palette; horizontal?: boolean; stacked?: boolean; legend?: boolean;
}) {
  const tick = { fill: p.ink, fontSize: 12 };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" allowDecimals={false} tick={tick} stroke={p.grid} />
            <YAxis type="category" dataKey="name" width={110} tick={tick} stroke={p.grid} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={tick} stroke={p.grid} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={tick} stroke={p.grid} width={28} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle(p)} cursor={{ fill: p.grid, opacity: 0.3 }} />
        {legend && <Legend wrapperStyle={{ color: p.ink, fontSize: 12 }} />}
        {series.map((s) => (
          <Bar
            key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={stacked ? 'a' : undefined}
            stroke={p.surface} strokeWidth={2} radius={4} maxBarSize={28} isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** One series where each bar has its own color (categories or ordinal ramp). */
export function ColoredBars({ data, colors, p, label }: { data: Datum[]; colors: string[]; p: Palette; label: string }) {
  const tick = { fill: p.ink, fontSize: 12 };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={tick} stroke={p.grid} />
        <YAxis type="category" dataKey="name" width={110} tick={tick} stroke={p.grid} />
        <Tooltip contentStyle={tooltipStyle(p)} cursor={{ fill: p.grid, opacity: 0.3 }} />
        <Bar dataKey="value" name={label} radius={4} maxBarSize={28} isAnimationActive={false} label={{ position: 'right', fill: p.ink, fontSize: 12 }}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
