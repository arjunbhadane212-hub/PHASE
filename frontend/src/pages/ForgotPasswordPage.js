import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from '../components/icons';
import BackButton from '../components/BackButton';
import AuthShell, { AuthTitle, AuthField, AuthError, PrimaryButton, LoginPanel } from '../components/auth/AuthShell';
import { friendlyAuthError, checkEmail } from '../lib/authErrors';
import { supabase } from '../lib/supabaseClient';

// Password reset, step 1. Supabase Auth emails a one-time link that lands on
// /reset-password with a recovery session. (This page used to POST to the
// retired FastAPI backend, so reset emails were never sent.)
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [emailErr, setEmailErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailMsg = checkEmail(email);
    setEmailErr(emailMsg);
    if (emailMsg) return;
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err && !/not found|no user/i.test(err.message)) throw err;
      // Same answer whether or not the address has an account (no account probing).
      setSent(true);
    } catch (e2) {
      const f = friendlyAuthError(e2, 'forgot');
      setError({ title: f.title, detail: f.detail });
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
          <div className="mt-8"><BackButton to="/login" label="Back to log in" /></div>
        </div>
      ) : (
        <>
          <AuthTitle title="Reset password" sub="Enter your email and we'll send you a link." testId="forgot-title" />
          <AuthError testId="forgot-error">{error}</AuthError>
          <form onSubmit={handleSubmit} noValidate className="space-y-5" data-testid="forgot-form">
            <AuthField id="email" label="Email" type="email" value={email} onChange={(v) => { setEmail(v); setEmailErr(''); }}
              placeholder="you@example.com" autoComplete="email" autoFocus error={emailErr} testId="forgot-email-input" />
            <PrimaryButton type="submit" disabled={loading} data-testid="forgot-submit">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send reset link'}
            </PrimaryButton>
          </form>
          <div className="mt-8"><BackButton to="/login" label="Back to log in" /></div>
        </>
      )}
    </AuthShell>
  );
}
