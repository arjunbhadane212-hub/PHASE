// The Profile PAGE — a full dashboard section (like Home), game mode's
// dedicated home for your identity. Two halves:
//   1. a live PREVIEW of your public card (exactly what other people see), and
//   2. the single CUSTOMIZE hub — equip titles / effects / animations / banners.
//
// The slide-in Profile panel (MyProfilePage) still exists for quick edits from
// anywhere; this page is the full version. Both render the same <Inventory>, so
// there is still only one equip implementation.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import ProfileCard from '../components/profile/ProfileCard';
import Inventory from '../components/Inventory';

const SECTION_LABEL = "font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--gm-muted)]";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refetch the preview whenever the equipped loadout changes — Inventory calls
  // refreshUser() on equip, which updates these fields, so the card stays live.
  const fetchProfile = useCallback(async () => {
    if (!user?.username) { setLoading(false); return; }
    try {
      const { data } = await supabase.rpc('get_public_profile', { p_username: user.username });
      setProfile(data || null);
    } catch { setProfile(null); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username, user?.equipped_title, user?.equipped_banner, user?.equipped_animation, user?.equipped_decoration]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-28 md:pb-8" data-testid="profile-page">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl sm:text-2xl font-['Archivo'] font-black text-[color:var(--gm-ink)] tracking-[-0.01em]">Profile</h1>
          {user?.username && (
            <Link to={`/profile/${user.username}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-['General_Sans'] font-semibold text-[color:var(--gm-muted)] hover:text-[color:var(--gm-ink)] transition-colors"
              data-testid="profile-page-public-link">
              <ExternalLink className="w-3.5 h-3.5" /> View as public
            </Link>
          )}
        </div>

        {/* PREVIEW — how others see you */}
        <p className={`${SECTION_LABEL} mb-2`}>Preview</p>
        <div className="rounded-3xl overflow-hidden bg-[color:var(--gm-card)] shadow-[var(--gm-shadow-card)] mb-8" data-testid="profile-page-preview">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-7 h-7 border-2 border-[#95DEE6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profile ? (
            <ProfileCard profile={profile} variant="page" />
          ) : (
            <div className="h-48 flex items-center justify-center px-6 text-center">
              <p className="text-sm text-[color:var(--gm-muted)]">Your public profile isn't available yet. Complete onboarding to set it up.</p>
            </div>
          )}
        </div>

        {/* CUSTOMIZE — the single equip hub */}
        <p className={`${SECTION_LABEL} mb-3`}>Customize</p>
        <Inventory onNavigate={() => {}} />
      </div>
    </div>
  );
}
