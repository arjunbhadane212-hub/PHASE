import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { useGame } from '../contexts/GameContext';
import { rankInfo, levelForXp } from '../data/levels';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Plus, Check, Sunrise, Sun, Moon, Flame, Sparkles, Loader2, Gem, Heart, Shield, Zap, X, Award, Play, Clock } from 'lucide-react';
import StreakCard from '../components/StreakCard';
import XpPopAnimation from '../components/XpPopAnimation';
import FocusSession from '../components/FocusSession';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { showTitleUnlocks } from '../components/profile/TitleUnlockToast';
import { soundEngine } from '../utils/SoundEngine';

// Client's LOCAL calendar day (YYYY-MM-DD). The complete/uncomplete RPCs key
// completions on this instead of the server's UTC day, so a habit finished near
// local midnight lands on the right day. Server clamps it to +/-1 day of UTC.
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// PLACEHOLDER — quest/challenge cards are UI-only mockup data.
// Real quest data model, backend logic, and friend-comparison wiring
// do not exist yet and are NOT part of this task. See project notes
// for "quest system" as a future spec.
const PLACEHOLDER_quests = [
  { id: 'q1', state: 'complete', icon: 'check', title: '7-day sprint', sub: 'Complete' },
  { id: 'q2', state: 'progress', icon: 'clock', title: 'No-skip week', sub: '3 of 7 days' },
  { id: 'q3', state: 'locked', icon: 'zap', title: 'Beat Rival', sub: '+120 XP to win' },
];

