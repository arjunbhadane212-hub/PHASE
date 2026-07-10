import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, BarChart3, ShoppingBag, Gem, Zap, Flame, Search, Edit2, Trash2, ChevronDown, ChevronUp, RefreshCw, Lock, ArrowLeft, Trophy, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/admin/auth`, { secret });
      localStorage.setItem('admin_secret', secret);
      setAuthed(true);
    } catch {
      toast.error('Invalid admin secret');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('admin_secret');
    if (saved) {
      axios.post(`${API}/admin/auth`, { secret: saved })
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
          placeholder="Admin Secret"
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
  const headers = useMemo(() => ({ 'X-Admin-Secret': secret }), [secret]);

  const TABS = [
    { id: 'overview', icon: BarChart3, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'shop', icon: ShoppingBag, label: 'Shop' },
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
        {tab === 'overview' && <OverviewTab headers={headers} />}
        {tab === 'users' && <UsersTab headers={headers} />}
        {tab === 'shop' && <ShopTab headers={headers} />}
      </div>
    </div>
  );
}

function OverviewTab({ headers }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/admin/stats`, { headers })
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, [headers]);

  if (loading) return <Loader />;
  if (!stats) return <p className="text-zinc-500">Failed to load</p>;

  return (
    <div data-testid="admin-overview">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon={<Users className="w-5 h-5 text-[#4D8EF0]" />} value={stats.total_users} label="Total Users" />
        <StatCard icon={<Zap className="w-5 h-5 text-amber-400" />} value={stats.active_today} label="Active Today" />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-emerald-400" />} value={stats.total_habits} label="Total Habits" />
        <StatCard icon={<Flame className="w-5 h-5 text-orange-400" />} value={stats.total_completions} label="Completions" />
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

function UsersTab({ headers }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/users?q=${q}`, { headers });
      setUsers(data.users || []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleDelete = async (email) => {
    if (!window.confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/admin/users/${encodeURIComponent(email)}`, { headers });
      toast.success(`Deleted ${email}`);
      fetchUsers(search);
    } catch { toast.error('Delete failed'); }
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
            <UserRow key={u.email} user={u} onEdit={() => setEditUser(u)} onDelete={() => handleDelete(u.email)} />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          headers={headers}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); fetchUsers(search); }}
        />
      )}
    </div>
  );
}

