import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const GameContext = createContext(null);

// Step 1 (Supabase migration): currency — gems + streak revives/shields — now
// comes straight from the Supabase `users` profile held in AuthContext. No more
// calls to the dead FastAPI backend from this provider. Post-mutation refresh
// flows through refreshUser().
//
// Deferred to their own later steps (intentionally NOT wired here yet):
//  - XP boost — LIVE (Step 6): active_boost_multiplier/expires_at on the profile.
//  - shopItems / buying — Step 2/3 (shop_items + purchase_shop_item RPC).
//  - Roasts (fetchRoast) — roast step (check_roast RPC).
export function GameProvider({ children }) {
  const { user, refreshUser } = useAuth();

  // Currency — single source of truth is the Supabase profile.
  const gems = user?.gems ?? 0;
  const streakRevives = user?.streak_revives ?? 0;
  const streakShields = user?.streak_shields ?? 0;

  // XP boost (Step 6): duration-based active boost lives on the Supabase profile
  // (active_boost_multiplier + active_boost_expires_at — written by buy_xp_boost,
  // read by complete_habit). Expose the *effective* active state: 1x / null when
  // none or expired, so consumers don't re-check expiry.
  const boostExpired = !user?.active_boost_expires_at
    || new Date(user.active_boost_expires_at) <= new Date();
  const activeBoostMultiplier = boostExpired ? 1 : (user?.active_boost_multiplier ?? 1);
  const activeBoostExpiresAt = boostExpired ? null : user.active_boost_expires_at;

  // Roast UI state — wired to the check_roast RPC in a later step.
  const [currentRoast, setCurrentRoast] = useState(null);
  const [showRoast, setShowRoast] = useState(false);
  const dismissRoast = () => { setShowRoast(false); setCurrentRoast(null); };

  // Kept name for existing callers (ShopPage / FocusShopPage / HomePage). Now
  // just re-reads the Supabase profile so gem/streak counters reflect new totals.
  const fetchGameStatus = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  // Placeholder until the roast step — no dead-backend call.
  const fetchRoast = useCallback(() => {}, []);

  return (
    <GameContext.Provider value={{
      gems, streakRevives, streakShields,
      activeBoostMultiplier, activeBoostExpiresAt,
      currentRoast, showRoast, dismissRoast,
      fetchGameStatus, fetchRoast,
      shopItems: [],
      loading: false,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
