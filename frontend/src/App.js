import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ModeProvider } from "./contexts/ModeContext";
import { GameProvider } from "./contexts/GameContext";
import { Toaster } from "./components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import WelcomePage from "./pages/WelcomePage";
import DashboardLayout from "./pages/DashboardLayout";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import LevelPage from "./pages/LevelPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";
import ShopPage from "./pages/ShopPage";
import FocusShopPage from "./pages/FocusShopPage";
import MyProfilePage from "./pages/MyProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import AdminPage from "./pages/AdminPage";
import DevBoxOpeningPage from "./pages/DevBoxOpeningPage";
import { PrivacyPage, TermsPage, HelpPage } from "./pages/LegalPage";
import RoastNotification, { RoastListener } from "./components/RoastNotification";
import { TitleUnlockListener } from "./components/profile/TitleUnlockToast";
import { isInstalledApp } from "./utils/platform";
import { hasSeenOnboarding } from "./utils/onboardingFlag";
import { resolveRootRoute, ROUTE_LANDING } from "./utils/appEntry";

// Shown when the admin dashboard has banned this account. The account was
// already signed out server-side (see AuthContext.loadUser); this just
// explains why instead of silently bouncing to the login form.
function SuspendedScreen() {
  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 rounded-2xl bg-[#0C1220] border border-red-900/50 text-center">
        <h1 className="text-lg font-bold text-white font-['Satoshi'] mb-2">Account Suspended</h1>
        <p className="text-sm text-zinc-400 mb-6">This account has been suspended. If you think this is a mistake, contact support.</p>
        <a href="/login" className="inline-block w-full py-2 rounded-lg bg-[#1B6AE4] hover:bg-[#1B6AE4]/90 text-white text-sm font-medium">
          Back to Login
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
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
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
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
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
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
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
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
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
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user && user !== false && user !== 'banned') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
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
  );
}

function App() {
  // Restore light mode preference on load
  useEffect(() => {
    if (localStorage.getItem('lightMode') === 'true') {
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
              <Toaster position="top-right" />
              <RoastNotification />
              <RoastListener />
              <TitleUnlockListener />
            </GameProvider>
          </ModeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
