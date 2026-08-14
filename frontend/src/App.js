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
import DashboardLayout from "./pages/DashboardLayout";
import HomePage from "./pages/HomePage";
import LevelPage from "./pages/LevelPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";
import ShopPage from "./pages/ShopPage";
import FocusShopPage from "./pages/FocusShopPage";
import MyProfilePage from "./pages/MyProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import AdminPage from "./pages/AdminPage";
import RoastNotification, { RoastListener } from "./components/RoastNotification";

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

// Platform detection: skip landing page for installed PWA / standalone apps
function LandingOrRedirect() {
  const isStandalone = window.navigator?.standalone === true
    || window.matchMedia?.('(display-mode: standalone)')?.matches;

  if (isStandalone) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LandingPage />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes - PWA standalone skips landing */}
      <Route path="/" element={<LandingOrRedirect />} />
      
      {/* Auth routes */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Onboarding */}
      <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />
      
      {/* Admin */}
      <Route path="/admin" element={<AdminPage />} />
      
      {/* Protected Dashboard routes */}
      <Route path="/profile/:username" element={<PublicProfilePage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
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
              <Toaster position="top-right" richColors />
              <RoastNotification />
              <RoastListener />
            </GameProvider>
          </ModeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
