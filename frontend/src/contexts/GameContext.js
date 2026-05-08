import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useMode } from './ModeContext';
import axios from 'axios';

const GameContext = createContext(null);
const API = process.env.REACT_APP_BACKEND_URL + '/api';

export function GameProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { isGameMode } = useMode();
  
  const [gems, setGems] = useState(0);
  const [streakRevives, setStreakRevives] = useState(0);
  const [streakShields, setStreakShields] = useState(0);
  const [xpBoostUses, setXpBoostUses] = useState(0);
  const [xpTripleBoostUses, setXpTripleBoostUses] = useState(0);
  const [xpQuadBoostUses, setXpQuadBoostUses] = useState(0);
  const [xpPentaBoostUses, setXpPentaBoostUses] = useState(0);
  const [xpHexaBoostUses, setXpHexaBoostUses] = useState(0);
  const [currentRoast, setCurrentRoast] = useState(null);
  const [showRoast, setShowRoast] = useState(false);
  const [shopItems, setShopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGameStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await axios.get(`${API}/game/status`);
      setGems(data.gems || 0);
      setStreakRevives(data.streak_revives || 0);
      setStreakShields(data.streak_shields || 0);
      setXpBoostUses(data.xp_boost_uses || 0);
      setXpTripleBoostUses(data.xp_triple_boost_uses || 0);
      setXpQuadBoostUses(data.xp_quad_boost_uses || 0);
      if (data.roast && isGameMode) {
        setCurrentRoast({ text: data.roast, type: data.roast_type });
        setShowRoast(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isGameMode]);

  const fetchShopItems = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await axios.get(`${API}/game/shop`);
      setShopItems(data.items || []);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGameStatus();
      fetchShopItems();
    }
  }, [isAuthenticated, fetchGameStatus, fetchShopItems]);

  const dismissRoast = () => { setShowRoast(false); setCurrentRoast(null); };

  const buyItem = async (itemId) => {
    const { data } = await axios.post(`${API}/game/shop/buy/${itemId}`);
    setGems(data.gems_remaining);
    await fetchShopItems();
    return data;
  };

  const applyStreakRevive = async () => {
    const { data } = await axios.post(`${API}/game/use-streak-revive`);
    setStreakRevives(data.streak_revives_remaining);
    return data;
  };

  const fetchRoast = async (category = 'missed_habit') => {
    try {
      const { data } = await axios.get(`${API}/game/roast?category=${category}`);
      if (data.roast) {
        setCurrentRoast({ text: data.roast, type: category });
        setShowRoast(true);
      }
    } catch {
      // ignore
    }
  };

  return (
    <GameContext.Provider value={{
      gems, streakRevives, streakShields, xpBoostUses, xpTripleBoostUses, xpQuadBoostUses, xpPentaBoostUses, xpHexaBoostUses,
      currentRoast, showRoast, dismissRoast,
      fetchGameStatus, shopItems, buyItem, applyStreakRevive, fetchRoast,
      loading
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
