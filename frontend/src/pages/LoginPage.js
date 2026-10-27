import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell, { AuthTitle, AuthField, AuthError, PrimaryButton, LoginPanel } from '../components/auth/AuthShell';
import GoogleButton from '../components/auth/GoogleButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success('Welcome back!');

      if (!user.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (e) {
      setError(e?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell panel={<LoginPanel />}>
      <AuthTitle title="Log in" sub="Pick up your streak where you left it." testId="login-title" />

      <AuthError testId="login-error">{error}</AuthError>

      <GoogleButton label="Continue with Google" testId="login-google-btn" />

      <div className="flex items-center gap-3 my-6" aria-hidden="true">
        <div className="flex-1 h-px bg-[var(--gm-track)]" />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--gm-muted)] font-['JetBrains_Mono']">or email</span>
        <div className="flex-1 h-px bg-[var(--gm-track)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          testId="login-email-input"
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          autoComplete="current-password"
          testId="login-password-input"
          aside={
            <Link
              to="/forgot-password"
              className="text-xs font-bold text-[var(--gm-muted)] hover:text-[var(--gm-ink)]"
              data-testid="login-forgot-link"
            >
              Forgot?
            </Link>
          }
        />

        <PrimaryButton type="submit" disabled={loading} className="!mt-8" data-testid="login-submit-btn">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Log in <ArrowRight className="w-4 h-4" /></>}
        </PrimaryButton>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-[var(--gm-muted)]">
        New to Phase?{' '}
        <Link to="/signup" className="font-bold text-[var(--gm-ink)] underline underline-offset-4 decoration-[#95DEE6] decoration-2" data-testid="login-signup-link">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
