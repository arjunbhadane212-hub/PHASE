import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import TierEmblem from '../components/TierEmblem';
import LeagueLadder from '../components/LeagueLadder';
import LeagueView from '../components/league/LeagueView';
import ProfilePopout, { useProfilePopout } from '../components/profile/ProfilePopout';
import { tierInfo } from '../data/leaderboardTiers';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { isGameMode } = useMode();
  const popout = useProfilePopout();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isGameMode) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data: res, error: rpcErr } = await supabase.rpc('get_leaderboard');
        if (rpcErr) throw rpcErr;
        if (active) setData(res);
      } catch (e) {
        if (active) setError(e?.message || 'Could not load the leaderboard');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isGameMode]);

  const tier = useMemo(() => tierInfo(data?.tier ?? user?.leaderboard_tier ?? 1), [data, user]);

  // Focus mode: the league is a Game Mode feature.
  if (!isGameMode) {
    return (
      <Shell>
        <div className="text-center pt-24 px-6">
          <p className="text-lg font-display font-extrabold text-[color:var(--gm-ink)] mb-1">The League is a Game Mode feature</p>
          <p className="text-sm text-[color:var(--gm-muted)]">Switch to Game Mode to compete in weekly leagues.</p>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#D4F36B] border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="text-center pt-24 px-6"><p className="text-[color:var(--gm-muted)]">{error}</p></div>
      </Shell>
    );
  }

  if (!data || data.status === 'not_in_league') {
    return (
      <Shell>
        <div className="text-center pt-16 px-6" data-testid="leaderboard-empty">
          <div className="mx-auto mb-5" style={{ width: 104 }}>
            <TierEmblem tier={user?.leaderboard_tier ?? 1} size={104} />
          </div>
          <p className="text-lg font-display font-extrabold text-[color:var(--gm-ink)] mb-1">Your league starts soon</p>
          <p className="text-sm text-[color:var(--gm-muted)] max-w-xs mx-auto mb-6">
            Complete a few habits and you'll be placed in a {tier.key} group with others. Keep earning XP to climb.
          </p>
          <LeagueLadder current={user?.leaderboard_tier ?? 1} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ProfilePopout {...popout.props} />
      <LeagueView data={data} user={user} onOpenProfile={popout.open} />
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen pb-28 md:pb-10 bg-[color:var(--gm-bg)]" data-testid="leaderboard-page">
      <div className="max-w-xl mx-auto px-4 pt-5">{children}</div>
    </div>
  );
}
