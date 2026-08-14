import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, BarChart3, Gem, Zap, Flame, Search, Edit2, Ban, ShieldCheck, ChevronDown, ChevronUp, Lock, ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// Admin dashboard talks directly to Supabase via a handful of password-gated
// RPCs (see supabase/migrations/20260814000000_admin_dashboard_supabase.sql)
// instead of the retired Mongo/FastAPI backend. The password is sent as the
// first argument on every call; Postgres checks it (with a 10-attempt
// lockout) before touching any data.

async function callAdmin(fn, secret, args = {}) {
  const { data, error } = await supabase.rpc(fn, { p_password: secret, ...args });
  if (error) throw error;
  return data;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await callAdmin('admin_authenticate', secret);
      localStorage.setItem('admin_secret', secret);
      setAuthed(true);
    } catch (err) {
      toast.error(err.message || 'Invalid admin password');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('admin_secret');
    if (saved) {
      callAdmin('admin_authenticate', saved)
        .then(() => { setSecret(saved); setAuthed(true); })
        .catch(() => localStorage.removeItem('admin_secret'));
    }
  }, []);

  if (!authed) return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-4">
      <form onSubmit={handleAuth} className="w-full max-w-sm p-6 rounded-2xl bg-[#0C1220] border border-[#1A2438]" data-testid="admin-login">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-[#4D8EF0]" />
          <h1 className="text-lg font-bold text-white font-['Satoshi']">Admin Dashboard</h1>
        </div>
        <Input
          type="password"
          placeholder="Admin Password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          className="mb-4 bg-[#101828] border-[#1A2438] text-white"
          data-testid="admin-secret-input"
        />
        <Button type="submit" disabled={loading} className="w-full bg-[#1B6AE4] hover:bg-[#1B6AE4]/90 text-white" data-testid="admin-login-btn">
          {loading ? 'Verifying...' : 'Access Dashboard'}
        </Button>
      </form>
    </div>
  );

  return <AdminDashboard secret={secret} />;
}

function AdminDashboard({ secret }) {
  const [tab, setTab] = useState('overview');

  const TABS = [
    { id: 'overview', icon: BarChart3, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users' },
  ];

  return (
    <div className="min-h-screen bg-[#06080F] text-white" data-testid="admin-dashboard">
      {/* Header */}
      <div className="border-b border-[#1A2438] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
          <h1 className="text-base sm:text-lg font-bold font-['Satoshi']">Admin Dashboard</h1>
        </div>
        <div className="flex gap-1">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                tab === id ? 'bg-[#1B6AE4]/15 text-[#4D8EF0]' : 'text-zinc-500 hover:text-zinc-300'
              }`} data-testid={`admin-tab-${id}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'overview' && <OverviewTab secret={secret} />}
        {tab === 'users' && <UsersTab secret={secret} />}
      </div>
    </div>
  );
}

function OverviewTab({ secret }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callAdmin('admin_stats', secret)
      .then(setStats)
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, [secret]);

  if (loading) return <Loader />;
  if (!stats) return <p className="text-zinc-500">Failed to load</p>;

  return (
    <div data-testid="admin-overview">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon={<Users className="w-5 h-5 text-[#4D8EF0]" />} value={stats.total_users} label="Total Users" />
        <StatCard icon={<Zap className="w-5 h-5 text-amber-400" />} value={stats.active_today} label="Active Today" />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-emerald-400" />} value={stats.total_habits} label="Total Habits" />
        <StatCard icon={<Ban className="w-5 h-5 text-red-400" />} value={stats.banned_users} label="Banned" />
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Leaderboard title="Top XP" data={stats.top_xp} valueKey="total_xp_all_time" icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} />
        <Leaderboard title="Top Streaks" data={stats.top_streaks} valueKey="longest_streak_ever" icon={<Flame className="w-3.5 h-3.5 text-orange-400" />} />
        <Leaderboard title="Top Gems" data={stats.top_gems} valueKey="gems" icon={<Gem className="w-3.5 h-3.5 text-purple-400" />} />
      </div>
    </div>
  );
}

