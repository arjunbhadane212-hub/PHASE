import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMode } from '../contexts/ModeContext';
import { Home, BarChart3, Trophy, ShoppingBag, Settings, User, Award } from 'lucide-react';
import ProfilePanel from './MyProfilePage';

const allNavItems = [
  { to: '/dashboard', icon: Home, label: 'Home', end: true, modes: ['focus', 'game'] },
  { to: '/dashboard/progress', icon: BarChart3, label: 'Progress', modes: ['focus', 'game'] },
  { to: '/dashboard/leaderboard', icon: Award, label: 'Ranks', modes: ['game'] },
  { to: '/dashboard/level', icon: Trophy, label: 'Level', modes: ['game'] },
  { to: '/dashboard/shop', icon: ShoppingBag, label: 'Shop', modes: ['game'] },
  { to: '/dashboard/focus-shop', icon: ShoppingBag, label: 'Shop', modes: ['focus'] },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings', modes: ['focus', 'game'] },
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
      className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg transition-all duration-200 relative ${
        isActive
          ? isGameMode ? 'text-blue-400' : 'text-white'
          : 'text-zinc-600'
      }`}
      data-testid={`nav-${item.label.toLowerCase()}`}
      style={{ pointerEvents: 'auto' }}
    >
      <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
      <span className="text-[9px] font-medium">{item.label}</span>
      {isActive && (
        <div className={`absolute -bottom-0.5 w-5 h-0.5 rounded-full ${
          isGameMode ? 'bg-blue-500/60' : 'bg-white/40'
        }`} />
      )}
    </button>
  );
}

export default function DashboardLayout() {
  const { isGameMode } = useMode();
  const [profileOpen, setProfileOpen] = useState(false);
  const currentMode = isGameMode ? 'game' : 'focus';
  const navItems = allNavItems.filter(item => item.modes.includes(currentMode));

  return (
    <div className={`min-h-screen ${isGameMode ? 'mode-game' : 'mode-focus'}`} style={{ backgroundColor: 'var(--color-bg)' }} data-testid="dashboard-layout">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 gap-1 glass-nav border-r border-white/[0.06] z-50" data-testid="desktop-sidebar">
        {/* Profile button at top */}
        <button
          onClick={() => setProfileOpen(true)}
          className="w-16 py-3 rounded-xl transition-all duration-200 flex flex-col items-center gap-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] mb-2"
          data-testid="nav-desktop-profile"
        >
          <User className="w-5 h-5" strokeWidth={1.8} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `
              group flex flex-col items-center gap-1.5 w-16 py-3 rounded-xl transition-all duration-200
              ${isActive
                ? isGameMode
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-white bg-white/[0.06]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }
            `}
            data-testid={`nav-desktop-${item.label.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </aside>

      {/* Main content */}
      <main className="md:ml-20 pb-32 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[9999]" data-testid="mobile-nav" style={{ pointerEvents: 'none' }}>
        <div className="mx-2 mb-8 glass-nav rounded-2xl border border-white/[0.06]" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-stretch justify-around h-14 px-1">
            {/* Profile button in mobile nav */}
            <button
              onClick={() => setProfileOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg text-zinc-600"
              data-testid="nav-profile"
              style={{ pointerEvents: 'auto' }}
            >
              <User className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Profile</span>
            </button>
            {navItems.map((item) => (
              <MobileNavItem key={item.to} item={item} isGameMode={isGameMode} />
            ))}
          </div>
        </div>
      </nav>

      {/* Profile side panel */}
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
