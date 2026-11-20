import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ArrowRight } from '../components/icons';
import AuthShell, { AuthTitle, AuthField, AuthError, PrimaryButton, LoginPanel } from '../components/auth/AuthShell';
import GoogleButton from '../components/auth/GoogleButton';
import { showAuthSplash } from '../components/auth/AuthSplashHost';
import { friendlyAuthError, checkEmail, checkPassword } from '../lib/authErrors';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);       // { title, detail } banner
  const [fieldErr, setFieldErr] = useState({});    // { email, password } — string or true (highlight only)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    // Catch the obvious mistakes here, with a specific message per field.
    const emailMsg = checkEmail(email);
    const pwMsg = checkPassword(password);
    if (emailMsg || pwMsg) {
      setFieldErr({ email: emailMsg, password: pwMsg });
      return;
    }
    setFieldErr({});
    setLoading(true);

    try {
      const user = await login(email, password);
      // UI v3: success screen overlays the app while the destination loads.
      const to = user?.onboarding_completed ? '/dashboard' : '/onboarding';
      showAuthSplash({
        title: "You're in",
        subtitle: user?.first_name ? `Welcome back, ${user.first_name}.` : 'Welcome back.',
        note: to === '/onboarding' ? 'Finishing your setup…' : 'Taking you to your habits…',
      });
      // replace: so you can't Back into the login form once you're in.
      navigate(to, { replace: true });
    } catch (e) {
      const f = friendlyAuthError(e, 'login');
      setError({ title: f.title, detail: f.detail });
      setFieldErr({
        email: f.field === 'email' || f.field === 'both' ? true : '',
        password: f.field === 'password' || f.field === 'both' ? true : '',
      });
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
        <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--gm-muted)] font-label">or email</span>
        <div className="flex-1 h-px bg-[var(--gm-track)]" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5" data-testid="login-form">
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(v) => { setEmail(v); setFieldErr((p) => ({ ...p, email: '' })); }}
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          error={fieldErr.email}
          testId="login-email-input"
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(v) => { setPassword(v); setFieldErr((p) => ({ ...p, password: '' })); }}
          placeholder="Your password"
          autoComplete="current-password"
          error={fieldErr.password}
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
        <Link to="/signup" className="font-bold text-[var(--gm-ink)] underline underline-offset-4 decoration-[#D4F36B] decoration-2" data-testid="login-signup-link">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
