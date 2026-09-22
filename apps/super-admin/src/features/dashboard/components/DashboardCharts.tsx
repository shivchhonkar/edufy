'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from 'recharts';

import {
  DASHBOARD_CHART_THEME,
  FEE_COLLECTION_COLORS,
} from './dashboard-chart-theme';

function EmptyChart({ message = 'No data available yet' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-sm text-gray-500">
      {message}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={entry.name ?? i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {valueFormatter ? valueFormatter(Number(entry.value) || 0) : entry.value}
        </p>
      ))}
    </div>
  );
}

export function AttendanceTrendChart({
  data,
}: {
  data: Array<{ label: string; rate: number; present: number; total: number }>;
}) {
  if (data.length === 0) return <EmptyChart />;

  const chartData = data.map((row) => ({
    ...row,
    presentPct: row.rate,
    absentPct: row.total > 0 ? Math.round(((row.total - row.present) / row.total) * 100) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={(props) => <ChartTooltip {...props} valueFormatter={(v) => `${v}%`} />} />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="plainline"
          height={28}
          formatter={(value) => <span className="text-xs text-slate-500">{value}</span>}
        />
        <Line
          type="monotone"
          dataKey="presentPct"
          name="Present"
          stroke={DASHBOARD_CHART_THEME.primary}
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: DASHBOARD_CHART_THEME.primary, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="absentPct"
          name="Absent"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function FeeCollectionBarChart({
  data,
  formatValue,
}: {
  data: Array<{
    label: string;
    amount?: number;
    expected?: number;
    received?: number;
    due?: number;
  }>;
  formatValue: (n: number) => string;
}) {
  const chartData = data.map((row) => ({
    label: row.label,
    expected: row.expected ?? 0,
    received: row.received ?? row.amount ?? 0,
    due: row.due ?? 0,
  }));

  const hasValues = chartData.some(
    (row) => row.expected > 0 || row.received > 0 || row.due > 0,
  );
  if (!hasValues) return <EmptyChart message="No fee data for this session yet" />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        margin={{ top: 12, right: 8, left: -4, bottom: 0 }}
        barCategoryGap="18%"
        barGap={2}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatValue(v)}
          width={56}
        />
        <Tooltip content={(props) => <ChartTooltip {...props} valueFormatter={formatValue} />} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="square"
          iconSize={10}
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
        />
        <Bar
          dataKey="expected"
          name="Expected"
          fill={FEE_COLLECTION_COLORS.expected}
          radius={[3, 3, 0, 0]}
          maxBarSize={14}
        />
        <Bar
          dataKey="received"
          name="Received"
          fill={FEE_COLLECTION_COLORS.received}
          radius={[3, 3, 0, 0]}
          maxBarSize={14}
        />
        <Bar
          dataKey="due"
          name="Due"
          fill={FEE_COLLECTION_COLORS.due}
          radius={[3, 3, 0, 0]}
          maxBarSize={14}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompositionDonutChart({
  data,
  formatValue,
  centerLabel,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  formatValue?: (n: number) => string;
  centerLabel?: string;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <EmptyChart />;

  const total = filtered.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {filtered.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...props}
                valueFormatter={(v) => {
                  const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                  const formatted = formatValue ? formatValue(v) : String(v);
                  return `${formatted} (${pct}%)`;
                }}
              />
            )}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
          <p className="text-xs font-semibold text-gray-700 text-center px-4 whitespace-pre-line">{centerLabel}</p>
        </div>
      )}
    </div>
  );
}

export function TeacherComparisonBarChart({
  data,
}: {
  data: Array<{ teacher_name: string; score: number }>;
}) {
  if (data.length === 0) return <EmptyChart message="No teacher performance data yet" />;

  const chartData = data.map((t) => ({
    name: t.teacher_name.split(' ')[0],
    fullName: t.teacher_name,
    score: t.score,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={72}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as { fullName: string; score: number };
            return (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                <p className="font-medium text-gray-800">{row.fullName}</p>
                <p className="text-primary-600 font-semibold">Score: {row.score}</p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="score"
          name="Score"
          fill={DASHBOARD_CHART_THEME.primaryMid}
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
  emptyMessage = 'No data available yet',
}: {
  data: Array<{ name: string; value: number; color: string }>;
  emptyMessage?: string;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <EmptyChart message={emptyMessage} />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={filtered} margin={{ top: 18, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={(props) => <ChartTooltip {...props} />} />
        <Bar dataKey="value" name="Students" radius={[6, 6, 0, 0]} maxBarSize={28} fill={DASHBOARD_CHART_THEME.primary}>
          {filtered.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
          <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalMetricBars({
  data,
  emptyMessage = 'No data available yet',
}: {
  data: Array<{ name: string; value: number }>;
  emptyMessage?: string;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <EmptyChart message={emptyMessage} />;

  const max = Math.max(...filtered.map((d) => d.value), 1);

  return (
    <div className="flex flex-col justify-center gap-3 py-1">
      {filtered.map((row) => (
        <div key={row.name} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-slate-600">{row.name}</span>
          <div className="h-2.5 min-w-0 flex-1 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
