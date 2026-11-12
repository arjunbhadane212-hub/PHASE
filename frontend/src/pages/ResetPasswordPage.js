import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from '../components/icons';
import AuthShell, { AuthTitle, AuthField, AuthError, PrimaryButton, LoginPanel } from '../components/auth/AuthShell';
import { supabase } from '../lib/supabaseClient';

// Password reset, step 2. The emailed link signs the user in with a short-lived
// recovery session (supabase-js picks it up from the URL); we then set the new
// password with auth.updateUser. (This used to call the retired FastAPI
// backend and could never succeed.)
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let done = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) { done = true; setReady(true); }
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) { done = true; setReady(true); } });
    const hashErr = /error_description=([^&]+)/.exec(window.location.hash || window.location.search);
    if (hashErr) setExpired(true);
    const t = setTimeout(() => { if (!done) setExpired(true); }, 4000);
    return () => { clearTimeout(t); subscription.unsubscribe(); };
  }, []);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords don’t match.'); return; }
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      toast.success('Password updated');
      navigate('/dashboard', { replace: true });
    } catch (e2) {
      setError(e2?.message || 'Could not update the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell panel={<LoginPanel />}>
      {!ready && expired ? (
        <div data-testid="reset-expired">
          <AuthTitle title="Link expired" sub="Reset links work once and expire after an hour. Ask for a new one." />
          <PrimaryButton type="button" onClick={() => navigate('/forgot-password')}>Send a new link</PrimaryButton>
        </div>
      ) : !ready ? (
        <div className="flex items-center gap-3 text-[var(--gm-muted)]"><Loader2 className="w-5 h-5 animate-spin" /> Checking your link…</div>
      ) : (
        <>
          <AuthTitle title="New password" sub="Pick something you haven't used before." testId="reset-title" />
          <AuthError testId="reset-error">{error}</AuthError>
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="reset-form">
            <AuthField id="password" label="New password" type="password" value={password} onChange={setPassword}
              autoComplete="new-password" autoFocus error={tooShort ? 'At least 8 characters' : ''} testId="reset-password-input" />
            <AuthField id="confirm" label="Confirm password" type="password" value={confirm} onChange={setConfirm}
              autoComplete="new-password" error={mismatch ? 'Doesn’t match' : ''} testId="reset-confirm-input" />
            <PrimaryButton type="submit" disabled={loading} data-testid="reset-submit">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save password'}
            </PrimaryButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}
