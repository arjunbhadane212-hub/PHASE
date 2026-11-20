import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ModeProvider } from "./contexts/ModeContext";
import { GameProvider } from "./contexts/GameContext";
import { Toaster } from "./components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthSplashHost from "./components/auth/AuthSplashHost";
import { isInstalledApp } from "./utils/platform";
import { hasSeenOnboarding } from "./utils/onboardingFlag";
import { resolveRootRoute, ROUTE_LANDING } from "./utils/appEntry";

// Pages — lazy-loaded so each screen's JS downloads on demand instead of
// shipping the whole app (every page, chart lib, onboarding, landing) in one
// bundle before first paint. The <Suspense> fallback below is the same spinner
// the route guards already use, so a chunk load is indistinguishable from the
// auth check that often precedes it.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const DashboardLayout = lazy(() => import("./pages/DashboardLayout"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const LevelPage = lazy(() => import("./pages/LevelPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const FocusShopPage = lazy(() => import("./pages/FocusShopPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const DevBoxOpeningPage = lazy(() => import("./pages/DevBoxOpeningPage"));
const DevIconsPage = lazy(() => import("./pages/DevIconsPage"));
const DevLeaguePage = lazy(() => import("./pages/DevLeaguePage"));
const DevShopPage = lazy(() => import("./pages/DevShopPage"));
const PrivacyPage = lazy(() => import("./pages/LegalPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/LegalPage").then((m) => ({ default: m.TermsPage })));
const HelpPage = lazy(() => import("./pages/LegalPage").then((m) => ({ default: m.HelpPage })));

// Always-mounted notification shells. They render null until an event fires,
// and they pull in framer-motion — so loading them lazily (fallback null)
// keeps framer-motion out of the initial bundle without any visible delay.
const RoastNotification = lazy(() => import("./components/RoastNotification"));
const RoastListener = lazy(() => import("./components/RoastNotification").then((m) => ({ default: m.RoastListener })));
const TitleUnlockListener = lazy(() => import("./components/profile/TitleUnlockToast").then((m) => ({ default: m.TitleUnlockListener })));

// Shown when the admin dashboard has banned this account. The account was
// already signed out server-side (see AuthContext.loadUser); this just
// explains why instead of silently bouncing to the login form.
function SuspendedScreen() {
  return (
    <div className="min-h-screen bg-[var(--gm-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 rounded-2xl bg-[var(--gm-card)] text-center">
        <h1 className="text-lg font-black text-[var(--gm-ink)] font-display mb-2">Account suspended</h1>
        <p className="text-sm text-[var(--gm-muted)] mb-6">This account has been suspended. If you think this is a mistake, contact support.</p>
        <a href="/login" className="inline-block w-full py-2.5 rounded-full bg-[#D4F36B] text-[#2B3A06] text-sm font-bold">
          Back to login
        </a>
      </div>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gm-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4F36B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (user === 'banned') {
    return <SuspendedScreen />;
  }

  if (!user || user === false) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed
  if (!user.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
}

// Auth Route - redirect if already logged in
function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gm-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4F36B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (user === 'banned') {
    return <SuspendedScreen />;
  }

  if (user && user !== false) {
    if (!user.onboarding_completed) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

// Onboarding Route
function OnboardingRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gm-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4F36B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (user === 'banned') {
    return <SuspendedScreen />;
  }

  if (!user || user === false) {
    return <Navigate to="/login" replace />;
  }

  if (user.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

// The app entry point, shared by "/" (the public URL) and "/app" (the installed
// app's manifest start_url). It decides — before first paint — between the
// marketing landing page, the app home, the pre-auth install intro, and the
// login/signup screen. The decision itself is the pure resolveRootRoute() so it
// can be unit tested; this component just resolves the live booleans and renders.
//
// The landing page is only ever shown to signed-out browser visitors. Once
// you're in a session it is out of bounds (a Back press onto "/" bounces into
// the app instead of dumping you on marketing), and the installed app never
// shows it at all — which also means no landing flash before redirecting, since
// start_url is "/app" and installed launches never render LandingPage.
function RootEntry() {
  const { user, loading } = useAuth();

  // Don't decide (or flash anything) while the session is still resolving.
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gm-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4F36B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const route = resolveRootRoute({
    isInstalled: isInstalledApp(),
    isLoggedIn: !!user && user !== false && user !== 'banned',
    hasSeenIntro: hasSeenOnboarding(),
  });

  if (route === ROUTE_LANDING) return <LandingPage />;
  // replace: so this redirect never leaves an entry to get stuck on with Back.
  return <Navigate to={route} replace />;
}

// The pre-auth install intro at "/welcome". Signed-in users never need it, so
// bounce them into the app; the loading spinner keeps it from flashing first.
function WelcomeRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gm-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4F36B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user && user !== false && user !== 'banned') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Shared fallback while a lazy route chunk loads — matches the route guards'
// spinner so a chunk fetch looks like the auth check, not a blank flash.
function RouteFallback() {
  return (
    <div className="min-h-screen bg-[var(--gm-bg)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#D4F36B] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function AppRoutes() {
  // UI v3: every top-level screen change (landing → login → success → app)
  // cross-fades/slides instead of cutting. Inside /dashboard, DashboardLayout
  // runs its own direction-aware page transition.
  const location = useLocation();
  const topKey = location.pathname.startsWith('/dashboard') ? '/dashboard' : location.pathname;
  return (
    <div key={topKey} className="route-fade">
    <Suspense fallback={<RouteFallback />}>
    <Routes location={location}>
      {/* Entry point. "/" may show the marketing landing; "/app" is the
          installed app's manifest start_url and never does. Both share the
          same decision. */}
      <Route path="/" element={<RootEntry />} />
      <Route path="/app" element={<RootEntry />} />

      {/* Pre-auth install intro (first launch of the installed app) */}
      <Route path="/welcome" element={<WelcomeRoute><WelcomePage /></WelcomeRoute>} />

      {/* Auth routes */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Onboarding */}
      <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />
      
      {/* Admin */}
      <Route path="/admin" element={<AdminPage />} />

      {/* Box-opening preview with fake pulls (no auth, no gems) */}
      {process.env.NODE_ENV !== "production" && (
        <Route path="/dev/box-opening" element={<DevBoxOpeningPage />} />
      )}
      {process.env.NODE_ENV !== "production" && (
        <Route path="/dev/icons" element={<DevIconsPage />} />
      )}
      {process.env.NODE_ENV !== "production" && (
        <Route path="/dev/league" element={<DevLeaguePage />} />
      )}
      {process.env.NODE_ENV !== "production" && (
        <Route path="/dev/shop" element={<DevShopPage />} />
      )}

      {/* Legal + help (linked from signup and Settings; required by the app stores) */}
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/faq" element={<HelpPage />} />
      
      {/* Protected Dashboard routes */}
      <Route path="/profile/:username" element={<PublicProfilePage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="level" element={<LevelPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="focus-shop" element={<FocusShopPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </div>
  );
}

function App() {
  // Restore light mode preference on load
  useEffect(() => {
    if (localStorage.getItem('lightMode') !== 'false') {
      document.documentElement.classList.add('light-mode');
    }
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ModeProvider>
            <GameProvider>
              <AppRoutes />
              <AuthSplashHost />
              <Toaster position="top-right" />
              <Suspense fallback={null}>
                <RoastNotification />
                <RoastListener />
                <TitleUnlockListener />
              </Suspense>
            </GameProvider>
          </ModeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
