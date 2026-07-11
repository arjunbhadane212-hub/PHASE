import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

// NOTE: FastAPI-shaped error helper, still used by the password-reset and
// settings flows that have not yet been migrated off the old backend.
// Supabase auth errors (login/signup) are surfaced directly via e.message.
export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

function mergeAuthUser(authUser, profile) {
  if (!authUser) return false;
  return {
    id: authUser.id,
    email: authUser.email,
    ...profile,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = not auth, object = auth
  const [loading, setLoading] = useState(true);
  const hasChecked = useRef(false);

  const loadUser = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(false);
      return false;
    }
    let merged;
    try {
      const profile = await fetchProfile(authUser.id);
      merged = mergeAuthUser(authUser, profile);
    } catch {
      merged = mergeAuthUser(authUser, null);
    }
    setUser(merged);
    return merged;
  }, []);

  const checkAuth = useCallback(async () => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const { data: { session } } = await supabase.auth.getSession();
    await loadUser(session?.user ?? null);
    setLoading(false);
  }, [loadUser]);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [checkAuth, loadUser]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return loadUser(data.user);
  };

  const register = async (firstName, lastName, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) throw error;
    if (data.user) return loadUser(data.user);
    return false;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(false);
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUser(false);
      return null;
    }
    const profile = await fetchProfile(session.user.id).catch(() => null);
    const merged = mergeAuthUser(session.user, profile);
    setUser(merged);
    return merged;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      refreshUser,
      isAuthenticated: !!user && user !== false
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
