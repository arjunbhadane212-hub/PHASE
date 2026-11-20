import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { useGame } from '../contexts/GameContext';
import { rankInfo, levelForXp } from '../data/levels';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE, fadeUp, staggerParent } from '../lib/motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { Plus, Check, Sunrise, Sun, Moon, Flame, Loader2, Gem, Shield, Zap, X, Play, ReviveIcon, SparkleIcon } from '../components/icons';
import DailyQuests from '../components/home/DailyQuests';
import StreakCelebration from '../components/home/StreakCelebration';
import PushPrimer from '../components/home/PushPrimer';
import { shouldShowPrimer } from '../lib/push';
import StreakCard from '../components/StreakCard';
import XpPopAnimation from '../components/XpPopAnimation';
import FocusSession from '../components/FocusSession';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { drainTitleUnlocks } from '../components/profile/TitleUnlockToast';
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

// XP per difficulty — mirrors complete_habit (habits.xp_value is client-editable
// and never read by the server, so the UI must not show it either).
const XP_FOR = { easy: 10, medium: 25, hard: 50 };
const levelRewardGems = (lvl) => 25 * lvl + 25; // mirrors level_reward_gems()

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
  const [todayXpEarned, setTodayXpEarned] = useState(0);
  const [streakCel, setStreakCel] = useState(null);       // { before, after, milestone }
  const [pendingLevelUp, setPendingLevelUp] = useState(null);
  const [showPrimer, setShowPrimer] = useState(false);
  const [questKey, setQuestKey] = useState(0);

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

  // Weekly + today's XP for the home header tiles. Same weekly window as
  // StreakCard's pip bar: CALENDAR WEEK, Monday-start. daily_logs.xp_earned_today
  // is the authoritative per-day XP (complete_habit writes it, uncomplete_habit
  // decrements it) and is keyed by log_date, so today's row IS the reset-daily
  // total — no separate "reset at midnight" logic needed, a new day just gets a
  // new row. Read-only SELECT — no writes, no schema/RPC changes. Re-runs on
  // current_xp change so it stays fresh after a completion (refreshUser updates
  // current_xp).
  const fetchWeeklyXp = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date();
    const todayStr = localDateStr(now);
    const diffToMonday = (now.getDay() + 6) % 7; // 0=Sun..6=Sat -> days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const { data, error } = await supabase
      .from('daily_logs')
      .select('log_date, xp_earned_today')
      .eq('user_id', user.id)
      .gte('log_date', localDateStr(monday));
    if (error) {
      console.error('Failed to load weekly XP', error);
      return;
    }
    const rows = data || [];
    setWeeklyXpEarned(rows.reduce((s, r) => s + (r.xp_earned_today || 0), 0));
    setTodayXpEarned(rows.find(r => r.log_date === todayStr)?.xp_earned_today || 0);
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
      // A title just unlocked -> drain the durable notification(s) it wrote
      // and toast them (marks them read, so the app-load catch-up won't repeat).
      if (data?.newly_unlocked?.length) drainTitleUnlocks();

      setQuestKey((k) => k + 1);
      const levelUp = isGameMode && data.level_up
        ? { level: data.rank, level_name: data.rank_name, level_up_gems: data.level_up_gems, next_level_gems: data.next_level_gems }
        : null;
      if (isGameMode) {
        soundEngine.habitComplete();
        xpIdRef.current += 1;
        setXpEvents(prev => [...prev, { id: xpIdRef.current, amount: data.xp_earned, boost: false }]);
      } else if (data.gems_earned > 0) {
        toast.success(`+${data.gems_earned} gems`, { duration: 2000 });
      }
      // First completion of the day → the streak moment, then (if any) the
      // level-up, then the reminder opt-in. One screen at a time.
      if (data.streak_extended) {
        setStreakCel({ before: data.streak_before || 0, after: data.current_streak, milestone: data.streak_milestone });
        if (levelUp) setPendingLevelUp(levelUp);
      } else if (levelUp) {
        setLevelUpData(levelUp);
      } else if (data.streak_milestone?.gems) {
        toast.success(`${data.streak_milestone.days}-day milestone · +${data.streak_milestone.gems} gems`);
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
      setQuestKey((k) => k + 1);
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
  const weeklyXpGoal = habits.reduce((s, h) => s + (XP_FOR[h.difficulty] || 0), 0) * 7;
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
            <div className="rounded-2xl bg-[var(--gm-card)] text-[var(--gm-ink)] p-4 shadow-[var(--gm-shadow-card)]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4F36B] text-[#2B3A06] flex items-center justify-center flex-shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{currentRoast.text || currentRoast}</p>
                </div>
                <button onClick={dismissRoast} className="text-[var(--gm-muted)] hover:text-[var(--gm-ink)] transition-colors" aria-label="Dismiss">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak extended → level up → reminder opt-in, one at a time */}
      <AnimatePresence>
        {streakCel && (
          <StreakCelebration {...streakCel} isGameMode={isGameMode} onDone={() => {
            setStreakCel(null);
            if (pendingLevelUp) { setLevelUpData(pendingLevelUp); setPendingLevelUp(null); }
            else if (shouldShowPrimer()) setShowPrimer(true);
          }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {levelUpData && isGameMode && (
          <LevelUpCelebration data={levelUpData} onDismiss={() => { setLevelUpData(null); if (shouldShowPrimer()) setShowPrimer(true); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPrimer && <PushPrimer streak={user?.current_streak || 0} onClose={() => setShowPrimer(false)} />}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-3">
            {/* UI v3: greeting row like the references (avatar + hello + date) */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-[#F6B3CE] text-[#4B1530] flex items-center justify-center font-display text-[23px] flex-shrink-0">
                {(user?.username || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-[var(--gm-muted)]">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <p className="font-display text-[25px] leading-tight text-[var(--gm-ink)] truncate">Hi, {user?.username || 'there'}</p>
              </div>
            </div>
            {/* Game Mode Stats (gems / shields) — light pills on the light bg */}
            {(
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#141416] cursor-default" data-testid="gems-display">
                  <Gem className="w-4 h-4 text-[#D4F36B]" />
                  <span className="text-sm font-display font-black text-white">{user?.gems ?? 0}</span>
                </div>
                {streakShields > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[var(--gm-card)]" data-testid="shields-display">
                    <Shield className="w-4 h-4 text-[var(--gm-ink)]" />
                    <span className="text-sm font-bold text-[var(--gm-ink)]">{streakShields}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stat tiles + boost/revive — Game Mode Only */}
          {isGameMode && (
            <>
              <motion.div className="grid grid-cols-3 gap-3 mt-4" variants={staggerParent(0.08, 0.1)} initial="hidden" animate="show">
                {/* Tile 1 — Today's XP. Sourced from daily_logs.xp_earned_today
                    (see fetchWeeklyXp), which is keyed by log_date — a new day
                    is a new row, so this resets automatically at local midnight
                    with no client-side reset logic to get wrong. All-time total
                    XP still lives on the Settings page; it's intentionally not
                    duplicated here. */}
                <motion.div variants={fadeUp} className="rounded-[24px] bg-[#FFD25E] p-4 flex flex-col justify-between" data-testid="stat-tile-xp">
                  <div className="font-display text-[#4A3500] text-[28px] sm:text-3xl leading-none">
                    {todayXpEarned.toLocaleString()}
                  </div>
                  <div className="font-label text-[14px] text-[#4A3500]/75 mt-2">
                    XP today
                  </div>
                </motion.div>

                {/* Tile 2 — Weekly progress ring (blue is reserved for progress) */}
                <motion.div variants={fadeUp} className="rounded-[24px] bg-[#9DD3F7] p-4 flex flex-col items-center justify-center text-center" data-testid="stat-tile-week" style={{ '--gm-ink': '#0B2E45', '--gm-muted': '#0B2E45B3', '--gm-track': '#0B2E4526' }}>
                  <div className="relative w-[68px] h-[68px]">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
                      <circle cx="34" cy="34" r="28" fill="none" stroke="var(--gm-track)" strokeWidth="6" />
                      <circle
                        cx="34" cy="34" r="28" fill="none"
                        stroke="#0B2E45" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 28}
                        strokeDashoffset={(2 * Math.PI * 28) * (1 - weeklyRingPct / 100)}
                        style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-label font-bold text-[12px] text-[var(--gm-ink)]">
                        {weeklyXpEarned}/{weeklyXpGoal}
                      </span>
                    </div>
                  </div>
                  <div className="font-label text-[14px] text-[var(--gm-muted)] mt-2">
                    This week
                  </div>
                </motion.div>

                {/* Tile 3 — Level */}
                <motion.div variants={fadeUp} className="rounded-[24px] bg-[#FF9F82] p-4" data-testid="stat-tile-level">
                  <div className="font-display text-[#4D1A0B] text-[28px] sm:text-3xl leading-none">
                    Lv {currentLevel}
                  </div>
                  <div className="font-label text-[14px] text-[#4D1A0B]/75 mt-2 truncate">
                    {levelName}
                  </div>
                  {currentLevel < 15 && (
                    <div className="flex items-center gap-1 mt-1 text-[12px] font-semibold text-[#4D1A0B] whitespace-nowrap" data-testid="next-level-reward">
                      Next <Gem className="w-3.5 h-3.5 text-[#4D1A0B]" /> +{levelRewardGems(currentLevel + 1)}
                    </div>
                  )}
                </motion.div>
              </motion.div>

              {/* Boost + Revive — kept functional, repositioned under the tiles */}
              {(boostMultiplier > 0 || (user?.current_streak === 0 && streakRevives > 0)) && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {boostMultiplier > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#D4F36B] text-[#2B3A06]" data-testid="boost-active">
                      <Zap className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{boostMultiplier}× XP active</span>
                    </div>
                  )}
                  {user?.current_streak === 0 && streakRevives > 0 && (
                    <Button
                      size="sm"
                      onClick={handleUseStreakRevive}
                      disabled={reviveBusy}
                      className="bg-[#D4F36B] text-[#2B3A06] hover:opacity-90 text-xs font-bold rounded-full"
                      data-testid="use-streak-revive-btn"
                    >
                      <ReviveIcon className="w-3.5 h-3.5 mr-1" />
                      Revive {user?.previous_streak ? `${user.previous_streak}-day streak` : 'streak'}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* UI v3: Focus Mode home — a real dashboard instead of an empty page.
              Today's focus minutes, the next session one tap away, and tiles. */}
          {!isGameMode && (
            <FocusHero
              habits={habits}
              user={user}
              shields={streakShields}
              shieldBusy={shieldBusy}
              onBuyShield={handleBuyFocusShield}
              onBegin={(h) => setFocusSession({ habit: h, duration: h.session_duration || 15 })}
            />
                    )}

          {/* Streak Card */}
          <motion.div className="mt-4" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}>
            <StreakCard
              streak={user?.current_streak || 0}
              shieldsActive={streakShields}
              doneToday={habits.some(h => h.completed_today)}
              isGameMode={isGameMode}
              refreshKey={questKey}
            />
          </motion.div>

        </div>

        {/* Daily quests — real, server-computed, claimable */}
        <div className="mb-6 sm:mb-8">
          <DailyQuests refreshKey={questKey} />
        </div>

        {/* Habits sections */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--gm-ink)]" />
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-20" data-testid="no-habits">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[var(--gm-card)]">
              <SparkleIcon className="w-8 h-8 text-[var(--gm-muted)]" />
            </div>
            <h3 className="text-xl font-extrabold font-display mb-2 text-[var(--gm-ink)]">No habits yet</h3>
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
              className="fixed bottom-24 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full shadow-[var(--gm-shadow-fab)] hover-scale bg-[#F6B3CE] hover:opacity-90"
              data-testid="add-habit-fab"
            >
              <Plus className="w-6 h-6 text-[#4B1530]" />
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

function FocusHero({ habits, user, shields, shieldBusy, onBuyShield, onBegin }) {
  const navigate = useNavigate();
  const mins = (h) => h.session_duration || 15;
  const planned = habits.reduce((a, h) => a + mins(h), 0);
  const done = habits.filter((h) => h.completed_today).reduce((a, h) => a + mins(h), 0);
  const doneCount = habits.filter((h) => h.completed_today).length;
  const next = habits.find((h) => !h.completed_today && !h.failed_today);
  const pct = planned ? Math.min(100, Math.round((done / planned) * 100)) : 0;
  const R = 34; const C = 2 * Math.PI * R;
  const total = user?.total_focus_minutes || 0;
  const totalLabel = total >= 60 ? `${Math.floor(total / 60)}h ${total % 60}m` : `${total}m`;
  return (
    <motion.div className="mt-4 space-y-3" variants={staggerParent(0.08, 0.15)} initial="hidden" animate="show" data-testid="focus-hero">
      <motion.div variants={fadeUp} className="rounded-[28px] p-5 bg-[#9DD3F7] text-[#0B2E45]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold opacity-70">Today's focus</p>
            <p className="font-display text-[52px] leading-none mt-1 tabular-nums">{done}<span className="text-[22px] ml-1">min</span></p>
            <p className="text-[14px] font-semibold opacity-70 mt-1">of {planned} min planned · {doneCount}/{habits.length} sessions</p>
          </div>
          <div className="relative w-[84px] h-[84px] flex-none">
            <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
              <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(11,46,69,0.15)" strokeWidth="9" />
              <motion.circle cx="42" cy="42" r={R} fill="none" stroke="#0B2E45" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct / 100) }}
                transition={{ duration: 1.2, ease: EASE, delay: 0.3 }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-[18px]">{pct}%</span>
          </div>
        </div>
        {next ? (
          <div className="mt-4 rounded-[20px] bg-white/55 p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold opacity-70">Up next</p>
              <p className="text-[17px] font-bold truncate">{next.habit_name}</p>
              <p className="text-[13px] font-semibold opacity-70">{mins(next)} min session</p>
            </div>
            <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => onBegin(next)}
              className="h-12 px-5 rounded-full bg-[#0B2E45] text-white font-bold text-[16px] flex items-center gap-2 flex-none" data-testid="focus-start-next">
              <Play className="w-4 h-4 fill-current" /> Start
            </motion.button>
          </div>
        ) : habits.length > 0 ? (
          <p className="mt-4 rounded-[20px] bg-white/55 p-3 text-[16px] font-bold">Every session done today. Rest well.</p>
        ) : null}
      </motion.div>

      <div className="grid grid-cols-3 gap-2.5">
        <motion.div variants={fadeUp} className="rounded-[22px] p-3.5 bg-[#FFD25E] text-[#4A3500]">
          <p className="font-display text-[22px] leading-none">{totalLabel}</p>
          <p className="text-[12px] font-semibold opacity-75 mt-2">All-time focus</p>
        </motion.div>
        <motion.div variants={fadeUp} className="rounded-[22px] p-3.5 bg-[#F6B3CE] text-[#4B1530]">
          <p className="font-display text-[22px] leading-none">{user?.longest_streak_ever || 0}d</p>
          <p className="text-[12px] font-semibold opacity-75 mt-2">Best streak</p>
        </motion.div>
        <motion.button type="button" variants={fadeUp} whileTap={{ scale: 0.96 }}
          onClick={() => (shields > 0 ? navigate('/dashboard/focus-shop?tab=essentials') : onBuyShield())}
          disabled={shieldBusy || (shields === 0 && (user?.gems ?? 0) < 500)}
          className="rounded-[22px] p-3.5 bg-[#D4F36B] text-[#2B3A06] text-left disabled:opacity-60" data-testid="buy-focus-shield-btn">
          <p className="font-display text-[22px] leading-none flex items-center gap-1"><Shield className="w-5 h-5" /> {shields}</p>
          <p className="text-[12px] font-semibold opacity-75 mt-2">{shieldBusy ? 'Buying…' : shields > 0 ? 'Shields ready' : 'Buy · 500'}</p>
        </motion.button>
      </div>
    </motion.div>
  );
}

// UI v3: every time slot owns a color block (refs: full pastel cards).
const SLOT_TONE = {
  morning:   { bg: '#FFD25E', ink: '#4A3500' },
  afternoon: { bg: '#FF9F82', ink: '#4D1A0B' },
  night:     { bg: '#9DD3F7', ink: '#0B2E45' },
};

function HabitSection({ title, icon, habits, onComplete, onUncomplete, onBeginSession, completingHabit, isGameMode, onAddClick }) {
  if (habits.length === 0) return null;
  const IconMap = { morning: Sunrise, afternoon: Sun, night: Moon };
  const Icon = IconMap[title.toLowerCase()] || Sunrise;
  const leftCount = habits.filter(h => !h.completed_today).length;
  const tone = SLOT_TONE[title.toLowerCase()] || SLOT_TONE.morning;

  return (
    <motion.div data-testid={`habits-${title.toLowerCase()}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -60px 0px' }} transition={{ duration: 0.6, ease: EASE }}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: tone.bg, color: tone.ink }}>
            <Icon className="w-[18px] h-[18px]" />
          </span>
          <h3
            className="font-display text-[25px] truncate text-[var(--gm-ink)]"
          >
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status indicator — not a button */}
          {leftCount > 0 && (
            <span
              className="font-label text-[14px] px-3 py-1.5 rounded-full bg-[var(--gm-card)] text-[var(--gm-ink)]"
              data-testid={`habits-left-${title.toLowerCase()}`}
            >
              {leftCount} left
            </span>
          )}
          {/* ADD pill — opens the SAME existing AddHabitDialog as the FAB */}
          <button
            type="button"
            onClick={onAddClick}
            className="flex items-center gap-1 pl-2.5 pr-3 py-1.5 rounded-full bg-[var(--gm-ink)] text-[var(--gm-bg)] text-[14px] font-sans font-bold transition-opacity hover:opacity-85"
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
            tone={tone}
          />
        ))}
      </div>
    </motion.div>
  );
}

function HabitCard({ habit, onComplete, onUncomplete, onBeginSession, isCompleting, isGameMode, tone }) {
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
  const gemReward = { easy: 5, medium: 10, hard: 20 }[habit.difficulty] || 5;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, layout: { duration: 0.5, ease: EASE } }}
      whileTap={{ scale: 0.985 }}
      className={`relative p-4 rounded-[24px] border transition-colors duration-700 overflow-hidden ${
        habit.completed_today
          ? 'bg-[#D4F36B] border-transparent shadow-[var(--gm-shadow-lime)]'
          : 'border-transparent'
      }`}
      style={habit.completed_today || !tone ? undefined : {
        background: tone.bg, '--gm-ink': tone.ink, '--gm-muted': `${tone.ink}B3`, '--gm-checkbox': `${tone.ink}66`,
      }}
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
                className="absolute w-2 h-2 rounded-full bg-[#2B3A06]"
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
            className="py-[10px] px-[16px] rounded-full bg-[#D4F36B] hover:opacity-90 text-[#2B3A06] text-xs font-bold flex-shrink-0 transition-all flex items-center gap-[7px] shadow-[var(--gm-shadow-cyan)]"
            data-testid={`habit-begin-${habit.habit_id}`}
          >
            {isCompleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Play className="w-3 h-3 fill-current" /> Begin</>}
          </button>
        ) : (
          /* Game Mode checkbox OR completed Focus Mode checkbox */
          <button
            onClick={handleClick}
            disabled={isCompleting}
            className={`w-[38px] h-[38px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              habit.completed_today
                ? 'bg-[#141416] border-[#141416]'
                : 'border-[var(--gm-checkbox)] hover:border-[#141416]'
            }`}
            data-testid={`habit-checkbox-${habit.habit_id}`}
          >
            {isCompleting ? (
              <Loader2 className={`w-4 h-4 animate-spin ${isGameMode && !habit.completed_today ? 'text-[var(--gm-ink)]' : 'text-white'}`} />
            ) : habit.completed_today ? (
              <motion.span initial={{ scale: 0, rotate: -60 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 14 }}>
                <Check className="w-5 h-5 text-[#D4F36B]" weight="bold" />
              </motion.span>
            ) : null}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`${
            habit.failed_today
              ? 'font-medium text-[var(--gm-muted)] line-through'
              : habit.completed_today
                ? 'font-bold text-[17px] text-[#0F1210]'
                : 'font-bold text-[17px] text-[var(--gm-ink)]'
          }`}>
            {habit.habit_name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {habit.failed_today && (
              <span className="text-xs text-red-400 font-medium">Failed today</span>
            )}
            {isGameMode ? (
              <span className={`text-xs ${habit.completed_today ? 'text-[#0F1210] font-bold' : 'text-[var(--gm-ink)] font-semibold'}`}>
                +{XP_FOR[habit.difficulty] || 0} XP <span className={`font-normal capitalize ${habit.completed_today ? 'text-[#0F1210]/70' : 'text-[var(--gm-muted)]'}`}>· {habit.difficulty}</span>
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

// v2 create-habit form primitives: JetBrains Mono eyebrow label + tactile
// segmented pills (cyan #D4F36B / ink #2B3A06 when selected) replacing the old
// native-style dropdowns.
function HabitFieldLabel({ children }) {
  return (
    <Label className="font-label text-[12px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)]">
      {children}
    </Label>
  );
}

function OptionPill({ selected, onClick, children, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`rounded-xl px-3 py-2 text-sm font-sans transition-all ${
        selected
          ? 'bg-[#D4F36B] text-[#2B3A06] font-bold'
          : 'bg-[color:var(--gm-bg)] text-[color:var(--gm-muted)] border border-[color:var(--gm-track)] hover:text-[color:var(--gm-ink)]'
      }`}
    >
      {children}
    </button>
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
            className="bg-[#D4F36B] text-[#2B3A06] hover:opacity-90 font-sans font-bold"
            data-testid="add-first-habit-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Habit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-[var(--gm-card)] border-[var(--gm-track)] text-[var(--gm-ink)] shadow-[var(--gm-shadow-card)] max-w-md" data-testid="add-habit-dialog">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold">Create New Habit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <HabitFieldLabel>Habit Name</HabitFieldLabel>
            <Input
              placeholder="e.g., Morning workout"
              value={formData.habit_name}
              onChange={(e) => setFormData({ ...formData, habit_name: e.target.value })}
              className="bg-[var(--gm-bg)] border-[var(--gm-track)] text-[var(--gm-ink)] focus-visible:ring-[#D4F36B]"
              data-testid="habit-name-input"
            />
          </div>

          <div className="space-y-2">
            <HabitFieldLabel>Time of Day</HabitFieldLabel>
            <div className="grid grid-cols-3 gap-2" data-testid="habit-time-select">
              {[['morning', 'Morning'], ['afternoon', 'Afternoon'], ['night', 'Night']].map(([v, l]) => (
                <OptionPill key={v} selected={formData.time_of_day === v} onClick={() => setFormData({ ...formData, time_of_day: v })} testid={`habit-time-${v}`}>
                  {l}
                </OptionPill>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <HabitFieldLabel>Difficulty</HabitFieldLabel>
            <div className="grid grid-cols-3 gap-2" data-testid="habit-difficulty-select">
              {[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']].map(([v, l]) => {
                const sel = formData.difficulty === v;
                // Focus Mode earns no XP — show the gem reward there instead.
                const reward = isGameMode ? `+${xpValues[v]} XP · +${gemValues[v]}g` : `+${gemValues[v]} gems`;
                return (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setFormData({ ...formData, difficulty: v })}
                    data-testid={`habit-difficulty-${v}`}
                    className={`rounded-xl px-2 py-3 text-center transition-all ${
                      sel ? 'bg-[#D4F36B]' : 'bg-[color:var(--gm-bg)] border border-[color:var(--gm-track)] hover:opacity-90'
                    }`}
                  >
                    <span className={`block text-sm font-sans font-bold ${sel ? 'text-[#2B3A06]' : 'text-[color:var(--gm-ink)]'}`}>{l}</span>
                    <span className={`block font-label text-[11px] mt-1 ${sel ? 'text-[#2B3A06]/80' : 'text-[color:var(--gm-muted)]'}`}>{reward}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <HabitFieldLabel>Repeat</HabitFieldLabel>
            <div className="grid grid-cols-3 gap-2" data-testid="habit-repeat-select">
              {[['daily', 'Daily'], ['weekdays', 'Weekdays'], ['weekends', 'Weekends']].map(([v, l]) => (
                <OptionPill key={v} selected={formData.repeat_schedule === v} onClick={() => setFormData({ ...formData, repeat_schedule: v })} testid={`habit-repeat-${v}`}>
                  {l}
                </OptionPill>
              ))}
            </div>
          </div>

          {/* Session Duration - Focus Mode only */}
          {!isGameMode && (
            <div className="space-y-2">
              <HabitFieldLabel>Session Duration</HabitFieldLabel>
              <div className="flex flex-wrap gap-2" data-testid="habit-duration-select">
                {[5, 10, 15, 20, 30, 45, 60].map(m => (
                  <OptionPill key={m} selected={formData.session_duration === m} onClick={() => setFormData({ ...formData, session_duration: m })} testid={`habit-duration-${m}`}>
                    {m} min
                  </OptionPill>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading || !formData.habit_name.trim()}
              className="w-full bg-[#D4F36B] text-[#2B3A06] hover:opacity-90 font-sans font-bold"
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


// Confetti tuned to read on the lime takeover background (dark ink, deep teal, cyan, olive)
const CONFETTI_COLORS_LEVEL = ['#0F1210', '#2B3A06', '#D4F36B', '#2B3A06'];

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
  const INK = '#0F1210';  // near-black text on the lime takeover
  const SOFT = '#2B3A06'; // deep olive for secondary text on lime

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#D4F36B' }}
      onClick={onDismiss} data-testid="level-up-celebration"
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative text-center px-8 z-10">
        {/* Eyebrow */}
        <motion.p
          initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="font-label text-xs sm:text-sm font-bold uppercase tracking-[0.35em] mb-1"
          style={{ color: INK }}
        >
          Level Up
        </motion.p>

        {/* Giant level number — black on lime */}
        <motion.div
          initial={{ scale: 0, rotate: -8 }} animate={{ scale: [0, 1.25, 1], rotate: 0 }}
          transition={{ duration: 0.7, times: [0, 0.6, 1], ease: 'easeOut' }}
          className="text-[8rem] sm:text-[11rem] font-black font-display leading-[0.85] tracking-[-0.04em]"
          style={{ color: INK, textShadow: '0 6px 0 rgba(15,18,16,0.12)' }}
          data-testid="level-number"
        >
          {data.level}
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-2xl sm:text-4xl font-black font-display uppercase tracking-[-0.01em] mt-3"
          style={{ color: INK }}
          data-testid="level-up-text"
        >
          Level {data.level} Unlocked
        </motion.h2>

        {/* Rank name */}
        <motion.p
          initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="font-sans text-lg sm:text-2xl font-semibold mt-1"
          style={{ color: SOFT }}
        >
          {data.level_name}
        </motion.p>

        {/* Reward — dark chip on lime */}
        {rewardGems > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.85, type: 'spring', stiffness: 300, damping: 18 }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full mt-7"
            style={{ backgroundColor: INK }}
            data-testid="level-reward"
          >
            <Gem className="w-4 h-4" style={{ color: '#D4F36B' }} />
            <span className="font-label text-sm font-bold uppercase tracking-[0.06em] text-white">+{rewardGems} Gems</span>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="font-label text-[13px] uppercase tracking-[0.15em] mt-8"
          style={{ color: SOFT, opacity: 0.7 }}
          data-testid="level-up-dismiss"
        >
          Tap anywhere to continue
        </motion.p>
      </div>
    </motion.div>
  );
}
