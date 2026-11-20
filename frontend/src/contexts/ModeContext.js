import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [mode, setMode] = useState('focus'); // 'focus' or 'game'

  // Derive mode strictly from the CURRENT user. The old version only wrote mode
  // when `user.app_mode` was truthy, so after one user signed out and another
  // signed in — in the same SPA session, no reload — the previous account's
  // mode stuck around (and a user whose profile had no app_mode inherited it).
  // That was a cross-account state leak on shared devices. Now a sign-out or a
  // user with no saved mode always falls back to the 'focus' default instead of
  // keeping whatever the last account was in.
  useEffect(() => {
    if (user && typeof user === 'object') {
      setMode(user.app_mode || 'focus');
    } else if (user === false || user === 'banned') {
      setMode('focus');
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
    // UI v3: the full-screen "Game/Focus Mode" moment plays ONLY on a real switch.
    window.dispatchEvent(new CustomEvent('phase:mode-switched', { detail: newMode }));
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
