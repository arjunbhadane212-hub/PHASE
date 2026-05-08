import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Zap, Star, Crown, Shield, Flame, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';

const TIERS = [
  { key: 'bronze', name: 'Bronze', color: '#cd7f32', bg: 'linear-gradient(135deg, #3d2000 0%, #cd7f32 100%)', icon: Shield, min: 0 },
  { key: 'silver', name: 'Silver', color: '#c0c0c0', bg: 'linear-gradient(135deg, #2a2a30 0%, #c0c0c0 100%)', icon: Shield, min: 500 },
  { key: 'gold', name: 'Gold', color: '#ffd700', bg: 'linear-gradient(135deg, #3d3000 0%, #ffd700 100%)', icon: Trophy, min: 1000 },
  { key: 'platinum', name: 'Platinum', color: '#e5e4e2', bg: 'linear-gradient(135deg, #2a2a35 0%, #e5e4e2 100%)', icon: Trophy, min: 2000 },
  { key: 'diamond', name: 'Diamond', color: '#b9f2ff', bg: 'linear-gradient(135deg, #0a2a35 0%, #b9f2ff 100%)', icon: Crown, min: 3500 },
  { key: 'masters', name: 'Masters', color: '#a855f7', bg: 'linear-gradient(135deg, #1a0035 0%, #a855f7 100%)', icon: Crown, min: 5000 },
  { key: 'legends', name: 'Legends', color: '#ff4500', bg: 'linear-gradient(135deg, #3d0a00 0%, #ff4500 100%)', icon: Star, min: 8000 },
];

const MOCK_USERS = [
  { id: 1, name: 'ShadowBlade', trophies: 2450, avatar: '#7c3aed', wins: 142, club: 'Dark Legion' },
  { id: 2, name: 'PhoenixRise', trophies: 2180, avatar: '#ef4444', wins: 128, club: 'Fire Hawks' },
  { id: 3, name: 'StormKnight', trophies: 1950, avatar: '#3b82f6', wins: 115, club: 'Thunder Co' },
  { id: 4, name: 'CrystalMage', trophies: 1720, avatar: '#06b6d4', wins: 98, club: '' },
  { id: 5, name: 'IronWill', trophies: 1540, avatar: '#f59e0b', wins: 87, club: 'Steel Clan' },
  { id: 6, name: 'You', trophies: 1380, avatar: '#1B6AE4', wins: 72, club: '', isUser: true },
  { id: 7, name: 'NightHawk', trophies: 1200, avatar: '#64748b', wins: 64, club: '' },
  { id: 8, name: 'FireStorm', trophies: 980, avatar: '#dc2626', wins: 51, club: 'Blaze' },
  { id: 9, name: 'ArcticFox', trophies: 750, avatar: '#67e8f9', wins: 38, club: '' },
  { id: 10, name: 'DarkMatter', trophies: 520, avatar: '#4b0082', wins: 22, club: '' },
];

