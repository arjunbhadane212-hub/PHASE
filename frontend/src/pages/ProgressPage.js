import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, AreaChartIcon, Columns3, Gem, Zap, CheckSquare, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const CHART_TYPES = [
  { id: 'bar', icon: BarChart3, label: 'Bar' },
  { id: 'pie', icon: PieChartIcon, label: 'Pie' },
  { id: 'line', icon: TrendingUp, label: 'Trend' },
  { id: 'area', icon: AreaChartIcon || TrendingUp, label: 'Area' },
  { id: 'column', icon: Columns3 || BarChart3, label: 'Column' },
];

const COLORS = { gems: '#A78BFA', xp: '#FBBF24', tasks: '#1B6AE4' };

export default function ProgressPage() {
  const { isGameMode } = useMode();
  const [range, setRange] = useState('weekly');
  const [chartType, setChartType] = useState('bar');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = range === 'daily' ? 'daily' : range === 'monthly' ? 'monthly' : 'weekly';
      const { data: res } = await axios.get(`${API}/progress/${endpoint}`, { withCredentials: true });
      setData(res);
    } catch (e) {
      console.error('Failed to fetch progress', e);
    } finally {
      setLoading(false);
    }
  }, [range]);

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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-['Satoshi'] text-white mb-5">Progress</h1>

        {/* Time Range Toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#0C1220] border border-[#1A2438] w-fit mb-6" data-testid="range-toggle">
          {['daily', 'weekly', 'monthly'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                range === r
                  ? isGameMode ? 'bg-[#101828] text-[#4D8EF0]' : 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`} data-testid={`range-${r}`}>
              {r}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-zinc-500 animate-spin" /></div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6" data-testid="stat-cards">
              <StatCard icon={<Gem className="w-5 h-5" />} value={gemsEarned} label="Gems Earned" color={COLORS.gems} />
              <StatCard icon={<Zap className="w-5 h-5" />} value={xpEarned} label="XP Earned" color={COLORS.xp} />
              <StatCard icon={<CheckSquare className="w-5 h-5" />} value={tasksDone} label="Tasks Done" color={COLORS.tasks} />
            </div>

            {/* Chart Type Toolbar */}
            <div className="flex items-center gap-1 mb-4" data-testid="chart-toolbar">
              {CHART_TYPES.map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setChartType(id)} title={label}
                  className={`p-2 rounded-lg transition-all ${
                    chartType === id
                      ? isGameMode ? 'bg-[#101828] text-[#4D8EF0]' : 'bg-white/10 text-white'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`} data-testid={`chart-${id}`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="rounded-2xl border border-[#1A2438] bg-[#0C1220] p-4 sm:p-6" data-testid="progress-chart">
              <AnimatePresence mode="wait">
                <motion.div key={chartType}
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25, ease: 'easeInOut' }}>
                  <ChartRenderer type={chartType} data={chartData} range={range} />
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className="rounded-2xl border border-[#1A2438] bg-[#0C1220] p-4 sm:p-5 text-center" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
      <p className="text-2xl sm:text-3xl font-bold text-white font-['Satoshi']">{value}</p>
      <p className="text-xs sm:text-sm text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#0C1220', border: '1px solid #1A2438', borderRadius: '8px', color: '#fff', fontSize: '12px' },
};

function xAxisProps(range) {
  if (range === 'monthly') {
    return {
      dataKey: 'name', stroke: '#52525B', fontSize: 10, tickLine: false, axisLine: false,
      interval: 4,
    };
  }
  return { dataKey: 'name', stroke: '#52525B', fontSize: 11, tickLine: false, axisLine: false };
}

function yAxisProps() {
  return { stroke: '#52525B', fontSize: 11, tickLine: false, axisLine: false, allowDecimals: false };
}

function ChartRenderer({ type, data, range }) {
  const height = 260;
  const xProps = xAxisProps(range);
  const yProps = yAxisProps();

  if (type === 'pie') {
    const pieData = [
      { name: 'Gems', value: data.reduce((s, d) => s + d.gems, 0), fill: COLORS.gems },
      { name: 'XP', value: data.reduce((s, d) => s + d.xp, 0), fill: COLORS.xp },
      { name: 'Tasks', value: data.reduce((s, d) => s + d.tasks, 0), fill: COLORS.tasks },
    ].filter(d => d.value > 0);
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
            {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2438" />
          <XAxis {...xProps} />
          <YAxis {...yProps} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="xp" stroke={COLORS.xp} strokeWidth={2} dot={{ r: 3 }} name="XP" />
          <Line type="monotone" dataKey="gems" stroke={COLORS.gems} strokeWidth={2} dot={{ r: 3 }} name="Gems" />
          <Line type="monotone" dataKey="tasks" stroke={COLORS.tasks} strokeWidth={2} dot={{ r: 3 }} name="Tasks" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2438" />
          <XAxis {...xProps} />
          <YAxis {...yProps} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="xp" fill={COLORS.xp + '30'} stroke={COLORS.xp} strokeWidth={2} name="XP" />
          <Area type="monotone" dataKey="gems" fill={COLORS.gems + '30'} stroke={COLORS.gems} strokeWidth={2} name="Gems" />
          <Area type="monotone" dataKey="tasks" fill={COLORS.tasks + '30'} stroke={COLORS.tasks} strokeWidth={2} name="Tasks" />
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
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey="xp" fill={COLORS.xp} radius={[3, 3, 0, 0]} name="XP" />
          <Bar dataKey="gems" fill={COLORS.gems} radius={[3, 3, 0, 0]} name="Gems" />
          <Bar dataKey="tasks" fill={COLORS.tasks} radius={[3, 3, 0, 0]} name="Tasks" />
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
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="xp" fill={COLORS.xp} radius={[3, 3, 0, 0]} name="XP" />
        <Bar dataKey="gems" fill={COLORS.gems} radius={[3, 3, 0, 0]} name="Gems" />
        <Bar dataKey="tasks" fill={COLORS.tasks} radius={[3, 3, 0, 0]} name="Tasks" />
      </BarChart>
    </ResponsiveContainer>
  );
}
