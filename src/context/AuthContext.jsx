import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getCurrentSession,
  getCurrentUser,
  loginWithEmailPassword,
  logout as logoutService,
  registerWithEmailPassword,
} from '../services/authService.js';
import { getBusinessProfile } from '../services/profileService.js';
import { isMissingSessionError, mapAuthError } from '../utils/authErrors.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState('');

  const refreshProfile = useCallback(async (userId = user?.$id) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const nextProfile = await getBusinessProfile(userId);
    setProfile(nextProfile);
    return nextProfile;
  }, [user?.$id]);

  const refreshUser = useCallback(async () => {
    setError('');
    const currentUser = await getCurrentUser();
    const currentSession = currentUser ? await getCurrentSession() : null;

    setUser(currentUser);
    setSession(currentSession);
    setProfile(currentUser ? await getBusinessProfile(currentUser.$id) : null);

    return currentUser;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      setLoading(true);
      setError('');

      try {
        const currentUser = await getCurrentUser();

        if (!isMounted) return;

        if (!currentUser) {
          setUser(null);
          setProfile(null);
          setSession(null);
          return;
        }

        const [currentSession, currentProfile] = await Promise.all([
          getCurrentSession(),
          getBusinessProfile(currentUser.$id),
        ]);

        if (!isMounted) return;

        setUser(currentUser);
        setSession(currentSession);
        setProfile(currentProfile);
      } catch (caughtError) {
        if (!isMounted) return;

        if (isMissingSessionError(caughtError)) {
          setUser(null);
          setProfile(null);
          setSession(null);
        } else {
          setError(mapAuthError(caughtError));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setAuthReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setError('');

    try {
      const result = await loginWithEmailPassword(email, password);
      setUser(result.user);
      setSession(result.session);
      setProfile(result.profile);
      return result;
    } catch (caughtError) {
      const friendlyMessage = mapAuthError(caughtError);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    } finally {
      setAuthReady(true);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setError('');

    try {
      const result = await registerWithEmailPassword(payload);
      setUser(result.user);
      setSession(result.session);
      setProfile(result.profile);
      return result;
    } catch (caughtError) {
      const friendlyMessage = mapAuthError(caughtError);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    } finally {
      setAuthReady(true);
    }
  }, []);

  const logout = useCallback(async () => {
    setError('');

    try {
      await logoutService();
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setAuthReady(true);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading,
      authReady,
      error,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      refreshProfile,
      clearError: () => setError(''),
    }),
    [
      authReady,
      error,
      loading,
      login,
      logout,
      profile,
      refreshProfile,
      refreshUser,
      register,
      session,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
