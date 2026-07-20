import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const GameContext = createContext(null);

// Step 1 (Supabase migration): currency — gems + streak revives/shields — now
// comes straight from the Supabase `users` profile held in AuthContext. No more
// calls to the dead FastAPI backend from this provider. Post-mutation refresh
// flows through refreshUser().
//
// Deferred to their own later steps (intentionally NOT wired here yet):
//  - Boost counts (xp*BoostUses) — boosts step (map to boost_inventory jsonb).
//  - shopItems / buying — Step 2/3 (shop_items + purchase_shop_item RPC).
//  - Roasts (fetchRoast) — roast step (check_roast RPC).
export function GameProvider({ children }) {
  const { user, refreshUser } = useAuth();

  // Currency — single source of truth is the Supabase profile.
  const gems = user?.gems ?? 0;
  const streakRevives = user?.streak_revives ?? 0;
  const streakShields = user?.streak_shields ?? 0;

  // Boosts: not migrated yet. Exposed as 0 so consumers keep building unchanged.
  const xpBoostUses = 0;
  const xpTripleBoostUses = 0;
  const xpQuadBoostUses = 0;
  const xpPentaBoostUses = 0;
  const xpHexaBoostUses = 0;

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
      xpBoostUses, xpTripleBoostUses, xpQuadBoostUses, xpPentaBoostUses, xpHexaBoostUses,
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