function UserRow({ user, onEdit, onDelete }) {
  return (
    <div className="p-3 rounded-xl bg-[#0C1220] border border-[#1A2438] flex items-center gap-3" data-testid={`user-row-${user.email}`}>
      <div className="w-9 h-9 rounded-full bg-[#101828] flex items-center justify-center text-xs font-bold text-[#4D8EF0] flex-shrink-0">
        {user.first_name?.[0]}{user.last_name?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{user.first_name} {user.last_name}</p>
        <p className="text-[10px] text-zinc-500 truncate">{user.email} &middot; @{user.username}</p>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-[#4D8EF0]" /> Lv{user.current_level}</span>
        <span className="flex items-center gap-1"><Gem className="w-3 h-3 text-purple-400" /> {user.gems ?? 0}</span>
        <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {user.current_streak ?? 0}d</span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#101828]">{user.app_mode}</span>
      </div>
      <div className="flex gap-1.5">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-zinc-500 hover:text-[#4D8EF0] hover:bg-[#101828] transition-all" data-testid={`edit-${user.email}`}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all" data-testid={`delete-${user.email}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function EditUserModal({ user, headers, onClose, onSaved }) {
  const [form, setForm] = useState({
    gems: user.gems ?? 0,
    current_xp: user.current_xp ?? 0,
    current_level: user.current_level ?? 1,
    current_streak: user.current_streak ?? 0,
    longest_streak_ever: user.longest_streak_ever ?? 0,
    total_xp_all_time: user.total_xp_all_time ?? 0,
    streak_shields: user.streak_shields ?? 0,
    streak_revives: user.streak_revives ?? 0,
    app_mode: user.app_mode ?? 'focus',
  });
  const [grantItem, setGrantItem] = useState('');
  const [grantField, setGrantField] = useState('unlocked_decorations');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { ...form };
      // Convert numeric strings
      ['gems','current_xp','current_level','current_streak','longest_streak_ever','total_xp_all_time','streak_shields','streak_revives'].forEach(k => {
        body[k] = Number(body[k]);
      });
      await axios.put(`${API}/admin/users/${encodeURIComponent(user.email)}`, body, { headers });
      toast.success('User updated');
      onSaved();
    } catch (e) { toast.error(e.response?.data?.detail || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleGrant = async () => {
    if (!grantItem.trim()) return;
    setSaving(true);
    try {
      await axios.put(`${API}/admin/users/${encodeURIComponent(user.email)}`, { [grantField]: grantItem.trim() }, { headers });
      toast.success(`Granted ${grantItem} to ${grantField}`);
      setGrantItem('');
    } catch (e) { toast.error(e.response?.data?.detail || 'Grant failed'); }
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
            { key: 'current_xp', label: 'Current XP', icon: '⚡' },
            { key: 'current_level', label: 'Level', icon: '🏆' },
            { key: 'current_streak', label: 'Streak', icon: '🔥' },
            { key: 'longest_streak_ever', label: 'Best Streak', icon: '⭐' },
            { key: 'total_xp_all_time', label: 'Total XP', icon: '📊' },
            { key: 'streak_shields', label: 'Shields', icon: '🛡' },
            { key: 'streak_revives', label: 'Revives', icon: '❤' },
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

        {/* Mode */}
        <div className="mb-4">
          <label className="text-[10px] text-zinc-500 mb-1 block">Mode</label>
          <select
            value={form.app_mode}
            onChange={e => setForm(prev => ({ ...prev, app_mode: e.target.value }))}
            className="w-full h-8 rounded-lg bg-[#101828] border border-[#1A2438] text-white text-sm px-2"
          >
            <option value="focus">Focus</option>
            <option value="game">Game</option>
          </select>
        </div>

        {/* Grant Item */}
        <div className="border-t border-[#1A2438] pt-4 mb-4">
          <p className="text-xs text-zinc-400 mb-2 font-medium">Grant Item</p>
          <div className="flex gap-2 mb-2">
            <select
              value={grantField}
              onChange={e => setGrantField(e.target.value)}
              className="h-8 rounded-lg bg-[#101828] border border-[#1A2438] text-white text-xs px-2"
            >
              <option value="unlocked_decorations">Decorations</option>
              <option value="unlocked_animations">Animations</option>
              <option value="unlocked_icons">Icons</option>
              <option value="unlocked_banners">Banners</option>
              <option value="unlocked_main_colors">Main Colors</option>
              <option value="unlocked_banner_colors">Banner Colors</option>
              <option value="badges">Badges</option>
            </select>
            <Input
              placeholder="Item key (e.g. battle_dragon_samurai)"
              value={grantItem}
              onChange={e => setGrantItem(e.target.value)}
              className="bg-[#101828] border-[#1A2438] text-white text-xs h-8 flex-1"
            />
            <Button onClick={handleGrant} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8">Grant</Button>
          </div>
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

function ShopTab({ headers }) {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/shop`, { headers });
      setShop(data);
    } catch { toast.error('Failed to load shop'); }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  const handleRestock = async () => {
    if (!window.confirm('Force clear shop inventory? It will restock on next visit.')) return;
    try {
      await axios.post(`${API}/admin/shop/restock`, {}, { headers });
      toast.success('Shop cleared — will restock on next visit');
      fetchShop();
    } catch { toast.error('Restock failed'); }
  };

  if (loading) return <Loader />;

  return (
    <div data-testid="admin-shop">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-zinc-400">Shop Status</h2>
        <Button onClick={handleRestock} size="sm" className="bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Force Restock
        </Button>
      </div>

      {/* Config */}
      {shop?.config && (
        <div className="p-4 rounded-xl bg-[#0C1220] border border-[#1A2438] mb-4">
          <p className="text-xs text-zinc-500 mb-2">Restock Config</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-zinc-500">Last Restock:</span> <span className="text-white">{shop.config.last_restock_timestamp || 'N/A'}</span></div>
            <div><span className="text-zinc-500">Next Restock:</span> <span className="text-white">{shop.config.next_restock_timestamp || 'N/A'}</span></div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {(shop?.items || []).length === 0 && <p className="text-sm text-zinc-500 text-center py-4">No items in shop</p>}
        {(shop?.items || []).map((item, i) => (
          <div key={i} className="p-3 rounded-xl bg-[#0C1220] border border-[#1A2438] flex items-center justify-between">
            <div>
              <p className="text-sm text-white">{item.item_key}</p>
              <p className="text-[10px] text-zinc-500">{item.rarity} &middot; {item.gem_cost} gems</p>
            </div>
            <span className="text-[10px] text-zinc-600">{item.expires_at}</span>
          </div>
        ))}
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
