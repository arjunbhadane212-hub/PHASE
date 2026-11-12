import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from '../components/icons';
import AuthShell, { AuthTitle, AuthField, AuthError, PrimaryButton, LoginPanel } from '../components/auth/AuthShell';
import { supabase } from '../lib/supabaseClient';

// Password reset, step 1. Supabase Auth emails a one-time link that lands on
// /reset-password with a recovery session. (This page used to POST to the
// retired FastAPI backend, so reset emails were never sent.)
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err && !/not found|no user/i.test(err.message)) throw err;
      // Same answer whether or not the address has an account (no account probing).
      setSent(true);
    } catch (e2) {
      setError(/rate limit/i.test(e2?.message || '') ? 'Too many requests. Wait a minute and try again.' : (e2?.message || 'Could not send the email. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell panel={<LoginPanel />}>
      {sent ? (
        <div data-testid="forgot-sent">
          <AuthTitle title="Check your email" sub={`If ${email} has a Phase account, a reset link is on its way. It expires in an hour.`} />
          <p className="text-sm text-[var(--gm-muted)]">Nothing after a few minutes? Check spam, or <button type="button" onClick={() => setSent(false)} className="text-[var(--gm-ink)] font-bold underline underline-offset-2">try again</button>.</p>
          <Link to="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--gm-ink)]"><ArrowLeft className="w-4 h-4" /> Back to log in</Link>
        </div>
      ) : (
        <>
          <AuthTitle title="Reset password" sub="Enter your email and we'll send you a link." testId="forgot-title" />
          <AuthError testId="forgot-error">{error}</AuthError>
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="forgot-form">
            <AuthField id="email" label="Email" type="email" value={email} onChange={setEmail}
              placeholder="you@example.com" autoComplete="email" autoFocus testId="forgot-email-input" />
            <PrimaryButton type="submit" disabled={loading || !email.trim()} data-testid="forgot-submit">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send reset link'}
            </PrimaryButton>
          </form>
          <Link to="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--gm-muted)] hover:text-[var(--gm-ink)]"><ArrowLeft className="w-4 h-4" /> Back to log in</Link>
        </>
      )}
    </AuthShell>
  );
}
