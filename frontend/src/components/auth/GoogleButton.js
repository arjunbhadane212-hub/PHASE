import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// Full Google "G" mark (official colours). Lives inside a dark-ink pill so it
// contrasts the cyan primary button without competing with it visually.
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.5 6.9 29 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c9.9 0 18.4-7.1 19-16.5.1-.8.1-1.5 0-2z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.5 6.9 29 5 24 5 16.3 5 9.6 9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43c5 0 9.5-1.9 12.9-5l-6-5.1C29 34.4 26.6 35 24 35c-5.3 0-9.8-2.7-11.3-7l-6.6 5.1C9.5 39 16.3 43 24 43z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2-2.1 3.7-3.8 4.9l6 5.1C40.9 34.8 43 29.8 43 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// "Continue with Google" — one of two primary entry points on each auth
// screen, next to the email form. Shown both on Log in and Sign up because
// Supabase treats a first-time OAuth hit as a signup automatically.
export default function GoogleButton({ label, testId }) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // The browser is being redirected; keep the spinner.
    } catch (e) {
      setLoading(false);
      toast.error(e?.message || 'Could not reach Google. Try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="w-full h-[52px] rounded-full bg-[var(--gm-card)] text-[var(--gm-ink)] text-[15px] font-bold border-2 border-transparent hover:border-[var(--gm-track)] active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      data-testid={testId}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <>
          <GoogleG />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
