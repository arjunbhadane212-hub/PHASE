// Public profile — the shareable, screenshot-able flex page. Always free,
// always public (subject to users.is_public). Renders the same ProfileCard the
// Discord-style popout uses, so the two can never drift apart.

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ProfileCard from '../components/profile/ProfileCard';

export default function PublicProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data, error: rpcErr } = await supabase.rpc('get_public_profile', { p_username: username });
        if (rpcErr) throw rpcErr;
        if (active) setProfile(data);
      } catch (e) {
        if (active) setError(e?.message || 'Profile not found');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [username]);

  if (loading) return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-zinc-400 text-lg mb-4">{error || 'Profile not found'}</p>
        <Link to="/" className="text-blue-400 hover:underline">Go Home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06080F]" data-testid="public-profile-page">
      <div className="absolute top-4 left-4 z-20">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg" data-testid="profile-back-link">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
      <div className="max-w-2xl mx-auto">
        <ProfileCard profile={profile} variant="page" />
      </div>
    </div>
  );
}
