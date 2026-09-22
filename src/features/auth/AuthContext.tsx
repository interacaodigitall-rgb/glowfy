import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider, SUPER_ADMIN_EMAIL } from '../../config/firebase';

export type UserRole = 'superadmin' | 'merchant' | 'client';

export interface MerchantSession {
  email: string;
  name: string;
  tenantId: string;
  role: 'owner' | 'manager' | 'staff';
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isMerchant: boolean;
  storeId: string | null;
  activeMerchantSession: MerchantSession | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loginAsSuperAdmin: (password?: string) => boolean;
  loginAsMerchant: (email: string, password?: string, tenantId?: string) => boolean;
  demoSignIn: (email: string, roleName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Stored session states
  const [masterAdminLoggedIn, setMasterAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('glowfy_master_admin_session') === 'true';
  });
  
  const [activeMerchantSession, setActiveMerchantSession] = useState<MerchantSession | null>(() => {
    const saved = localStorage.getItem('glowfy_merchant_session');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email === SUPER_ADMIN_EMAIL) {
        setMasterAdminLoggedIn(true);
        localStorage.setItem('glowfy_master_admin_session', 'true');
        setActiveMerchantSession(null);
        localStorage.removeItem('glowfy_merchant_session');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check if someone has an active authenticated session
  const isAuthenticated = masterAdminLoggedIn || !!activeMerchantSession || !!user;

  // Compute active role & permissions
  let role: UserRole = 'client';
  if (masterAdminLoggedIn || (!!user && (user.email === SUPER_ADMIN_EMAIL || user.email === 'admin@glowfyhub.com'))) {
    role = 'superadmin';
  } else if (activeMerchantSession) {
    role = 'merchant';
  } else if (user) {
    role = 'merchant';
  }

  const isSuperAdmin = isAuthenticated && role === 'superadmin';
  const isMerchant = isAuthenticated && role === 'merchant';
  const storeId = isMerchant && activeMerchantSession 
    ? activeMerchantSession.tenantId 
    : (user ? (typeof window !== 'undefined' ? localStorage.getItem('glowfy_selected_tenant_id') : null) || 'mister-navalha' : null);

  const signInWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user.email === SUPER_ADMIN_EMAIL) {
        setMasterAdminLoggedIn(true);
        setActiveMerchantSession(null);
        localStorage.setItem('glowfy_master_admin_session', 'true');
        localStorage.removeItem('glowfy_merchant_session');
      } else {
        // Logged in as standard user
        setMasterAdminLoggedIn(false);
        localStorage.removeItem('glowfy_master_admin_session');
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  const loginAsSuperAdmin = (password?: string): boolean => {
    if (!password || password.toLowerCase() === 'glowfy2026' || password.toLowerCase() === 'admin123' || password === 'master') {
      setMasterAdminLoggedIn(true);
      setActiveMerchantSession(null);
      localStorage.setItem('glowfy_master_admin_session', 'true');
      localStorage.removeItem('glowfy_merchant_session');
      return true;
    }
    return false;
  };

  const loginAsMerchant = (email: string, _password?: string, tenantId?: string): boolean => {
    const chosenTenantId = tenantId || 'mister-navalha';
    const session: MerchantSession = {
      email,
      name: email.split('@')[0],
      tenantId: chosenTenantId,
      role: 'owner'
    };
    setMasterAdminLoggedIn(false);
    localStorage.removeItem('glowfy_master_admin_session');
    setActiveMerchantSession(session);
    localStorage.setItem('glowfy_merchant_session', JSON.stringify(session));
    return true;
  };

  const signOut = async () => {
    try {
      setMasterAdminLoggedIn(false);
      setActiveMerchantSession(null);
      localStorage.removeItem('glowfy_master_admin_session');
      localStorage.removeItem('glowfy_merchant_session');
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  const demoSignIn = (email: string, _roleName: string) => {
    if (email === SUPER_ADMIN_EMAIL) {
      loginAsSuperAdmin();
    } else {
      loginAsMerchant(email);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      role,
      isAuthenticated,
      isSuperAdmin,
      isMerchant,
      storeId,
      activeMerchantSession,
      signInWithGoogle, 
      signOut, 
      loginAsSuperAdmin,
      loginAsMerchant,
      demoSignIn 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
