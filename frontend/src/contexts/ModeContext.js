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

  // Inject equipped user colors as CSS custom properties for Game Mode
  useEffect(() => {
    if (user && mode === 'game') {
      const accent = user.selected_main_color && user.selected_main_color !== '#1F2937'
        ? user.selected_main_color
        : '#3B82F6';
      const banner = user.selected_banner_color || '#1F2937';
      document.documentElement.style.setProperty('--user-accent', accent);
      document.documentElement.style.setProperty('--user-banner', banner);
    } else {
      document.documentElement.style.setProperty('--user-accent', '#3B82F6');
      document.documentElement.style.setProperty('--user-banner', '#1F2937');
    }
  }, [user, mode]);

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
