import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [mode, setMode] = useState('focus'); // 'focus' or 'game'

  useEffect(() => {
    if (user && user.app_mode) {
      setMode(user.app_mode);
    }
  }, [user]);

  // Apply mode class to document
  useEffect(() => {
    document.documentElement.classList.remove('mode-focus', 'mode-game');
    document.documentElement.classList.add(`mode-${mode}`);
  }, [mode]);

  // The equipped-colour CSS injection that used to live here is gone (Oct
  // 2026). It set --user-accent/--user-banner, which nothing consumed, and
  // defaulted --user-accent to the retired brand blue. Profile colours are
  // retired and the profile is neutral, so there is nothing to inject.

  const switchMode = async () => {
    if (!user?.id) return mode;
    const newMode = mode === 'game' ? 'focus' : 'game';
    const { error } = await supabase
      .from('users')
      .update({ app_mode: newMode })
      .eq('id', user.id);
    if (error) {
      console.error('Failed to switch mode', error);
      throw error;
    }
    setMode(newMode);            // reflect immediately, no refresh needed
    updateUser({ app_mode: newMode });
    return newMode;
  };

  const isGameMode = mode === 'game';
  const isFocusMode = mode === 'focus';

  return (
    <ModeContext.Provider value={{ 
      mode, 
      setMode,
      switchMode,
      isGameMode, 
      isFocusMode 
    }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
