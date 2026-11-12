import { Brain, Rocket, Gamepad2, Target, Lock, BarChart3, Trophy, MessageSquare, Flame, Eye, Gem, Heart, Sparkles, Clock, Calendar, RotateCcw, TrendingDown, ShieldAlert } from '../icons';

export const eyebrow = "font-['JetBrains_Mono'] font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.08em]";

// Each question does a job, in this order:
//   1. main_goal            name the pain       -> picks the starter habits
//   2. consistency_level    name the pattern    -> `fix` = what Phase does about it
//   3. main_outcome         picture the win     -> read back to them on the plan
//   4. accountability_style pick the fuel       -> decides which Pro feature leads
// Option ids are persisted to `users` (and read by the admin dashboard): keep
// them short, lowercase and stable across copy changes.
export const QUESTIONS = [
  {
    id: 'main_goal',
    prompt: 'What are you tired of putting off?',
    sub: 'Pick the one that stings a little.',
    options: [
      { id: 'health', icon: Heart, label: 'My health', desc: 'Training, sleep, moving my body again' },
      { id: 'focus', icon: Target, label: 'My focus', desc: 'Real work, done without my phone winning' },
      { id: 'mind', icon: Brain, label: 'My head', desc: 'Calmer, sharper, kinder to myself' },
      { id: 'discipline', icon: Lock, label: 'My discipline', desc: 'Proving I can finish what I start' },
      { id: 'levelup', icon: Rocket, label: 'Honestly, all of it', desc: "I'm done living on default" },
    ],
  },
  {
    id: 'consistency_level',
    prompt: 'When has the wall usually hit you?',
    sub: 'Be honest. The honest answer is where Phase starts.',
    options: [
      { id: 'fire', icon: Flame, label: "It doesn't", desc: 'I show up. I just want to push harder.', fix: 'Longer sessions and streak goals that take months to earn.' },
      { id: 'month', icon: Calendar, label: 'Around a month in', desc: 'Started hot. Life took over.', fix: 'New things to chase every few weeks, so it never goes stale.' },
      { id: 'week', icon: TrendingDown, label: 'End of week two', desc: "The novelty wears off and I'm out.", fix: 'Streak Shields and quick daily wins to carry you through the dip.' },
      { id: 'week1', icon: Clock, label: 'Inside the first week', desc: 'I quit before it starts to hurt.', fix: 'Tiny starting habits, so day one takes under two minutes.' },
      { id: 'never_started', icon: RotateCcw, label: 'I never really start', desc: 'Starting is the whole problem.', fix: 'One habit, set up for you in the next minute.' },
    ],
  },
  {
    id: 'main_outcome',
    prompt: '6 months from now, what would mean this worked?',
    sub: 'What do you want to be able to say?',
    options: [
      { id: 'proof', icon: BarChart3, label: '"I kept the streak."', desc: '100+ days without missing' },
      { id: 'transformed', icon: Sparkles, label: '"I actually changed."', desc: 'Fitter, calmer, sharper' },
      { id: 'identity', icon: Trophy, label: '"I\'m that person now."', desc: 'The one who shows up' },
      { id: 'finished', icon: Rocket, label: '"I finished what I started."', desc: "The thing I've been putting off" },
      { id: 'nothing_hard', icon: ShieldAlert, label: '"Nothing feels hard anymore."', desc: 'This is just who I am now' },
    ],
  },
  {
    id: 'accountability_style',
    prompt: 'What would make you not quit this time?',
    sub: 'Phase leans on whichever one works for you.',
    options: [
      { id: 'progress', icon: BarChart3, label: 'Seeing it actually work', desc: 'Numbers climbing, every week', fix: 'Progress charts that show you improving.' },
      { id: 'competition', icon: Trophy, label: 'Someone just ahead of me', desc: 'A chase keeps me moving', fix: 'A weekly league with people at your level.' },
      { id: 'rewards', icon: Gem, label: 'Something to earn', desc: 'Pay me in wins', fix: 'Gems, loot boxes and titles you earn by showing up.' },
      { id: 'stakes', icon: ShieldAlert, label: 'Real stakes', desc: 'Make it hurt a little when I slip', fix: 'Streak Shields, and consequences for quitting early.' },
      { id: 'callout', icon: MessageSquare, label: 'Being called out', desc: "Don't let me get away with it", fix: 'Reminders that call you out, and a profile that shows your record.' },
    ],
  },
];

export const MODES = [
  {
    id: 'game',
    icon: Gamepad2,
    label: 'Game Mode',
    tagline: 'Level up your life.',
    points: ['XP, gems and 15 ranks', 'Weekly league against real people', 'Loot boxes, titles, roasts'],
  },
  {
    id: 'focus',
    icon: Eye,
    label: 'Focus Mode',
    tagline: 'Less noise. Pure progress.',
    points: ['Tap Begin, a timer takes over', 'No XP, no leaderboards', 'Quit early and it costs you'],
  },
];