function getTier(trophies) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (trophies >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function useCountdown() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setDate(now.getDate() + (7 - now.getDay()) % 7 + 7);
      next.setHours(0, 0, 0, 0);
      const diff = next - now;
      setTime(`${Math.floor(diff / 86400000)}d ${Math.floor((diff % 86400000) / 3600000)}h`);
    };
    tick();
    const i = setInterval(tick, 60000);
    return () => clearInterval(i);
  }, []);
  return time;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [rankBanner, setRankBanner] = useState(null);
  const countdown = useCountdown();

  const currentUser = users.find(u => u.isUser);
  const userRank = users.findIndex(u => u.isUser) + 1;
  const userTier = getTier(currentUser?.trophies || 0);
  const TierIcon = userTier.icon;

  const handleEarnXP = () => {
    setUsers(prev => {
      const updated = prev.map(u => u.isUser ? { ...u, trophies: u.trophies + 200 } : u);
      const sorted = [...updated].sort((a, b) => b.trophies - a.trophies);
      const oldRank = prev.findIndex(u => u.isUser) + 1;
      const newRank = sorted.findIndex(u => u.isUser) + 1;
      if (newRank < oldRank) {
        const passed = prev[newRank - 1];
        setRankBanner({ name: passed.name, rank: newRank });
        setTimeout(() => setRankBanner(null), 3500);
      }
      return sorted;
    });
  };

  return (
    <div className="min-h-screen pb-32 md:pb-8" style={{ background: '#0d0b1a' }} data-testid="leaderboard-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: userTier.bg, opacity: 0.15 }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d0b1a]" />
        <div className="relative max-w-xl mx-auto px-4 pt-6 pb-8 text-center">
          {/* Tier Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl mb-4"
            style={{ background: `${userTier.color}15`, border: `2px solid ${userTier.color}40` }}
          >
            <TierIcon className="w-5 h-5" style={{ color: userTier.color }} />
            <span className="text-sm font-black tracking-wide" style={{ color: userTier.color }}>{userTier.name}</span>
          </motion.div>

          {/* Trophy count */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-7 h-7 text-[#ffd700]" />
              <span className="text-4xl font-black text-white" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                {currentUser?.trophies?.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-zinc-500">Your Trophies</p>
          </motion.div>

          {/* Timer + info */}
          <div className="flex items-center justify-center gap-4 mt-4 text-[11px]">
            <span className="flex items-center gap-1 text-zinc-500"><Clock className="w-3 h-3" /> Resets {countdown}</span>
            <span className="text-zinc-700">|</span>
            <span className="text-emerald-500/70">Top 3 promote</span>
            <span className="text-zinc-700">|</span>
            <span className="text-red-500/70">Bottom 3 demote</span>
          </div>
        </div>
      </div>

      {/* Rank-up banner */}
      <AnimatePresence>
        {rankBanner && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-xl mx-auto px-4 mb-3"
          >
            <div className="p-3 rounded-2xl flex items-center gap-3 text-sm"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))', border: '1px solid rgba(168,85,247,0.3)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.3)' }}>
                <ChevronUp className="w-5 h-5 text-purple-300" />
              </div>
              <span className="text-white font-medium">Passed <strong className="text-purple-300">{rankBanner.name}</strong> — now <strong className="text-[#ffd700]">#{rankBanner.rank}</strong>!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top 3 Podium */}
      <div className="max-w-xl mx-auto px-4 mb-4">
        <div className="flex items-end justify-center gap-3 mb-6">
          {[users[1], users[0], users[2]].map((u, idx) => {
            if (!u) return null;
            const pos = [2, 1, 3][idx];
            const heights = ['h-20', 'h-28', 'h-16'];
            const colors = ['#c0c0c0', '#ffd700', '#cd7f32'];
            const sizes = ['w-14 h-14', 'w-18 h-18', 'w-12 h-12'];
            const textSizes = ['text-lg', 'text-2xl', 'text-base'];
            return (
              <motion.div key={u.id} className="flex flex-col items-center"
                initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * idx }}>
                {/* Avatar */}
                <div className="relative mb-2">
                  {pos === 1 && <Crown className="w-6 h-6 text-[#ffd700] absolute -top-5 left-1/2 -translate-x-1/2" />}
                  <div className={`${sizes[idx]} rounded-2xl flex items-center justify-center text-white font-black text-sm`}
                    style={{
                      backgroundColor: u.avatar,
                      border: `3px solid ${colors[idx]}`,
                      boxShadow: `0 0 20px ${colors[idx]}30`,
                      width: pos === 1 ? '72px' : pos === 2 ? '56px' : '48px',
                      height: pos === 1 ? '72px' : pos === 2 ? '56px' : '48px',
                    }}>
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <p className="text-xs font-bold text-white truncate max-w-[80px]">{u.name}</p>
                <p className={`${textSizes[idx]} font-black`} style={{ color: colors[idx] }}>{u.trophies.toLocaleString()}</p>
                {/* Podium bar */}
                <div className={`${heights[idx]} w-20 rounded-t-xl mt-1`}
                  style={{ background: `linear-gradient(180deg, ${colors[idx]}30 0%, ${colors[idx]}08 100%)`, border: `1px solid ${colors[idx]}25`, borderBottom: 'none' }}>
                  <div className="text-center pt-2">
                    <span className="text-2xl font-black" style={{ color: colors[idx] }}>{pos}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Full Rankings List */}
      <div className="max-w-xl mx-auto px-4">
        <div className="space-y-1.5" data-testid="leaderboard-list">
          {users.slice(3).map((user, i) => {
            const rank = i + 4;
            const tier = getTier(user.trophies);
            const isPromoLine = rank === 4;

            return (
              <div key={user.id}>
                {isPromoLine && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)' }} />
                  </div>
                )}
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl relative"
                  style={{
                    background: user.isUser
                      ? 'linear-gradient(135deg, rgba(27,106,228,0.12), rgba(139,92,246,0.08))'
                      : 'rgba(255,255,255,0.03)',
                    border: user.isUser
                      ? '1.5px solid rgba(27,106,228,0.4)'
                      : '1px solid rgba(255,255,255,0.05)',
                  }}
                  data-testid={`leaderboard-row-${rank}`}
                >
                  {/* Rank */}
                  <span className="text-sm font-black w-7 text-center text-zinc-600">{rank}</span>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ backgroundColor: user.avatar, border: `2px solid ${tier.color}30` }}>
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      {user.isUser && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-lg" style={{ background: 'rgba(27,106,228,0.3)', color: '#4D8EF0' }}>YOU</span>
                      )}
                    </div>
                    {user.club && <p className="text-[10px] text-zinc-600">{user.club}</p>}
                  </div>

                  {/* Trophies */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Trophy className="w-4 h-4" style={{ color: tier.color }} />
                    <span className="text-sm font-black text-white">{user.trophies.toLocaleString()}</span>
                  </div>

                  {/* Rank-up badge */}
                  <AnimatePresence>
                    {user.isUser && rankBanner && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0 }}
                        className="absolute -top-2 -right-1 text-[9px] font-black px-2 py-0.5 rounded-xl shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white' }}
                      >
                        +1
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Earn XP */}
        <div className="mt-8 text-center pb-4">
          <Button onClick={handleEarnXP} data-testid="earn-xp-btn"
            className="px-8 py-3 text-sm font-black gap-2 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #ffd700, #f59e0b)', color: '#1a1000', border: 'none' }}>
            <Zap className="w-4 h-4" /> EARN TROPHIES
          </Button>
          <p className="text-[10px] text-zinc-700 mt-2">+200 trophies per tap</p>
        </div>
      </div>
    </div>
  );
}
