import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, AreaChartIcon, Columns3, Gem, Zap, CheckSquare, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { themedChartColors } from '../lib/chartColors';

const CHART_TYPES = [
  { id: 'bar', icon: BarChart3, label: 'Bar' },
  { id: 'pie', icon: PieChartIcon, label: 'Pie' },
  { id: 'line', icon: TrendingUp, label: 'Trend' },
  { id: 'area', icon: AreaChartIcon || TrendingUp, label: 'Area' },
  { id: 'column', icon: Columns3 || BarChart3, label: 'Column' },
];

export default function ProgressPage() {
  const { user } = useAuth();
  const [range, setRange] = useState('weekly');
  const [chartType, setChartType] = useState('bar');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      if (range === 'daily') {
        const today = new Date().toISOString().slice(0, 10);
        const [{ data: log }, { data: comps }] = await Promise.all([
          supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle(),
          supabase.from('habit_completions').select('habits(time_of_day)').eq('user_id', user.id).eq('completed_date', today),
        ]);
        const slot = { morning: 0, afternoon: 0, night: 0 };
        (comps || []).forEach(c => {
          const t = c.habits?.time_of_day;
          if (t && slot[t] !== undefined) slot[t] += 1;
        });
        setData({
          xp_earned_today: log?.xp_earned_today ?? 0,
          gems_earned_today: log?.gems_earned_today ?? 0,
          completed_habits: Array.isArray(log?.habits_completed) ? log.habits_completed.length : (comps?.length ?? 0),
          morning: { completed: slot.morning },
          afternoon: { completed: slot.afternoon },
          night: { completed: slot.night },
        });
      } else if (range === 'weekly') {
        // Last 7 days, one bar per day (oldest -> newest, left -> right)
        const days = 7;
        const start = new Date();
        start.setUTCDate(start.getUTCDate() - (days - 1));
        const startStr = start.toISOString().slice(0, 10);
        const todayStr = new Date().toISOString().slice(0, 10);

        const { data: logs, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', startStr)
          .lte('log_date', todayStr);
        if (error) throw error;

        const byDate = {};
        (logs || []).forEach(l => { byDate[l.log_date] = l; });

        const daily_data = [];
        let total_xp = 0, total_gems = 0, total_tasks = 0;
        for (let i = 0; i < days; i++) {
          const d = new Date(start);
          d.setUTCDate(start.getUTCDate() + i);
          const ds = d.toISOString().slice(0, 10);
          const l = byDate[ds];
          const xp = l?.xp_earned_today ?? 0;
          const gems = l?.gems_earned_today ?? 0;
          const completed = Array.isArray(l?.habits_completed) ? l.habits_completed.length : 0;
          total_xp += xp; total_gems += gems; total_tasks += completed;
          const name = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
          daily_data.push({ day: name, xp, gems, completed });
        }
        setData({ total_xp, total_gems, total_tasks, daily_data });
      } else {
        // Monthly: last 6 calendar months, one bar per month
        const MONTHS = 6;
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1));
        const startStr = start.toISOString().slice(0, 10);
        const todayStr = now.toISOString().slice(0, 10);

        const { data: logs, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', startStr)
          .lte('log_date', todayStr);
        if (error) throw error;

        // Aggregate each day's log into its calendar month (YYYY-MM)
        const byMonth = {};
        (logs || []).forEach(l => {
          const key = String(l.log_date).slice(0, 7);
          if (!byMonth[key]) byMonth[key] = { xp: 0, gems: 0, tasks: 0 };
          byMonth[key].xp += l.xp_earned_today ?? 0;
          byMonth[key].gems += l.gems_earned_today ?? 0;
          byMonth[key].tasks += Array.isArray(l.habits_completed) ? l.habits_completed.length : 0;
        });

        const daily_data = [];
        let total_xp = 0, total_gems = 0, total_tasks = 0;
        for (let i = 0; i < MONTHS; i++) {
          const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
          const key = d.toISOString().slice(0, 7);
          const b = byMonth[key] || { xp: 0, gems: 0, tasks: 0 };
          total_xp += b.xp; total_gems += b.gems; total_tasks += b.tasks;
          const name = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
          daily_data.push({ day: name, xp: b.xp, gems: b.gems, completed: b.tasks });
        }
        setData({ total_xp, total_gems, total_tasks, daily_data });
      }
    } catch (e) {
      console.error('Failed to fetch progress', e);
    } finally {
      setLoading(false);
    }
  }, [range, user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const gemsEarned = range === 'daily' ? (data?.gems_earned_today ?? 0) : (data?.total_gems ?? 0);
  const xpEarned = range === 'daily' ? (data?.xp_earned_today ?? 0) : (data?.total_xp ?? 0);
  const tasksDone = range === 'daily' ? (data?.completed_habits ?? 0) : (data?.total_tasks ?? 0);

  const chartData = range === 'daily'
    ? [
        { name: 'Morning', xp: (data?.morning?.completed ?? 0) * 25, gems: (data?.morning?.completed ?? 0) * 10, tasks: data?.morning?.completed ?? 0 },
        { name: 'Afternoon', xp: (data?.afternoon?.completed ?? 0) * 25, gems: (data?.afternoon?.completed ?? 0) * 10, tasks: data?.afternoon?.completed ?? 0 },
        { name: 'Night', xp: (data?.night?.completed ?? 0) * 25, gems: (data?.night?.completed ?? 0) * 10, tasks: data?.night?.completed ?? 0 },
      ]
    : (data?.daily_data ?? []).map(d => ({
        name: d.day,
        xp: d.xp,
        gems: d.gems ?? 0,
        tasks: d.completed,
      }));

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-24 md:pb-8" data-testid="progress-page">
      <div className="max-w-4xl mx-auto animate-slide-up">
        <h1 className="text-xl sm:text-2xl font-['Archivo'] font-extrabold text-[color:var(--gm-ink)] tracking-[-0.01em] mb-5">Progress</h1>

        {/* Time Range Toggle */}
        <div className="inline-flex items-center gap-2 mb-6" data-testid="range-toggle">
          {['daily', 'weekly', 'monthly'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-full font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                range === r
                  ? 'text-[color:var(--gm-ink)] ring-1 ring-[#A59BCC]'
                  : 'text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]'
              }`} data-testid={`range-${r}`}>
              {r}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[color:var(--gm-muted)] animate-spin" /></div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6" data-testid="stat-cards">
              <StatCard icon={<Gem className="w-5 h-5" />} value={gemsEarned} label="Gems Earned" />
              <StatCard icon={<Zap className="w-5 h-5" />} value={xpEarned} label="XP Earned" />
              <StatCard icon={<CheckSquare className="w-5 h-5" />} value={tasksDone} label="Tasks Done" />
            </div>

            {/* Chart Type Toolbar */}
            <div className="flex items-center gap-1 mb-4" data-testid="chart-toolbar">
              {CHART_TYPES.map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setChartType(id)} title={label}
                  className={`p-2 rounded-lg transition-colors ${
                    chartType === id
                      ? 'bg-[color:var(--gm-card)] text-[color:var(--gm-ink)] ring-1 ring-[#A59BCC]'
                      : 'text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)]'
                  }`} data-testid={`chart-${id}`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="rounded-2xl bg-[color:var(--gm-card)] p-4 sm:p-6" data-testid="progress-chart">
              <AnimatePresence mode="wait">
                <motion.div key={chartType}
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25, ease: 'easeInOut' }}>
                  <ChartRenderer type={chartType} data={chartData} />
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="rounded-2xl bg-[color:var(--gm-card)] p-4 sm:p-5 text-center" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex justify-center mb-2 text-[color:var(--gm-ink)]">{icon}</div>
      <p className="text-3xl sm:text-4xl font-['Archivo'] font-black text-[color:var(--gm-ink)] leading-none tracking-[-0.02em] tabular-nums">{value}</p>
      <p className="mt-2 font-['JetBrains_Mono'] text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)]">{label}</p>
    </div>
  );
}

function xAxisProps(c) {
  // Every category has few enough ticks (3 daily / 7 weekly / 6 monthly) to show all labels
  return {
    dataKey: 'name',
    stroke: c.muted,
    tick: { fill: c.muted, fontSize: 11, fontFamily: 'JetBrains Mono' },
    tickLine: false,
    axisLine: false,
    interval: 0,
  };
}

function yAxisProps(c) {
  return {
    stroke: c.muted,
    tick: { fill: c.muted, fontSize: 11, fontFamily: 'JetBrains Mono' },
    tickLine: false,
    axisLine: false,
    allowDecimals: false,
  };
}

function tooltipProps(c) {
  return {
    contentStyle: { background: c.card, border: 'none', borderRadius: 12, color: c.ink, boxShadow: 'none' },
    labelStyle: { color: c.muted, fontFamily: 'JetBrains Mono', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' },
    itemStyle: { color: c.ink },
    cursor: { fill: c.track, opacity: 0.4 },
  };
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ height: 260 }} data-testid="chart-empty">
      <p className="text-sm text-[color:var(--gm-muted)]">No activity in this period yet</p>
      <p className="text-xs text-[color:var(--gm-muted)] opacity-70 mt-1">Complete habits to see your progress here.</p>
    </div>
  );
}

function ChartRenderer({ type, data }) {
  const height = 260;
  const c = themedChartColors();
  const xProps = xAxisProps(c);
  const yProps = yAxisProps(c);
  const tProps = tooltipProps(c);

  const hasData = Array.isArray(data) && data.some(d => (d.xp || 0) + (d.gems || 0) + (d.tasks || 0) > 0);
  if (!hasData) return <EmptyChart />;

  if (type === 'pie') {
    const pieData = [
      { name: 'Gems', value: data.reduce((s, d) => s + d.gems, 0) },
      { name: 'XP', value: data.reduce((s, d) => s + d.xp, 0) },
      { name: 'Tasks', value: data.reduce((s, d) => s + d.tasks, 0) },
    ].filter(d => d.value > 0);
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
            {pieData.map((e, i) => <Cell key={i} fill={c.series[i % c.series.length]} />)}
          </Pie>
          <Tooltip {...tProps} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.track} />
          <XAxis {...xProps} />
          <YAxis {...yProps} />
          <Tooltip {...tProps} />
          <Line type="monotone" dataKey="xp" stroke={c.series[0]} strokeWidth={2} dot={{ fill: c.series[0], r: 3 }} activeDot={{ r: 5 }} name="XP" />
          <Line type="monotone" dataKey="gems" stroke={c.series[1]} strokeWidth={2} dot={{ fill: c.series[1], r: 3 }} activeDot={{ r: 5 }} name="Gems" />
          <Line type="monotone" dataKey="tasks" stroke={c.series[2]} strokeWidth={2} dot={{ fill: c.series[2], r: 3 }} activeDot={{ r: 5 }} name="Tasks" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="areaXp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.series[0]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={c.series[0]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="areaGems" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.series[1]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={c.series[1]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="areaTasks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.series[2]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={c.series[2]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={c.track} />
          <XAxis {...xProps} />
          <YAxis {...yProps} />
          <Tooltip {...tProps} />
          <Area type="monotone" dataKey="xp" fill="url(#areaXp)" stroke={c.series[0]} strokeWidth={2} name="XP" />
          <Area type="monotone" dataKey="gems" fill="url(#areaGems)" stroke={c.series[1]} strokeWidth={2} name="Gems" />
          <Area type="monotone" dataKey="tasks" fill="url(#areaTasks)" stroke={c.series[2]} strokeWidth={2} name="Tasks" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'column') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis {...xProps} />
          <YAxis {...yProps} />
          <Tooltip {...tProps} />
          <Bar dataKey="xp" fill={c.series[0]} radius={[8, 8, 0, 0]} name="XP" />
          <Bar dataKey="gems" fill={c.series[1]} radius={[8, 8, 0, 0]} name="Gems" />
          <Bar dataKey="tasks" fill={c.series[2]} radius={[8, 8, 0, 0]} name="Tasks" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis {...xProps} />
        <YAxis {...yProps} />
        <Tooltip {...tProps} />
        <Bar dataKey="xp" fill={c.series[0]} radius={[8, 8, 0, 0]} name="XP" />
        <Bar dataKey="gems" fill={c.series[1]} radius={[8, 8, 0, 0]} name="Gems" />
        <Bar dataKey="tasks" fill={c.series[2]} radius={[8, 8, 0, 0]} name="Tasks" />
      </BarChart>
    </ResponsiveContainer>
  );
}
