import { useState, useEffect, useRef } from 'react';
import { NavLink, useOutlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { SPRING } from '../lib/motion';
import { toast } from 'sonner';
import { useMode } from '../contexts/ModeContext';
import { useAuth } from '../contexts/AuthContext';
import { HomeIcon, ProgressIcon, LevelIcon, CrownIcon, ShopIcon, SettingsIcon, UserIcon } from '../components/icons';
import ProfilePanel from './MyProfilePage';
import PeriodResultModal from '../components/PeriodResultModal';
import ErrorBoundary from '../components/ErrorBoundary';

const allNavItems = [
  { to: '/dashboard', icon: HomeIcon, label: 'Home', end: true, modes: ['focus', 'game'] },
  { to: '/dashboard/progress', icon: ProgressIcon, label: 'Progress', modes: ['focus', 'game'] },
  { to: '/dashboard/level', icon: LevelIcon, label: 'Level', modes: ['game'] },
  { to: '/dashboard/leaderboard', icon: CrownIcon, label: 'League', modes: ['game'] },
  { to: '/dashboard/shop', icon: ShopIcon, label: 'Shop', modes: ['game'] },
  { to: '/dashboard/focus-shop', icon: ShopIcon, label: 'Shop', modes: ['focus'] },
  { to: '/dashboard/settings', icon: SettingsIcon, label: 'Settings', modes: ['focus', 'game'] },
];

function MobileNavItem({ item, isGameMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = item.end 
    ? location.pathname === item.to 
    : location.pathname.startsWith(item.to);
  const Icon = item.icon;
  
  return (
    <button
      onClick={() => navigate(item.to)}
      aria-label={item.label}
      className={`ph-nav-item relative w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-500 ${isActive ? 'is-on' : ''}`}
      data-testid={`nav-${item.label.toLowerCase()}`}
      data-mode={isGameMode ? 'game' : 'focus'}
      style={{ pointerEvents: 'auto' }}
    >
      {isActive && <motion.span layoutId="ph-nav-disc" className="absolute inset-0 rounded-full bg-[var(--gm-ink)]" transition={SPRING} />}
      <Icon className="relative w-[22px] h-[22px]" variant={isActive ? "solid" : "outline"} />
    </button>
  );
}

export default function DashboardLayout() {
  const { isGameMode } = useMode();
  const { refreshUser } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profileOpen, setProfileOpen] = useState(false);
  const proHandled = useRef(false);

  // Back from Stripe Checkout (?pro=success | ?pro=cancelled). The webhook that
  // flips users.is_pro can land a moment after the redirect, so poll the
  // profile briefly instead of assuming it already has. A cancelled checkout
  // charged nothing and needs no message.
  const proReturn = searchParams.get('pro');
  useEffect(() => {
    if (!proReturn || proHandled.current) return;
    proHandled.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete('pro');
    setSearchParams(next, { replace: true });
    if (proReturn !== 'success') return;
    (async () => {
      const id = toast.loading('Activating Phase Pro...');
      for (let i = 0; i < 12; i++) {
        const u = await refreshUser().catch(() => null);
        if (u?.is_pro) { toast.success('Welcome to Phase Pro.', { id }); return; }
        await new Promise((r) => setTimeout(r, 1500));
      }
      toast.info('Payment received. Pro will switch on in a moment.', { id });
    })();
  }, [proReturn]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentMode = isGameMode ? 'game' : 'focus';
  const navItems = allNavItems.filter(item => item.modes.includes(currentMode));
  // UI v3: switching Game <-> Focus plays a full-screen wipe so the mode change is felt.
  const [modeFlash, setModeFlash] = useState(null);
  useEffect(() => {
    let t;
    const onSwitch = (e) => {
      setModeFlash(e.detail);
      clearTimeout(t);
      t = setTimeout(() => setModeFlash(null), 1300);
    };
    window.addEventListener('phase:mode-switched', onSwitch);
    return () => { window.removeEventListener('phase:mode-switched', onSwitch); clearTimeout(t); };
  }, []);

  // UI v3: slide pages left/right in nav order, so a tab to the right glides in from the right.
  const outlet = useOutlet();
  const navIndex = navItems.findIndex((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));
  const prevIndex = useRef(navIndex);
  const navDir = navIndex === prevIndex.current || navIndex < 0 || prevIndex.current < 0 ? 0 : (navIndex > prevIndex.current ? 1 : -1);
  useEffect(() => { prevIndex.current = navIndex; }, [navIndex]);

  return (
    <MotionConfig reducedMotion="user">
    <div className={`min-h-screen ${isGameMode ? 'mode-game' : 'mode-focus'}`} style={{ backgroundColor: 'var(--color-bg)' }} data-testid="dashboard-layout">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 gap-1 ph-nav z-50" data-testid="desktop-sidebar">
        {/* Profile button at top — Game Mode only (Focus Mode has no cosmetic
            profile: no titles/banners/effects to customize). */}
        {isGameMode && (
          <button
            onClick={() => setProfileOpen(true)}
            className="ph-nav-item w-16 py-3 rounded-2xl transition-all duration-200 flex flex-col items-center gap-1.5 mb-2"
            data-testid="nav-desktop-profile"
          >
            <UserIcon className="w-5 h-5" strokeWidth={2} />
            <span className="text-[12px] font-medium">Profile</span>
          </button>
        )}

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `
              ph-nav-item relative group flex flex-col items-center gap-1.5 w-16 py-3 rounded-2xl transition-colors duration-500
              ${isActive ? 'is-on' : ''}
            `}
            data-testid={`nav-desktop-${item.label.toLowerCase()}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="ph-rail-pill" className="absolute inset-0 rounded-2xl bg-[var(--gm-ink)]" transition={SPRING} />}
                <item.icon className="relative w-5 h-5" variant={isActive ? 'solid' : 'outline'} />
                <span className="relative text-[12px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </aside>

      {/* Main content */}
      <main className="md:ml-20 pb-32 md:pb-0 min-h-screen">
        <ErrorBoundary resetKey={location.pathname}>
          {/* UI v3: instant swap + a tiny 14px glide (no exit wait = no delay) */}
          <motion.div key={location.pathname}
            initial={{ opacity: 0, x: navDir * 14, y: navDir === 0 ? 8 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            {outlet}
          </motion.div>
        </ErrorBoundary>
      </main>

      {/* Mobile bottom nav — lab: floating ink pill, white active disc */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[9999] flex justify-center" data-testid="mobile-nav" style={{ pointerEvents: 'none' }}>
        <div className="ph-nav mb-6 rounded-full p-1.5 flex items-center gap-1 shadow-[var(--gm-shadow-nav)]" style={{ pointerEvents: 'auto' }}>
          {isGameMode && (
            <button
              onClick={() => setProfileOpen(true)}
              aria-label="Profile"
              className="ph-nav-item w-11 h-11 rounded-full flex items-center justify-center"
              data-testid="nav-profile"
              style={{ pointerEvents: 'auto' }}
            >
              <UserIcon className="w-[22px] h-[22px]" />
            </button>
          )}
          {navItems.map((item) => (
            <MobileNavItem key={item.to} item={item} isGameMode={isGameMode} />
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {modeFlash && (
          <motion.div key={modeFlash} className="fixed inset-0 z-[10040] flex flex-col items-center justify-center pointer-events-none"
            style={{ background: modeFlash === 'game' ? '#D4F36B' : '#9DD3F7', color: modeFlash === 'game' ? '#2B3A06' : '#0B2E45' }}
            initial={{ clipPath: 'circle(0% at 50% 100%)' }} animate={{ clipPath: 'circle(150% at 50% 100%)' }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <motion.p className="font-display text-[44px] leading-none" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
              {modeFlash === 'game' ? 'Game Mode' : 'Focus Mode'}
            </motion.p>
            <motion.p className="text-[17px] font-semibold mt-3 opacity-75" initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} transition={{ delay: 0.45 }}>
              {modeFlash === 'game' ? 'XP, ranks and the league are on.' : 'Deep work. No XP, no noise.'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile side panel */}
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* End-of-period league result (shows once per closed period, game mode) */}
      <PeriodResultModal />
    </div>
    </MotionConfig>
  );
}