function UsersTab({ secret }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await callAdmin('admin_list_users', secret, { p_query: q });
      setUsers(data || []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [secret]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(search);
  };

  // One-click "give somebody gems" — no need to open the full edit modal.
  const handleQuickGrant = async (user, amount) => {
    setBusyId(user.id);
    try {
      const result = await callAdmin('admin_grant_gems', secret, { p_user_id: user.id, p_amount: amount });
      toast.success(`${amount > 0 ? 'Granted' : 'Removed'} ${Math.abs(amount)} gems — ${user.username || user.email} now has ${result.gems}`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, gems: result.gems } : u));
    } catch (err) { toast.error(err.message || 'Grant failed'); }
    finally { setBusyId(null); }
  };

  // One-click ban / unban — "gone from the app" (blocks login via Supabase
  // Auth, not just an in-app flag).
  const handleToggleBan = async (user) => {
    const banning = !user.banned_at;
    if (!window.confirm(banning
      ? `Ban ${user.email}? They will be signed out and unable to log back in.`
      : `Unban ${user.email}? They will be able to log in again.`)) return;
    setBusyId(user.id);
    try {
      await callAdmin('admin_ban_user', secret, { p_user_id: user.id, p_banned: banning });
      toast.success(banning ? `Banned ${user.email}` : `Unbanned ${user.email}`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, banned_at: banning ? new Date().toISOString() : null } : u));
    } catch (err) { toast.error(err.message || 'Ban failed'); }
    finally { setBusyId(null); }
  };

  return (
    <div data-testid="admin-users">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by email, username, name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[#0C1220] border-[#1A2438] text-white text-sm"
            data-testid="admin-search"
          />
        </div>
        <Button type="submit" className="bg-[#1B6AE4] hover:bg-[#1B6AE4]/90 text-white text-sm">Search</Button>
      </form>

      {loading ? <Loader /> : (
        <div className="space-y-2">
          {users.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">No users found</p>}
          {users.map(u => (
            <UserRow
              key={u.id}
              user={u}
              busy={busyId === u.id}
              onEdit={() => setEditUser(u)}
              onQuickGrant={(amount) => handleQuickGrant(u, amount)}
              onToggleBan={() => handleToggleBan(u)}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          secret={secret}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); fetchUsers(search); }}
        />
      )}
    </div>
  );
}

function UserRow({ user, busy, onEdit, onQuickGrant, onToggleBan }) {
  const [grantAmount, setGrantAmount] = useState('50');
  const banned = !!user.banned_at;

  return (
    <div className={`p-3 rounded-xl bg-[#0C1220] border flex flex-wrap items-center gap-3 ${banned ? 'border-red-900/60' : 'border-[#1A2438]'}`} data-testid={`user-row-${user.email}`}>
      <div className="w-9 h-9 rounded-full bg-[#101828] flex items-center justify-center text-xs font-bold text-[#4D8EF0] flex-shrink-0">
        {user.first_name?.[0]}{user.last_name?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate flex items-center gap-2">
          {user.first_name} {user.last_name}
          {banned && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-500/15 text-red-400">BANNED</span>}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">{user.email} &middot; @{user.username}</p>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-[#4D8EF0]" /> Rank {user.rank}</span>
        <span className="flex items-center gap-1"><Gem className="w-3 h-3 text-purple-400" /> {user.gems ?? 0}</span>
        <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {user.current_streak ?? 0}d</span>
      </div>

      {/* Quick gem grant */}
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={grantAmount}
          onChange={e => setGrantAmount(e.target.value)}
          className="w-16 h-8 bg-[#101828] border-[#1A2438] text-white text-xs"
          data-testid={`grant-amount-${user.email}`}
        />
        <Button
          size="sm" disabled={busy}
          onClick={() => onQuickGrant(Number(grantAmount) || 0)}
          className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1"
          data-testid={`grant-gems-${user.email}`}
        >
          <Gem className="w-3 h-3" /> Give
        </Button>
      </div>

      <div className="flex gap-1.5">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-zinc-500 hover:text-[#4D8EF0] hover:bg-[#101828] transition-all" data-testid={`edit-${user.email}`}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleBan}
          disabled={busy}
          className={`p-1.5 rounded-lg transition-all ${banned ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'}`}
          data-testid={`ban-${user.email}`}
          title={banned ? 'Unban user' : 'Ban user'}
        >
          {banned ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

function EditUserModal({ user, secret, onClose, onSaved }) {
  const [form, setForm] = useState({
    gems: user.gems ?? 0,
    xp: user.xp ?? 0,
    current_xp: user.current_xp ?? 0,
    rank: user.rank ?? 1,
    current_streak: user.current_streak ?? 0,
    longest_streak_ever: user.longest_streak_ever ?? 0,
    total_habits_completed: user.total_habits_completed ?? 0,
    is_pro: !!user.is_pro,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields = { ...form };
      ['gems', 'xp', 'current_xp', 'rank', 'current_streak', 'longest_streak_ever', 'total_habits_completed'].forEach(k => {
        fields[k] = Number(fields[k]);
      });
      await callAdmin('admin_update_user', secret, { p_user_id: user.id, p_fields: fields });
      toast.success('User updated');
      onSaved();
    } catch (e) { toast.error(e.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0C1220] border border-[#1A2438] rounded-2xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="edit-user-modal">
        <h2 className="text-base font-bold text-white mb-1">{user.first_name} {user.last_name}</h2>
        <p className="text-xs text-zinc-500 mb-4">{user.email}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { key: 'gems', label: 'Gems', icon: '💎' },
            { key: 'xp', label: 'XP (level)', icon: '⚡' },
            { key: 'current_xp', label: 'Current XP', icon: '📈' },
            { key: 'rank', label: 'Rank (1-10)', icon: '🏆' },
            { key: 'current_streak', label: 'Streak', icon: '🔥' },
            { key: 'longest_streak_ever', label: 'Best Streak', icon: '⭐' },
            { key: 'total_habits_completed', label: 'Habits Completed', icon: '📊' },
          ].map(({ key, label, icon }) => (
            <div key={key}>
              <label className="text-[10px] text-zinc-500 mb-1 block">{icon} {label}</label>
              <Input
                type="number"
                value={form[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                className="bg-[#101828] border-[#1A2438] text-white text-sm h-8"
              />
            </div>
          ))}
        </div>

        {/* Pro toggle */}
        <div className="mb-4 flex items-center justify-between">
          <label className="text-xs text-zinc-400">Pro subscriber</label>
          <button
            onClick={() => setForm(prev => ({ ...prev, is_pro: !prev.is_pro }))}
            className={`w-10 h-6 rounded-full transition-all relative ${form.is_pro ? 'bg-[#1B6AE4]' : 'bg-[#1A2438]'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.is_pro ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#1B6AE4] hover:bg-[#1B6AE4]/90 text-white text-sm">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button onClick={onClose} variant="outline" className="border-[#1A2438] text-zinc-400 text-sm">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <div className="p-4 rounded-xl bg-[#0C1220] border border-[#1A2438] text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-xl sm:text-2xl font-bold text-white">{value?.toLocaleString?.() ?? value}</p>
      <p className="text-[10px] text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

function Leaderboard({ title, data, valueKey, icon }) {
  return (
    <div className="rounded-xl bg-[#0C1220] border border-[#1A2438] p-4">
      <h3 className="text-xs font-medium text-zinc-400 mb-3">{title}</h3>
      <div className="space-y-2">
        {data?.map((u, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 w-4">{i + 1}.</span>
              <span className="text-white truncate max-w-[120px]">{u.username || u.email}</span>
            </div>
            <span className="flex items-center gap-1 text-zinc-400">{icon} {(u[valueKey] ?? 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Loader() {
  return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#1B6AE4] border-t-transparent rounded-full animate-spin" /></div>;
}
