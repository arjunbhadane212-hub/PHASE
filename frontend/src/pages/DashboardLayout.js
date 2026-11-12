import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
      className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative ${
        isActive
          ? isGameMode
            ? 'py-2 px-4 rounded-[14px] text-[#A59BCC] bg-[#A59BCC]/10'
            : 'py-2 px-4 rounded-[14px] text-[var(--gm-ink)] bg-[var(--gm-card)]'
          : 'py-1.5 px-3 rounded-lg text-[var(--gm-muted)]'
      }`}
      data-testid={`nav-${item.label.toLowerCase()}`}
      style={{ pointerEvents: 'auto' }}
    >
      <Icon className="w-5 h-5" strokeWidth={2} />
      <span className="text-[9px] font-medium">{item.label}</span>
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

  return (
    <div className={`min-h-screen ${isGameMode ? 'mode-game' : 'mode-focus'}`} style={{ backgroundColor: 'var(--color-bg)' }} data-testid="dashboard-layout">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 gap-1 glass-nav border-r border-[var(--gm-track)] shadow-[var(--gm-shadow-nav)] z-50" data-testid="desktop-sidebar">
        {/* Profile button at top — Game Mode only (Focus Mode has no cosmetic
            profile: no titles/banners/effects to customize). */}
        {isGameMode && (
          <button
            onClick={() => setProfileOpen(true)}
            className="w-16 py-3 rounded-xl transition-all duration-200 flex flex-col items-center gap-1.5 text-[var(--gm-muted)] hover:text-[var(--gm-ink)] hover:bg-[var(--gm-card)] mb-2"
            data-testid="nav-desktop-profile"
          >
            <UserIcon className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        )}

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `
              group flex flex-col items-center gap-1.5 w-16 py-3 rounded-xl transition-all duration-200
              ${isActive
                ? isGameMode
                  ? 'text-[#A59BCC] bg-[#A59BCC]/10'
                  : 'text-[var(--gm-ink)] bg-[var(--gm-card)]'
                : 'text-[var(--gm-muted)] hover:text-[var(--gm-ink)] hover:bg-[var(--gm-card)]'
              }
            `}
            data-testid={`nav-desktop-${item.label.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </aside>

      {/* Main content */}
      <main className="md:ml-20 pb-32 md:pb-0 min-h-screen">
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[9999]" data-testid="mobile-nav" style={{ pointerEvents: 'none' }}>
        <div className="mx-2 mb-8 glass-nav rounded-2xl border border-[var(--gm-track)] shadow-[var(--gm-shadow-nav)]" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-stretch justify-around h-14 px-1">
            {/* Profile button in mobile nav — Game Mode only */}
            {isGameMode && (
              <button
                onClick={() => setProfileOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg text-[var(--gm-muted)]"
                data-testid="nav-profile"
                style={{ pointerEvents: 'auto' }}
              >
                <UserIcon className="w-5 h-5" strokeWidth={2} />
                <span className="text-[9px] font-medium">Profile</span>
              </button>
            )}
            {navItems.map((item) => (
              <MobileNavItem key={item.to} item={item} isGameMode={isGameMode} />
            ))}
          </div>
        </div>
      </nav>

      {/* Profile side panel */}
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* End-of-period league result (shows once per closed period, game mode) */}
      <PeriodResultModal />
    </div>
  );
}
