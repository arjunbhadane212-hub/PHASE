// Discord-style profile popout. Tapping a user anywhere (leaderboard rows today,
// friends list later) opens this over the current screen — no navigation, no
// losing your place. "Full profile" routes to the shareable page.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ProfileCard from './ProfileCard';

export function useProfilePopout() {
  const [username, setUsername] = useState(null);
  return {
    username,
    open: (u) => setUsername(u || null),
    close: () => setUsername(null),
    props: { username, onClose: () => setUsername(null) },
  };
}

export default function ProfilePopout({ username, onClose }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) { setProfile(null); setError(null); return; }
    let active = true;
    (async () => {
      setLoading(true); setError(null); setProfile(null);
      try {
        const { data, error: rpcErr } = await supabase.rpc('get_public_profile', { p_username: username });
        if (rpcErr) throw rpcErr;
        if (active) setProfile(data);
      } catch (e) {
        if (active) setError(e?.message || 'Profile unavailable');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [username]);

  // Esc to dismiss + lock body scroll while open.
  useEffect(() => {
    if (!username) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [username, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {username && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          data-testid="profile-popout"
        >
          <div className="absolute inset-0" style={{ background: 'rgba(4,6,12,0.78)', backdropFilter: 'blur(10px)' }} />

          <motion.div
            className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            style={{ background: '#06080F', border: '1px solid #182038', boxShadow: '0 24px 80px -20px rgba(0,0,0,0.9)' }}
            initial={{ y: 40, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
              data-testid="popout-close"
              aria-label="Close profile"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {loading && (
              <div className="h-64 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && error && (
              <div className="h-48 flex items-center justify-center px-6 text-center">
                <p className="text-sm text-zinc-400">{error}</p>
              </div>
            )}

            {!loading && profile && (
              <ProfileCard
                profile={profile}
                variant="popout"
                onViewFull={() => { onClose?.(); navigate(`/profile/${profile.username}`); }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