export const XP = { easy: 10, medium: 25, hard: 50 };
export const GEMS = { easy: 5, medium: 10, hard: 20 };

// Starter habits per goal. The first three are pre-selected. `mins` is the
// Focus Mode session length (5-60); Game Mode ignores it.
export const HABITS = {
  health: [
    { name: 'Drink a glass of water first thing', slot: 'morning', difficulty: 'easy', mins: 5 },
    { name: '20 minute workout', slot: 'morning', difficulty: 'medium', mins: 20 },
    { name: 'In bed by 11pm', slot: 'night', difficulty: 'medium', mins: 10 },
    { name: 'Walk 8,000 steps', slot: 'afternoon', difficulty: 'medium', mins: 30 },
    { name: 'Stretch for 10 minutes', slot: 'night', difficulty: 'easy', mins: 10 },
    { name: 'Morning run', slot: 'morning', difficulty: 'hard', mins: 30 },
  ],
  focus: [
    { name: '50 minutes of deep work', slot: 'morning', difficulty: 'hard', mins: 50 },
    { name: 'Phone away for the first hour', slot: 'morning', difficulty: 'medium', mins: 15 },
    { name: "Plan tomorrow's top 3", slot: 'night', difficulty: 'easy', mins: 5 },
    { name: '25 minute study sprint', slot: 'afternoon', difficulty: 'medium', mins: 25 },
    { name: 'Read 10 pages', slot: 'night', difficulty: 'easy', mins: 15 },
    { name: 'Clear the inbox', slot: 'afternoon', difficulty: 'easy', mins: 15 },
  ],
  mind: [
    { name: 'Meditate for 10 minutes', slot: 'morning', difficulty: 'easy', mins: 10 },
    { name: 'Journal for 5 minutes', slot: 'night', difficulty: 'easy', mins: 5 },
    { name: 'No phone in bed', slot: 'night', difficulty: 'medium', mins: 10 },
    { name: 'Go outside for 15 minutes', slot: 'afternoon', difficulty: 'easy', mins: 15 },
    { name: 'Write down 3 things you are grateful for', slot: 'night', difficulty: 'easy', mins: 5 },
    { name: 'Read 10 pages', slot: 'night', difficulty: 'easy', mins: 15 },
  ],
  discipline: [
    { name: 'Make your bed', slot: 'morning', difficulty: 'easy', mins: 5 },
    { name: 'Wake up at 6:30', slot: 'morning', difficulty: 'hard', mins: 5 },
    { name: 'Do the thing you are avoiding', slot: 'afternoon', difficulty: 'medium', mins: 25 },
    { name: 'Cold shower', slot: 'morning', difficulty: 'hard', mins: 5 },
    { name: 'No sugar after dinner', slot: 'night', difficulty: 'medium', mins: 5 },
    { name: "Plan tomorrow's top 3", slot: 'night', difficulty: 'easy', mins: 5 },
  ],
  levelup: [
    { name: 'Drink a glass of water first thing', slot: 'morning', difficulty: 'easy', mins: 5 },
    { name: '20 minute workout', slot: 'morning', difficulty: 'medium', mins: 20 },
    { name: 'Read 10 pages', slot: 'night', difficulty: 'easy', mins: 15 },
    { name: '50 minutes of deep work', slot: 'morning', difficulty: 'hard', mins: 50 },
    { name: 'Meditate for 10 minutes', slot: 'morning', difficulty: 'easy', mins: 10 },
    { name: "Plan tomorrow's top 3", slot: 'night', difficulty: 'easy', mins: 5 },
  ],
};

export const SLOT_LABEL = { morning: 'Morning', afternoon: 'Afternoon', night: 'Night' };

// What Pro adds, per the product spec (CLAUDE.md -> Monetization). `fuel` ties
// a feature to the answer on question 4 so the one they asked for leads.
export const PRO_FEATURES = [
  { id: 'analytics', label: 'Detailed analytics and heatmap', fuel: 'progress', lead: 'Weekly and monthly charts, plus a heatmap of every day you showed up.' },
  { id: 'league', label: 'Full weekly league standings', fuel: 'competition', lead: 'See exactly where you rank, not a blurred list.' },
  { id: 'rewards', label: 'Loot boxes and the full shop', fuel: 'rewards', lead: 'Open boxes and spend gems on titles, banners and effects.' },
  { id: 'shields', label: 'Streak Shields', fuel: 'stakes', lead: 'A safety net that catches your streak when life happens.' },
  { id: 'titles', label: 'Equip titles, banners and profile effects', fuel: 'callout', lead: 'Put your record on a profile people can see.' },
  { id: 'ranks', label: 'All 15 levels, up to Eternal' },
];

export const labelFor = (qid, answerId) =>
  QUESTIONS.find((q) => q.id === qid)?.options.find((o) => o.id === answerId)?.label ?? null;

export const optionFor = (qid, answerId) =>
  QUESTIONS.find((q) => q.id === qid)?.options.find((o) => o.id === answerId) ?? null;
