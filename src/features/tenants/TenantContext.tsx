import React, { createContext, useContext, useEffect, useState } from 'react';
import { TenantProfile, TenantMember, Permission, Role } from '../../types';
import { BUSINESS_TYPES, BusinessTypeMeta } from '../../utils/businessTypes';
import { fetchAllTenants, createTenant as createTenantService, ROLE_PERMISSIONS, seedSampleTenantsLocally } from '../../services/tenantService';
import { useAuth } from '../auth/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface TenantContextType {
  currentTenant: TenantProfile | null;
  tenantMember: TenantMember | null;
  allTenants: TenantProfile[];
  loading: boolean;
  businessMeta: BusinessTypeMeta;
  isWhiteLabel: boolean; // True if in client public booking view
  switchTenant: (tenantId: string) => void;
  hasPermission: (permission: Permission) => boolean;
  createNewTenant: (name: string, slug: string, businessType: any) => Promise<TenantProfile>;
  addTenantToContext: (tenant: TenantProfile) => void;
  removeTenantFromContext: (tenantId: string) => void;
  resetAllTenants: () => void;
  setCurrentTenant: (tenant: TenantProfile | null) => void;
  refreshTenantData: () => Promise<void>;
  setIsWhiteLabelView: (val: boolean) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isMerchant, storeId, isSuperAdmin } = useAuth();
  
  // Clean startup: starts empty or with saved merchants
  const initialTenants = seedSampleTenantsLocally();
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const rawPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/(b\/)?/, '').split('/')[0] : '';
  const reservedPaths = ['admin', 'login', 'dashboard', 'saas', 'super-admin', ''];
  const extractedSlug = rawPath && !reservedPaths.includes(rawPath) ? rawPath : '';
  const urlSlug = urlParams.get('tenant') || extractedSlug;
  const savedSelectedId = typeof window !== 'undefined' ? localStorage.getItem('glowfy_selected_tenant_id') : null;

  const findMatchingTenant = (list: TenantProfile[], slugOrId: string | null): TenantProfile | null => {
    if (!slugOrId) return null;
    const target = slugOrId.toLowerCase().trim();
    return list.find(t => 
      t.slug.toLowerCase() === target || 
      t.id.toLowerCase() === target ||
      (target.includes('navalha') && (t.slug.toLowerCase().includes('navalha') || t.id.toLowerCase().includes('navalha')))
    ) || null;
  };

  const initialSelected = (urlSlug ? findMatchingTenant(initialTenants, urlSlug) : null) || 
    (savedSelectedId ? findMatchingTenant(initialTenants, savedSelectedId) : null) || 
    initialTenants[0] || null;

  const [rawTenants, setRawTenants] = useState<TenantProfile[]>(initialTenants);
  const [currentTenant, setCurrentTenant] = useState<TenantProfile | null>(initialSelected);
  const [tenantMember, setTenantMember] = useState<TenantMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [isWhiteLabel, setIsWhiteLabel] = useState(false);

  // Sync selected tenant to localStorage
  useEffect(() => {
    if (currentTenant && typeof window !== 'undefined') {
      localStorage.setItem('glowfy_selected_tenant_id', currentTenant.id);
    }
  }, [currentTenant]);

  // Filter visible tenants based on role:
  // If merchant: STRICTLY lock and filter to their own storeId!
  const allTenants = isMerchant && storeId
    ? rawTenants.filter(t => t.id === storeId || t.slug === storeId)
    : rawTenants;

  // Background sync with Firestore
  const loadTenants = async () => {
    try {
      const tenants = await fetchAllTenants();
      setRawTenants(tenants);

      if (tenants && tenants.length > 0) {
        if (isMerchant && storeId) {
          const merchantStore = tenants.find(t => t.id === storeId || t.slug === storeId);
          if (merchantStore) {
            setCurrentTenant(merchantStore);
            return;
          }
        }
        
        let selected = urlSlug ? findMatchingTenant(tenants, urlSlug) : null;
        if (!selected && currentTenant) {
          selected = findMatchingTenant(tenants, currentTenant.id) || findMatchingTenant(tenants, currentTenant.slug);
        }
        if (!selected && savedSelectedId) {
          selected = findMatchingTenant(tenants, savedSelectedId);
        }
        setCurrentTenant(selected || tenants[0]);
      } else {
        setCurrentTenant(null);
      }
    } catch (err) {
      console.warn("Background tenant sync info:", err);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  // When merchant session changes or storeId locks in
  useEffect(() => {
    if (isMerchant && storeId && rawTenants.length > 0) {
      const merchantStore = rawTenants.find(t => t.id === storeId || t.slug === storeId);
      if (merchantStore) {
        setCurrentTenant(merchantStore);
      }
    }
  }, [isMerchant, storeId, rawTenants]);

  // Fetch membership whenever user or currentTenant changes
  useEffect(() => {
    const fetchMember = async () => {
      if (!user || !currentTenant) {
        // Fallback default owner/admin membership for demo mode
        setTenantMember({
          id: user?.uid || 'demo-owner-uid',
          tenantId: currentTenant?.id || 'vintage-blade',
          role: isSuperAdmin ? 'super_admin' : 'owner',
          permissions: ROLE_PERMISSIONS['owner'],
          name: user?.displayName || (isSuperAdmin ? 'Super Admin Geral' : 'Gerente / Proprietário'),
          email: user?.email || (isSuperAdmin ? 'interacaodigitall@gmail.com' : 'admin@glowfyhub.com'),
          joinedAt: new Date().toISOString(),
          active: true
        });
        return;
      }

      try {
        const memRef = doc(db, 'tenants', currentTenant.id, 'members', user.uid);
        const memSnap = await getDoc(memRef);
        if (memSnap.exists()) {
          setTenantMember({ id: memSnap.id, ...memSnap.data() } as TenantMember);
        } else {
          // Default owner for testing if user is logged in
          setTenantMember({
            id: user.uid,
            tenantId: currentTenant.id,
            role: isSuperAdmin ? 'super_admin' : 'owner',
            permissions: ROLE_PERMISSIONS['owner'],
            name: user.displayName || user.email || 'Proprietário',
            email: user.email || '',
            joinedAt: new Date().toISOString(),
            active: true
          });
        }
      } catch (e) {
        console.warn("Could not fetch membership, using owner fallback:", e);
        setTenantMember({
          id: user.uid,
          tenantId: currentTenant.id,
          role: isSuperAdmin ? 'super_admin' : 'owner',
          permissions: ROLE_PERMISSIONS['owner'],
          name: user.displayName || 'Proprietário',
          email: user.email || '',
          joinedAt: new Date().toISOString(),
          active: true
        });
      }
    };

    fetchMember();
  }, [user, currentTenant, isSuperAdmin]);

  const switchTenant = (tenantId: string) => {
    // If merchant, prohibit switching to other tenants
    if (isMerchant && storeId && tenantId !== storeId) {
      console.warn("Security notice: Merchant is restricted to their own storeId:", storeId);
      return;
    }
    const found = rawTenants.find(t => t.id === tenantId || t.slug === tenantId);
    if (found) {
      setCurrentTenant(found);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (isSuperAdmin) return true;
    if (!tenantMember) return false;
    if (tenantMember.role === 'super_admin' || tenantMember.role === 'owner') return true;
    return tenantMember.permissions.includes(permission);
  };

  const createNewTenant = async (name: string, slug: string, businessType: any) => {
    const newProfile = await createTenantService(
      name,
      slug,
      businessType,
      user?.uid || 'demo-owner-uid',
      user?.email || 'owner@glowfyhub.com',
      user?.displayName || 'Proprietário'
    );
    setRawTenants(prev => [...prev, newProfile]);
    setCurrentTenant(newProfile);
    return newProfile;
  };

  const refreshTenantData = async () => {
    await loadTenants();
  };

  const businessMeta = currentTenant 
    ? BUSINESS_TYPES[currentTenant.businessType] || BUSINESS_TYPES.other
    : BUSINESS_TYPES.barbershop;

  const addTenantToContext = (tenant: TenantProfile) => {
    setRawTenants(prev => {
      const exists = prev.some(t => t.id === tenant.id);
      return exists ? prev.map(t => t.id === tenant.id ? tenant : t) : [...prev, tenant];
    });
    if (!currentTenant) {
      setCurrentTenant(tenant);
    }
  };

  const removeTenantFromContext = (tenantId: string) => {
    setRawTenants(prev => {
      const updated = prev.filter(t => t.id !== tenantId && t.slug !== tenantId);
      if (currentTenant && (currentTenant.id === tenantId || currentTenant.slug === tenantId)) {
        setCurrentTenant(updated.length > 0 ? updated[0] : null);
      }
      return updated;
    });
  };

  const resetAllTenants = () => {
    setRawTenants([]);
    setCurrentTenant(null);
  };

  return (
    <TenantContext.Provider value={{
      currentTenant,
      tenantMember,
      allTenants,
      loading,
      businessMeta,
      isWhiteLabel,
      switchTenant,
      hasPermission,
      createNewTenant,
      addTenantToContext,
      removeTenantFromContext,
      resetAllTenants,
      setCurrentTenant,
      refreshTenantData,
      setIsWhiteLabelView: setIsWhiteLabel
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