export default function HomePage() {
  const { user, refreshUser } = useAuth();
  const { isGameMode } = useMode();
  const { activeBoostMultiplier, currentRoast, showRoast, dismissRoast, fetchGameStatus } = useGame();

  // Streak Shield / Revive counts live on the Supabase users row (the working
  // data path), not the legacy game-status backend.
  const streakShields = user?.streak_shields ?? 0;
  const streakRevives = user?.streak_revives ?? 0;
  const [shieldBusy, setShieldBusy] = useState(false);
  const [reviveBusy, setReviveBusy] = useState(false);

  const boostMultiplier = activeBoostMultiplier > 1 ? activeBoostMultiplier : 0;
  
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [completingHabit, setCompletingHabit] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);
  const [xpEvents, setXpEvents] = useState([]);
  const xpIdRef = useRef(0);
  const [focusSession, setFocusSession] = useState(null); // { habit, duration }
  const [weeklyXpEarned, setWeeklyXpEarned] = useState(0);

  const fetchHabits = useCallback(async () => {
    if (!user?.id) return;
    try {
      const now = new Date();
      const todayStr = localDateStr(now);
      const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      const [{ data: allHabits, error: hErr }, { data: comps, error: cErr }] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase
          .from('habit_completions')
          .select('habit_id, status')
          .eq('user_id', user.id)
          .eq('completed_date', todayStr),
      ]);
      if (hErr) throw hErr;
      if (cErr) throw cErr;

      // A 'failed' row (abandoned / tab-switched session) locks the habit for
      // the day but is NOT a success — track it separately from real completions.
      const completedSet = new Set((comps || []).filter(c => c.status !== 'failed').map(c => c.habit_id));
      const failedSet = new Set((comps || []).filter(c => c.status === 'failed').map(c => c.habit_id));
      const scheduledToday = (allHabits || [])
        .filter(h => {
          const s = h.repeat_schedule || 'daily';
          if (s === 'daily') return true;
          if (s === 'weekdays') return !['saturday', 'sunday'].includes(weekday);
          if (s === 'weekends') return ['saturday', 'sunday'].includes(weekday);
          const custom = Array.isArray(h.custom_days) ? h.custom_days.map(d => String(d).toLowerCase()) : [];
          return custom.includes(weekday);
        })
        // alias id -> habit_id so existing HabitCard markup keeps working
        .map(h => ({ ...h, habit_id: h.id, completed_today: completedSet.has(h.id), failed_today: failedSet.has(h.id) }));

      setHabits(scheduledToday);
    } catch (e) {
      console.error('Failed to fetch habits', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // Weekly XP earned for the home header's "This Week" ring. Same weekly window
  // as StreakCard's pip bar: CALENDAR WEEK, Monday-start. daily_logs.xp_earned_today
  // is the authoritative per-day XP (complete_habit writes it, uncomplete_habit
  // decrements it), so summing it is accurate. Read-only SELECT — no writes,
  // no schema/RPC changes. Re-runs on current_xp change so it stays fresh after
  // a completion (refreshUser updates current_xp).
  const fetchWeeklyXp = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date();
    const diffToMonday = (now.getDay() + 6) % 7; // 0=Sun..6=Sat -> days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const { data, error } = await supabase
      .from('daily_logs')
      .select('xp_earned_today')
      .eq('user_id', user.id)
      .gte('log_date', localDateStr(monday));
    if (error) {
      console.error('Failed to load weekly XP', error);
      return;
    }
    setWeeklyXpEarned((data || []).reduce((s, r) => s + (r.xp_earned_today || 0), 0));
    // current_xp is not read in the body; it's an intentional dependency so the
    // ring refetches after a completion (refreshUser bumps current_xp). The
    // exhaustive-deps rule flags it as "unnecessary", which fails the CI build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.current_xp]);

  useEffect(() => {
    fetchWeeklyXp();
  }, [fetchWeeklyXp]);

  const handleCompleteHabit = async (habitId) => {
    setCompletingHabit(habitId);
    try {
      const { data, error } = await supabase.rpc('complete_habit', { p_habit_id: habitId, p_client_date: localDateStr() });
      if (error) throw error;

      // Mark done locally
      setHabits(prev => prev.map(h =>
        h.habit_id === habitId ? { ...h, completed_today: true } : h
      ));

      // Pull fresh XP / gems / streak into the user object (XP bar, streak card)
      await refreshUser();

      // Title unlocks fire in BOTH modes. Streaks accumulate in Focus Mode too,
      // so a title can genuinely be earned there — and a title is profile
      // identity, not XP or a leaderboard, so surfacing it does not break the
      // Focus Mode gamification ban. Swallowing it would mean the player only
      // discovers the title later in the equip list, which is the exact failure
      // this replaces.
      showTitleUnlocks(data?.newly_unlocked);

      if (isGameMode) {
        soundEngine.habitComplete();
        xpIdRef.current += 1;
        setXpEvents(prev => [...prev, { id: xpIdRef.current, amount: data.xp_earned, boost: false }]);
        if (data.level_up) {
          setLevelUpData({ level: data.rank, level_name: data.rank_name, level_up_gems: data.level_up_gems });
        }
      } else if (data.gems_earned > 0) {
        toast.success(`+${data.gems_earned} gems`, { icon: '💎', duration: 2000 });
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to complete habit');
    } finally {
      setCompletingHabit(null);
    }
  };

  const handleUncompleteHabit = async (habitId) => {
    try {
      const { error } = await supabase.rpc('uncomplete_habit', { p_habit_id: habitId, p_client_date: localDateStr() });
      if (error) throw error;
      setHabits(prev => prev.map(h =>
        h.habit_id === habitId ? { ...h, completed_today: false } : h
      ));
      // Pull reverted XP / gems / streak back into the user object
      await refreshUser();
      await fetchGameStatus();
      toast.info('Habit unchecked');
    } catch (e) {
      toast.error(e?.message || 'Failed to uncomplete habit');
    }
  };

  const handleUseStreakRevive = async () => {
    setReviveBusy(true);
    try {
      const { data, error } = await supabase.rpc('use_streak_revive');
      if (error) throw error;
      toast.success(`Streak restored to ${data.current_streak}`);
      await refreshUser();
    } catch (e) {
      toast.error(e?.message || 'Failed to use streak revive');
    } finally {
      setReviveBusy(false);
    }
  };

  // Focus Mode home-screen Streak Shield purchase (500 gems) — the only
  // shop-adjacent action in Focus Mode, per the locked decision.
  const handleBuyFocusShield = async () => {
    setShieldBusy(true);
    try {
      const { data, error } = await supabase.rpc('buy_focus_shield');
      if (error) throw error;
      toast.success('Streak Shield ready — one missed day covered');
      await refreshUser();
    } catch (e) {
      toast.error(e?.message || 'Could not buy Streak Shield');
    } finally {
      setShieldBusy(false);
    }
  };

  const morningHabits = habits.filter(h => h.time_of_day === 'morning');
  const afternoonHabits = habits.filter(h => h.time_of_day === 'afternoon');
  const nightHabits = habits.filter(h => h.time_of_day === 'night');

  const currentXP = user?.current_xp || 0;
  // Level is stored in users.rank (computed by complete_habit); fall back to XP.
  const currentLevel = user?.rank || levelForXp(currentXP);
  const currentLevelInfo = rankInfo(currentLevel);
  const levelName = currentLevelInfo.name;

  // Weekly XP goal for the "This Week" ring — Step 2 spec: "if you did every one
  // of your habits every day this week" = sum of habit xp_value * 7.
  // NOTE: `habits` is the set scheduled for TODAY (fetchHabits filters by weekday),
  // not literally every active habit — see Step 2 summary. weeklyXpEarned comes
  // from daily_logs (Monday-start week), matching StreakCard's pip window.
  const weeklyXpGoal = habits.reduce((s, h) => s + (h.xp_value || 0), 0) * 7;
  const weeklyRingPct = weeklyXpGoal > 0 ? Math.min((weeklyXpEarned / weeklyXpGoal) * 100, 100) : 0;

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 ${isGameMode ? 'bg-[var(--gm-bg)]' : ''}`} data-testid="home-page">
      {/* XP Pop Animation */}
      <XpPopAnimation xpEvents={xpEvents} />

      {/* Roast Notification - Game Mode Only */}
      <AnimatePresence>
        {isGameMode && showRoast && currentRoast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-20 left-1/2 z-50 max-w-md w-[90%]"
            data-testid="roast-notification"
          >
            <div className="glass-card bg-gradient-to-r from-orange-900/60 to-red-900/60 text-white p-4 border-orange-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{currentRoast.text || currentRoast}</p>
                </div>
                <button onClick={dismissRoast} className="text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level up celebration - MASSIVE */}
      <AnimatePresence>
        {levelUpData && isGameMode && (
          <LevelUpCelebration data={levelUpData} onDismiss={() => setLevelUpData(null)} />
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-3">
            {/* Wordmark */}
            <h1
              className="font-['Archivo',sans-serif] font-black uppercase text-xl sm:text-2xl text-[var(--gm-ink)]"
              style={{ letterSpacing: '-0.01em' }}
              data-testid="wordmark"
            >
              PHASE
            </h1>

            {/* Game Mode Stats (gems / shields) — light pills on the light bg */}
            {isGameMode && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--gm-card)] cursor-default" data-testid="gems-display">
                  <Gem className="w-4 h-4 text-blue-500 animate-gem-shimmer" />
                  <span className="text-sm font-bold text-[var(--gm-ink)]">{user?.gems ?? 0}</span>
                </div>
                {streakShields > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--gm-card)]" data-testid="shields-display">
                    <Shield className="w-4 h-4 text-cyan-600" />
                    <span className="text-sm font-bold text-[var(--gm-ink)]">{streakShields}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stat tiles + boost/revive — Game Mode Only */}
          {isGameMode && (
            <>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {/* Tile 1 — Total XP */}
                <div className="rounded-2xl bg-[var(--gm-card)] p-4" data-testid="stat-tile-xp">
                  <div className="font-['Archivo'] font-black text-[var(--gm-ink)] text-2xl sm:text-3xl leading-none">
                    {currentXP.toLocaleString()}
                  </div>
                  <div className="font-['JetBrains_Mono'] font-bold uppercase text-[10px] text-[var(--gm-muted)] mt-2" style={{ letterSpacing: '0.08em' }}>
                    Total XP
                  </div>
                </div>

                {/* Tile 2 — Weekly progress ring (blue is reserved for progress) */}
                <div className="rounded-2xl bg-[var(--gm-card)] p-4 flex flex-col items-center justify-center text-center" data-testid="stat-tile-week">
                  <div className="relative w-[68px] h-[68px]">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
                      <circle cx="34" cy="34" r="28" fill="none" stroke="var(--gm-track)" strokeWidth="6" />
                      <circle
                        cx="34" cy="34" r="28" fill="none"
                        stroke="#3B82F6" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 28}
                        strokeDashoffset={(2 * Math.PI * 28) * (1 - weeklyRingPct / 100)}
                        style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-['JetBrains_Mono'] font-bold text-[10px] text-[var(--gm-ink)]">
                        {weeklyXpEarned}/{weeklyXpGoal}
                      </span>
                    </div>
                  </div>
                  <div className="font-['JetBrains_Mono'] font-bold uppercase text-[10px] text-[var(--gm-muted)] mt-2" style={{ letterSpacing: '0.08em' }}>
                    This Week
                  </div>
                </div>

                {/* Tile 3 — Level */}
                <div className="rounded-2xl bg-[var(--gm-card)] p-4" data-testid="stat-tile-level">
                  <div className="font-['Archivo'] font-black text-[var(--gm-ink)] text-2xl sm:text-3xl leading-none">
                    LV.{currentLevel}
                  </div>
                  <div className="font-['JetBrains_Mono'] font-bold uppercase text-[10px] text-[var(--gm-muted)] mt-2 truncate" style={{ letterSpacing: '0.08em' }}>
                    {levelName} Rank
                  </div>
                </div>
              </div>

              {/* Boost + Revive — kept functional, repositioned under the tiles */}
              {(boostMultiplier > 0 || (user?.current_streak === 0 && streakRevives > 0)) && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {boostMultiplier > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-600/25" data-testid="boost-active">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-600">{boostMultiplier}x BOOST</span>
                    </div>
                  )}
                  {user?.current_streak === 0 && streakRevives > 0 && (
                    <Button
                      size="sm"
                      onClick={handleUseStreakRevive}
                      disabled={reviveBusy}
                      className="bg-red-500/10 text-red-600 border border-red-600/25 hover:bg-red-500/20 text-xs rounded-xl"
                      data-testid="use-streak-revive-btn"
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      Revive Streak
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Streak Card */}
          <div className="mt-4">
            <StreakCard
              streak={user?.current_streak || 0}
              shieldsActive={streakShields}
              isGameMode={isGameMode}
            />
          </div>

          {/* Focus Mode: Streak Shield button on the home screen (500 gems).
              Locked decision — Focus Mode has no shop, this is its only purchase. */}
          {!isGameMode && (
            <div className="mt-4 p-4 rounded-[20px] bg-[var(--gm-card)] shadow-[var(--gm-shadow-card)] flex items-center gap-4" data-testid="focus-shield-card">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(149,222,230,0.16)' }}>
                <Shield className="w-5 h-5 text-[#183A3F]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--gm-ink)]">Streak Shield</p>
                <p className="text-xs text-[var(--gm-muted)] mt-0.5">
                  {streakShields > 0
                    ? `${streakShields} active · protects a missed day`
                    : 'Protects your streak on a missed day'}
                </p>
              </div>
              <Button
                onClick={handleBuyFocusShield}
                disabled={shieldBusy || (user?.gems ?? 0) < 500}
                className="rounded-full py-[9px] px-[14px] bg-[#95DEE6] hover:opacity-90 text-[#183A3F] text-sm flex-shrink-0 shadow-[var(--gm-shadow-cyan)] disabled:opacity-40"
                data-testid="buy-focus-shield-btn"
              >
                {shieldBusy
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <span className="flex items-center gap-[6px]"><Gem className="w-3.5 h-3.5 text-[#183A3F]" /> 500</span>}
              </Button>
            </div>
          )}
        </div>

        {/* Quest / challenge cards — PLACEHOLDER UI only (see PLACEHOLDER_quests).
            No real quest data model, backend, or friend wiring exists yet.
            Game Mode only — quests/XP are a Game Mode concept. */}
        {isGameMode && (
        <div className="flex gap-3 overflow-x-auto pb-1 mb-6 sm:mb-8 -mx-1 px-1" data-testid="quest-row">
          {PLACEHOLDER_quests.map((q) => {
            const done = q.state === 'complete';
            const QIcon = q.icon === 'check' ? Check : q.icon === 'clock' ? Clock : Zap;
            return (
              <div
                key={q.id}
                className={`flex-shrink-0 min-w-[150px] rounded-2xl p-4 ${done ? 'bg-[#DBF67F]' : 'bg-[var(--gm-card)]'}`}
                data-testid={`quest-card-${q.id}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${done ? 'bg-[#2A3B0B]' : 'bg-[var(--gm-badge)]'}`}
                >
                  <QIcon className={`w-4 h-4 ${done ? 'text-[#DBF67F]' : 'text-[var(--gm-muted)]'}`} strokeWidth={2} />
                </div>
                <div className={`font-['General_Sans',sans-serif] font-bold text-sm mt-3 ${done ? 'text-[#0F1210]' : 'text-[var(--gm-ink)]'}`}>
                  {q.title}
                </div>
                <div className={`text-xs mt-0.5 ${done ? 'text-[#0F1210]/70' : 'text-[var(--gm-muted)]'}`}>
                  {q.sub}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Habits sections */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--gm-ink)]" />
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-20" data-testid="no-habits">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[var(--gm-card)]">
              <Sparkles className="w-8 h-8 text-[var(--gm-muted)]" />
            </div>
            <h3 className="text-xl font-extrabold font-['Archivo',sans-serif] mb-2 text-[var(--gm-ink)]">No habits yet</h3>
            <p className="mb-6 text-[var(--gm-muted)]">{isGameMode ? 'Add your first habit to start earning XP and gems' : 'Add your first habit to start tracking'}</p>
            <AddHabitDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={fetchHabits} isGameMode={isGameMode} />
          </div>
        ) : (
          <div className="space-y-8">
            <HabitSection
              title="Morning"
              icon={<Sunrise className="w-5 h-5" />}
              onAddClick={() => setAddDialogOpen(true)}
              habits={morningHabits}
              onComplete={handleCompleteHabit}
              onUncomplete={handleUncompleteHabit}
              onBeginSession={(h) => setFocusSession({ habit: h, duration: h.session_duration || 15 })}
              completingHabit={completingHabit}
              isGameMode={isGameMode}
            />
            <HabitSection
              title="Afternoon"
              icon={<Sun className="w-5 h-5" />}
              onAddClick={() => setAddDialogOpen(true)}
              habits={afternoonHabits}
              onComplete={handleCompleteHabit}
              onUncomplete={handleUncompleteHabit}
              onBeginSession={(h) => setFocusSession({ habit: h, duration: h.session_duration || 15 })}
              completingHabit={completingHabit}
              isGameMode={isGameMode}
            />
            <HabitSection
              title="Night"
              icon={<Moon className="w-5 h-5" />}
              onAddClick={() => setAddDialogOpen(true)}
              habits={nightHabits}
              onComplete={handleCompleteHabit}
              onUncomplete={handleUncompleteHabit}
              onBeginSession={(h) => setFocusSession({ habit: h, duration: h.session_duration || 15 })}
              completingHabit={completingHabit}
              isGameMode={isGameMode}
            />
          </div>
        )}
      </div>

      {/* Floating add button */}
      {habits.length > 0 && (
        <AddHabitDialog 
          open={addDialogOpen} 
          onOpenChange={setAddDialogOpen} 
          onSuccess={fetchHabits} 
          isGameMode={isGameMode}
          trigger={
            <Button
              className="fixed bottom-24 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full shadow-[var(--gm-shadow-fab)] hover-scale bg-[var(--gm-ink)] hover:opacity-90"
              data-testid="add-habit-fab"
            >
              <Plus className="w-6 h-6 text-[var(--gm-bg)]" />
            </Button>
          }
        />
      )}

      {/* Focus Session fullscreen timer */}
      <AnimatePresence>
        {focusSession && !isGameMode && (
          <FocusSession
            habit={focusSession.habit}
            duration={focusSession.duration}
            onComplete={async () => {
              await handleCompleteHabit(focusSession.habit.habit_id);
              setFocusSession(null);
            }}
            onAbandon={async () => {
              setFocusSession(null);
              // Reflect the penalty (gems / streak / shield) and the failed habit.
              await refreshUser();
              await fetchHabits();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function HabitSection({ title, icon, habits, onComplete, onUncomplete, onBeginSession, completingHabit, isGameMode, onAddClick }) {
  if (habits.length === 0) return null;
  const IconMap = { morning: Sunrise, afternoon: Sun, night: Moon };
  const Icon = IconMap[title.toLowerCase()] || Sunrise;
  const leftCount = habits.filter(h => !h.completed_today).length;

  return (
    <div data-testid={`habits-${title.toLowerCase()}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 flex-shrink-0 text-[var(--gm-muted)]" />
          <h3
            className="font-['Archivo',sans-serif] font-extrabold text-[19px] sm:text-xl truncate text-[var(--gm-ink)]"
            style={{ letterSpacing: '-0.01em' }}
          >
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status indicator — not a button */}
          {leftCount > 0 && (
            <span
              className={`font-['JetBrains_Mono'] font-bold uppercase text-[10px] px-2.5 py-1 rounded-full border ${isGameMode ? 'border-[#A59BCC]/50 text-[#A59BCC]' : 'border-[var(--gm-track)] text-[var(--gm-muted)]'}`}
              style={{ letterSpacing: '0.06em' }}
              data-testid={`habits-left-${title.toLowerCase()}`}
            >
              {leftCount} Left
            </span>
          )}
          {/* ADD pill — opens the SAME existing AddHabitDialog as the FAB */}
          <button
            type="button"
            onClick={onAddClick}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-['General_Sans'] font-bold uppercase transition-colors ${isGameMode ? 'border-[#A59BCC] text-[#A59BCC] hover:bg-[#A59BCC]/10' : 'border-[var(--gm-track)] text-[var(--gm-ink)] hover:bg-[var(--gm-card)]'}`}
            data-testid={`add-habit-pill-${title.toLowerCase()}`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {habits.map((habit) => (
          <HabitCard
            key={habit.habit_id}
            habit={habit}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
            onBeginSession={onBeginSession}
            isCompleting={completingHabit === habit.habit_id}
            isGameMode={isGameMode}
          />
        ))}
      </div>
    </div>
  );
}

function HabitCard({ habit, onComplete, onUncomplete, onBeginSession, isCompleting, isGameMode }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const handleClick = () => {
    if (habit.completed_today) {
      setShowConfirm(true);
    } else {
      if (isGameMode) {
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1000);
      }
      onComplete(habit.habit_id);
    }
  };

  // Difficulty accent for the XP reward — mid-tone shades that stay legible on
  // the Game-Mode row in BOTH themes (dark #1F2123 and light #F2F3F0 card).
  const difficultyColorsHome = {
    easy: 'text-green-600',
    medium: 'text-amber-600',
    hard: 'text-red-600'
  };

  const gemReward = { easy: 5, medium: 10, hard: 20 }[habit.difficulty] || 5;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-4 rounded-[18px] border transition-all duration-200 overflow-hidden ${
        habit.completed_today
          ? 'bg-[#DBF67F] border-transparent shadow-[var(--gm-shadow-lime)]'
          : 'bg-[var(--gm-card)] border-transparent hover:border-[var(--gm-track)] shadow-[var(--gm-shadow-card)]'
      }`}
      data-testid={`habit-card-${habit.habit_id}`}
    >
      {/* Particle burst on complete - Game Mode */}
      <AnimatePresence>
        {isGameMode && showParticles && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, scale: 0, x: 20, y: 20 }}
                animate={{ 
                  opacity: 0,
                  scale: 1,
                  x: 20 + Math.cos(i * 30 * Math.PI / 180) * 60,
                  y: 20 + Math.sin(i * 30 * Math.PI / 180) * 60
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute w-2 h-2 rounded-full bg-[#2A3B0B]"
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        {/* Failed today (abandoned / tab-switched) — locked, non-actionable. */}
        {habit.failed_today ? (
          <div
            className="w-8 h-8 rounded-lg border-2 border-red-500/30 bg-red-500/10 flex items-center justify-center flex-shrink-0"
            data-testid={`habit-failed-${habit.habit_id}`}
          >
            <X className="w-4 h-4 text-red-400" />
          </div>
        ) : !isGameMode && !habit.completed_today ? (
          /* Focus Mode: Begin button instead of checkbox for uncompleted habits */
          <button
            onClick={() => onBeginSession(habit)}
            disabled={isCompleting}
            className="py-[10px] px-[16px] rounded-full bg-[#95DEE6] hover:opacity-90 text-[#183A3F] text-xs font-bold flex-shrink-0 transition-all flex items-center gap-[7px] shadow-[var(--gm-shadow-cyan)]"
            data-testid={`habit-begin-${habit.habit_id}`}
          >
            {isCompleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Play className="w-3 h-3 fill-current" /> Begin</>}
          </button>
        ) : (
          /* Game Mode checkbox OR completed Focus Mode checkbox */
          <button
            onClick={handleClick}
            disabled={isCompleting}
            className={`w-[34px] h-[34px] rounded-[11px] border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              habit.completed_today
                ? 'bg-[#2A3B0B] border-[#2A3B0B]'
                : 'border-[var(--gm-checkbox)] hover:border-[var(--gm-muted)]'
            }`}
            data-testid={`habit-checkbox-${habit.habit_id}`}
          >
            {isCompleting ? (
              <Loader2 className={`w-4 h-4 animate-spin ${isGameMode && !habit.completed_today ? 'text-[var(--gm-ink)]' : 'text-white'}`} />
            ) : habit.completed_today ? (
              <Check className="w-4 h-4 text-white" />
            ) : null}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`${
            habit.failed_today
              ? 'font-medium text-zinc-400 line-through'
              : habit.completed_today
                ? 'font-bold text-[#0F1210]'
                : 'font-medium text-[var(--gm-ink)]'
          }`}>
            {habit.habit_name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {habit.failed_today && (
              <span className="text-xs text-red-400 font-medium">Failed today</span>
            )}
            {isGameMode ? (
              <span className={`text-xs ${habit.completed_today ? 'text-[#0F1210] font-bold' : `${difficultyColorsHome[habit.difficulty]} font-semibold`}`}>
                +{habit.xp_value} XP
              </span>
            ) : (
              <span className={`text-xs capitalize ${habit.completed_today ? 'text-[#0F1210] font-bold' : 'text-[var(--gm-muted)]'}`}>{habit.difficulty} &middot; {habit.session_duration || 15}min</span>
            )}
            {isGameMode && (
              <span className={`text-xs flex items-center gap-1 ${habit.completed_today ? 'text-[#0F1210] font-bold' : 'text-[var(--gm-muted)]'}`}>
                <Gem className="w-3 h-3" /> +{gemReward}
              </span>
            )}
            {habit.current_streak > 0 && (
              <span className={`text-xs flex items-center gap-1 ${habit.completed_today ? 'text-[#0F1210]/70' : 'text-[var(--gm-muted)]'}`}>
                <Flame className="w-3 h-3" /> {habit.current_streak}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Uncomplete confirmation */}
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 pt-3 border-t flex items-center justify-between border-[#0F1210]/15"
        >
          <span className="text-sm text-[#0F1210]">Uncheck this habit?</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConfirm(false)}
              className="text-[#0F1210] hover:bg-[#0F1210]/10"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                onUncomplete(habit.habit_id);
                setShowConfirm(false);
              }}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              Uncheck
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function AddHabitDialog({ open, onOpenChange, onSuccess, isGameMode, trigger }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    habit_name: '',
    description: '',
    time_of_day: 'morning',
    difficulty: 'medium',
    repeat_schedule: 'daily',
    session_duration: 15
  });
  const [loading, setLoading] = useState(false);

  const xpValues = { easy: 10, medium: 25, hard: 50 };
  const gemValues = { easy: 5, medium: 10, hard: 20 };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.habit_name.trim() || !user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('habits').insert({
        user_id: user.id,
        habit_name: formData.habit_name.trim(),
        description: formData.description || null,
        time_of_day: formData.time_of_day,
        difficulty: formData.difficulty,
        xp_value: xpValues[formData.difficulty],
        gem_value: gemValues[formData.difficulty],
        repeat_schedule: formData.repeat_schedule,
        session_duration: formData.session_duration || 15,
      });
      if (error) throw error;

      toast.success('Habit created!');
      onOpenChange(false);
      setFormData({
        habit_name: '',
        description: '',
        time_of_day: 'morning',
        difficulty: 'medium',
        repeat_schedule: 'daily',
        session_duration: 15
      });
      onSuccess();
    } catch (e) {
      toast.error(e?.message || 'Failed to create habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && (
        <DialogTrigger asChild>
          <Button
            className={`${isGameMode ? 'bg-purple-600 hover:bg-purple-700 glow-purple-sm' : 'bg-[var(--gm-ink)] text-[var(--gm-bg)] hover:opacity-90'}`}
            data-testid="add-first-habit-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Habit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-[var(--gm-card)] border-[var(--gm-track)] text-[var(--gm-ink)] shadow-[var(--gm-shadow-card)] max-w-md" data-testid="add-habit-dialog">
        <DialogHeader>
          <DialogTitle className="font-['Archivo',sans-serif] font-extrabold">Create New Habit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[var(--gm-muted)]">Habit Name</Label>
            <Input
              placeholder="e.g., Morning workout"
              value={formData.habit_name}
              onChange={(e) => setFormData({ ...formData, habit_name: e.target.value })}
              className="bg-[var(--gm-bg)] border-[var(--gm-track)] text-[var(--gm-ink)]"
              data-testid="habit-name-input"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--gm-muted)]">Time of Day</Label>
            <Select
              value={formData.time_of_day}
              onValueChange={(v) => setFormData({ ...formData, time_of_day: v })}
            >
              <SelectTrigger className="bg-[var(--gm-bg)] border-[var(--gm-track)] text-[var(--gm-ink)]" data-testid="habit-time-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--gm-card)] border-[var(--gm-track)]">
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--gm-muted)]">Difficulty</Label>
            <Select
              value={formData.difficulty}
              onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
            >
              <SelectTrigger className="bg-[var(--gm-bg)] border-[var(--gm-track)] text-[var(--gm-ink)]" data-testid="habit-difficulty-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--gm-card)] border-[var(--gm-track)]">
                <SelectItem value="easy">
                  Easy (+{xpValues.easy} XP{isGameMode ? ` • +${gemValues.easy} gems` : ''})
                </SelectItem>
                <SelectItem value="medium">
                  Medium (+{xpValues.medium} XP{isGameMode ? ` • +${gemValues.medium} gems` : ''})
                </SelectItem>
                <SelectItem value="hard">
                  Hard (+{xpValues.hard} XP{isGameMode ? ` • +${gemValues.hard} gems` : ''})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--gm-muted)]">Repeat</Label>
            <Select
              value={formData.repeat_schedule}
              onValueChange={(v) => setFormData({ ...formData, repeat_schedule: v })}
            >
              <SelectTrigger className="bg-[var(--gm-bg)] border-[var(--gm-track)] text-[var(--gm-ink)]" data-testid="habit-repeat-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--gm-card)] border-[var(--gm-track)]">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Weekdays</SelectItem>
                <SelectItem value="weekends">Weekends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Session Duration - Focus Mode only */}
          {!isGameMode && (
            <div className="space-y-2">
              <Label className="text-[var(--gm-muted)]">Session Duration</Label>
              <Select
                value={String(formData.session_duration)}
                onValueChange={(v) => setFormData({ ...formData, session_duration: Number(v) })}
              >
                <SelectTrigger className="bg-[var(--gm-bg)] border-[var(--gm-track)] text-[var(--gm-ink)]" data-testid="habit-duration-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--gm-card)] border-[var(--gm-track)]">
                  {[5, 10, 15, 20, 30, 45, 60].map(m => (
                    <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.habit_name.trim()}
              className={`w-full ${isGameMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[var(--gm-ink)] text-[var(--gm-bg)] hover:opacity-90'}`}
              data-testid="create-habit-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Habit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


const CONFETTI_COLORS_LEVEL = ['#1B6AE4', '#FFD700', '#7B2FBE', '#00D4AA'];

function LevelUpCelebration({ data, onDismiss }) {
  const canvasRef = useRef(null);

  // Canvas confetti
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 6 + 3,
        color: CONFETTI_COLORS_LEVEL[Math.floor(Math.random() * CONFETTI_COLORS_LEVEL.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.5 ? 'star' : 'diamond',
      });
    }

    let animId;
    function drawStar(cx, cy, size, rot) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        ctx[method](Math.cos(angle) * size, Math.sin(angle) * size);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawDiamond(cx, cy, size, rot) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, 0);
      ctx.moveTo(0, size);
      ctx.lineTo(-size * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rotSpeed;
        if (p.y < canvas.height + 20) active = true;
        ctx.fillStyle = p.color;
        if (p.shape === 'star') drawStar(p.x, p.y, p.size, p.rotation);
        else drawDiamond(p.x, p.y, p.size, p.rotation);
      });
      if (active) animId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Fanfare sound — 3 second rising sequence
  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [
        { f: 392, t: 0, d: 0.3 }, { f: 440, t: 0.2, d: 0.3 }, { f: 523, t: 0.4, d: 0.3 },
        { f: 587, t: 0.6, d: 0.3 }, { f: 659, t: 0.8, d: 0.4 }, { f: 784, t: 1.1, d: 0.5 },
        { f: 880, t: 1.5, d: 0.4 }, { f: 1047, t: 1.8, d: 0.8 }, { f: 784, t: 1.8, d: 0.8 },
      ];
      notes.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + d);
      });
    } catch { /* silent */ }
  }, []);

  const rewardGems = data.level_up_gems || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
      onClick={onDismiss} data-testid="level-up-celebration"
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative text-center p-8 z-10">
        {/* Level number with golden glow */}
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1.0] }}
          transition={{ duration: 0.8, times: [0, 0.6, 1], ease: 'easeOut' }}
          className="mb-6"
        >
          <div className="text-8xl sm:text-9xl font-black font-['Archivo',sans-serif] text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)',
              filter: 'drop-shadow(0 0 30px rgba(255,215,0,0.5))',
              WebkitTextStroke: '1px rgba(255,215,0,0.3)',
            }}
            data-testid="level-number"
          >
            {data.level}
          </div>
        </motion.div>

        {/* LEVEL X UNLOCKED shimmer text */}
        <motion.h2
          initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-2xl sm:text-4xl font-black font-['Archivo',sans-serif] mb-2 level-up-shimmer-text"
          data-testid="level-up-text"
        >
          LEVEL {data.level} UNLOCKED
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-lg sm:text-xl font-semibold text-zinc-300 mb-6"
        >
          {data.level_name}
        </motion.p>

        {/* Reward display — flat +50 gems per level-up (Step 7) */}
        {rewardGems > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border"
            style={{ backgroundColor: '#0C1220', borderColor: '#1B6AE4', boxShadow: '0 0 20px rgba(27,106,228,0.25)' }}
            data-testid="level-reward"
          >
            <Gem className="w-4 h-4 text-[#4D8EF0]" />
            <span className="text-sm font-medium text-white">+{rewardGems} Gems</span>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-xs text-zinc-600 mt-6"
        >
          Tap anywhere to dismiss
        </motion.p>
      </div>
    </motion.div>
  );
}
