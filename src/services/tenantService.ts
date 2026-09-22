import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db, safeFirestoreWrite, safeFirestoreRead } from '../config/firebase';
import { TenantProfile, TenantMember, BusinessType, Permission, Role } from '../types';
import { BUSINESS_TYPES } from '../utils/businessTypes';
import { handleFirestoreError, OperationType } from './firebaseError';
import { cloudDbList, cloudDbSet, cloudDbUpdate, normalizeTenantId } from './cloudDb';

// Default permissions matrix per role
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    'appointments.read', 'appointments.write', 'appointments.delete',
    'sales.create', 'sales.read', 'cash.open', 'cash.close',
    'inventory.manage', 'services.manage', 'members.manage',
    'reports.read', 'settings.update'
  ],
  owner: [
    'appointments.read', 'appointments.write', 'appointments.delete',
    'sales.create', 'sales.read', 'cash.open', 'cash.close',
    'inventory.manage', 'services.manage', 'members.manage',
    'reports.read', 'settings.update'
  ],
  manager: [
    'appointments.read', 'appointments.write', 'appointments.delete',
    'sales.create', 'sales.read', 'cash.open', 'cash.close',
    'inventory.manage', 'services.manage',
    'reports.read'
  ],
  receptionist: [
    'appointments.read', 'appointments.write',
    'sales.create', 'sales.read', 'cash.open', 'cash.close'
  ],
  professional: [
    'appointments.read', 'appointments.write'
  ],
  client: [
    'appointments.read'
  ]
};

// Default sample tenants data with diverse business types (Barbearia, Nails, Salão, Estética)
const DEMO_TENANTS: Omit<TenantProfile, 'id'>[] = [
  {
    name: 'Mr. Navalha',
    slug: 'mr-navalha',
    businessType: 'barbershop',
    logoUrl: 'https://i.postimg.cc/h4YbXjCk/MISTER-VETOR-removebg-preview.png',
    primaryColor: '#e5a93b', // Gold / Amber
    secondaryColor: '#0f172a',
    phone: '+351 912 345 678',
    email: 'contacto@misternavalha.pt',
    address: 'Rua Dr. Francisco dos Prazeres 2',
    city: 'Guarda',
    zipCode: '6300-556',
    active: true,
    createdAt: new Date().toISOString(),
    plan: 'enterprise',
    showNativeStoreBadges: false,
    businessHistory: "Fundada com o compromisso da excelência e do respeito à tradição da barbearia clássica combinada com a precisão dos cortes modernos, a Mr. Navalha na Guarda é referência em estilo, pontualidade e sofisticação. Aqui cada cliente desfruta de um ambiente pensado para o seu conforto, atendimento personalizado e profissionais dedicados à arte de cuidar da sua imagem com maestria.",
    workingHours: {
      1: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
      2: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
      3: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
      4: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
      5: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
      6: { active: true, start: '09:00', end: '20:30', breakStart: '', breakEnd: '' },
      0: { active: false, start: '09:00', end: '13:00', breakStart: '', breakEnd: '' }
    },
    modulesEnabled: {
      appointments: true,
      sales: true,
      inventory: true,
      cash: true,
      loyalty: true,
      aiAssistant: true
    }
  },
  {
    name: 'Studio Diva Nails Design',
    slug: 'diva-nails',
    businessType: 'nail_salon',
    primaryColor: '#f43f5e', // Rose / Pink Gold
    secondaryColor: '#1e1b4b',
    phone: '+351 925 876 543',
    email: 'contacto@divanails.pt',
    address: 'Avenida da Liberdade 120',
    city: 'Lisboa',
    zipCode: '1250-142',
    active: true,
    createdAt: new Date().toISOString(),
    plan: 'pro',
    modulesEnabled: {
      appointments: true,
      sales: true,
      inventory: true,
      cash: true,
      loyalty: true,
      aiAssistant: true
    }
  },
  {
    name: 'Glow & Glam Beauty Studio',
    slug: 'glow-glam',
    businessType: 'beauty_salon',
    primaryColor: '#c084fc', // Violet / Champagne
    secondaryColor: '#0f172a',
    phone: '+351 934 567 890',
    email: 'agendamentos@glowglam.pt',
    address: 'Avenida da Boavista, 88',
    city: 'Porto',
    zipCode: '4000-010',
    active: true,
    createdAt: new Date().toISOString(),
    plan: 'pro',
    modulesEnabled: {
      appointments: true,
      sales: true,
      inventory: true,
      cash: true,
      loyalty: true,
      aiAssistant: true
    }
  },
  {
    name: 'Clínica Aura Estética & Spa',
    slug: 'aura-spa',
    businessType: 'aesthetic_clinic',
    primaryColor: '#14b8a6', // Teal / Botanical
    secondaryColor: '#064e3b',
    phone: '+351 961 234 567',
    email: 'clinica@auraspa.pt',
    address: 'Praça Marquês de Pombal, 12',
    city: 'Lisboa',
    zipCode: '1250-001',
    active: true,
    createdAt: new Date().toISOString(),
    plan: 'enterprise',
    modulesEnabled: {
      appointments: true,
      sales: true,
      inventory: true,
      cash: true,
      loyalty: true,
      aiAssistant: true
    }
  }
];

export function seedSampleTenantsLocally(): TenantProfile[] {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('glowfy_custom_tenants') : null;
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // fallback
    }
  }
  // Fallback to DEMO_TENANTS so that the UI is immediately fully interactive with gorgeous data!
  return DEMO_TENANTS.map(t => ({ id: t.slug, ...t }));
}

/**
 * Explicit helper to load sample tenants preset if requested by user
 */
export function getSampleTenantsPreset(): TenantProfile[] {
  return DEMO_TENANTS.map(t => ({ id: t.slug, ...t }));
}

export async function fetchAllTenants(): Promise<TenantProfile[]> {
  try {
    let tenants = await cloudDbList<TenantProfile>('tenants');

    // Auto-seed if database is empty to ensure 100% operational state instantly
    if (tenants.length === 0) {
      console.log("No tenants found in cloud database, auto-seeding demo tenants...");
      tenants = await seedSampleTenants();
    }

    // Ensure demo defaults like Mr. Navalha updated hours and logo exist if missing
    tenants = tenants.map(t => {
      if (t.id === 'mister-navalha' || t.slug === 'mister-navalha' || t.id === 'mr-navalha' || t.slug === 'mr-navalha') {
        const demo = DEMO_TENANTS[0];
        return {
          ...demo,
          ...t,
          id: 'mr-navalha',
          slug: 'mr-navalha',
          name: t.name && t.name !== 'Mister Navalha' ? t.name : 'Mr. Navalha',
          logoUrl: t.logoUrl || demo.logoUrl,
          businessHistory: t.businessHistory || demo.businessHistory,
          workingHours: t.workingHours || demo.workingHours
        };
      }
      return t;
    });

    // Check if custom tenants saved in localStorage
    const localSaved = typeof window !== 'undefined' ? localStorage.getItem('glowfy_custom_tenants') : null;
    if (localSaved) {
      try {
        const parsed: TenantProfile[] = JSON.parse(localSaved);
        parsed.forEach(pt => {
          const existingIdx = tenants.findIndex(t => t.id === pt.id || t.slug === pt.slug);
          if (existingIdx >= 0) {
            tenants[existingIdx] = { ...tenants[existingIdx], ...pt };
          } else {
            tenants.push(pt);
          }
        });
      } catch (e) {
        console.warn("Local storage parse notice:", e);
      }
    }

    return tenants;
  } catch (error) {
    console.warn("Notice: Fetching local storage fallback for merchants", error);
    return seedSampleTenantsLocally();
  }
}

/**
 * Deletes a single merchant tenant and all its associated data.
 * Permitted for Super Admin and Tenant Owner.
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  // 1. Remove immediately from local cache so UI reacts instantly
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('glowfy_custom_tenants');
    if (saved) {
      try {
        const list: TenantProfile[] = JSON.parse(saved);
        const filtered = list.filter(t => t.id !== tenantId && t.slug !== tenantId);
        localStorage.setItem('glowfy_custom_tenants', JSON.stringify(filtered));
      } catch {}
    }
  }

  // 2. Background resilient deletion in Firestore
  safeFirestoreWrite(deleteDoc(doc(db, 'tenants', tenantId))).then(async () => {
    const subcollections = ['members', 'services', 'serviceCategories', 'professionals', 'appointments', 'clients', 'products', 'sales'];
    for (const sub of subcollections) {
      try {
        const subSnap = await safeFirestoreRead(getDocs(collection(db, 'tenants', tenantId, sub)), null, 800);
        if (subSnap && !subSnap.empty) {
          subSnap.docs.forEach(d => safeFirestoreWrite(deleteDoc(d.ref)));
        }
      } catch (subErr) {
        console.warn(`Notice: Subcollection clean on ${sub}:`, subErr);
      }
    }
  }).catch((err) => {
    console.warn("Notice: Firestore delete fallback:", err);
  });
}

/**
 * Purges appointments, clients, and sales data for a specific merchant while keeping their business profile.
 */
export async function purgeTenantData(
  tenantId: string, 
  options: { appointments?: boolean; clients?: boolean; sales?: boolean } = { appointments: true, clients: true, sales: true }
): Promise<void> {
  const collectionsToPurge: string[] = [];
  if (options.appointments) collectionsToPurge.push('appointments');
  if (options.clients) collectionsToPurge.push('clients');
  if (options.sales) collectionsToPurge.push('sales', 'cashRegisters', 'cashTransactions');

  for (const collName of collectionsToPurge) {
    try {
      const snap = await getDocs(collection(db, 'tenants', tenantId, collName));
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.allSettled(deletePromises);
    } catch (err) {
      console.warn(`Notice purging ${collName} for tenant ${tenantId}:`, err);
    }
  }
}

/**
 * Clears ALL merchants and resets the system to zero merchants.
 * Super Admin master action.
 */
export async function deleteAllTenants(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'tenants'));
    for (const d of snap.docs) {
      await deleteTenant(d.id);
    }
  } catch (err) {
    console.warn("Notice during bulk tenant deletion:", err);
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('glowfy_custom_tenants');
  }
}

export async function seedSampleTenants(): Promise<TenantProfile[]> {
  const seededList: TenantProfile[] = DEMO_TENANTS.map(t => ({ 
    ...t, 
    id: t.slug === 'mister-navalha' ? 'mr-navalha' : t.slug,
    slug: t.slug === 'mister-navalha' ? 'mr-navalha' : t.slug
  }));
  try {
    for (const demo of seededList) {
      const tenantId = demo.id;
      await cloudDbSet(`tenants/${tenantId}`, demo);
    }
  } catch (err) {
    console.warn("Cloud tenant seeding notice:", err);
  }

  return seededList;
}

export async function updateTenantProfile(
  tenantId: string, 
  data: Partial<TenantProfile>
): Promise<void> {
  const cleanTenantId = normalizeTenantId(tenantId);
  const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
    return value === undefined ? null : value;
  }));

  if (cleanData.id) delete cleanData.id;

  // 1. Update in Local Storage Cache FIRST so current UI tab is snappy
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('glowfy_custom_tenants');
      let list: TenantProfile[] = saved ? JSON.parse(saved) : [];
      
      if (list.length === 0) {
        list = seedSampleTenantsLocally();
      }

      const idx = list.findIndex(t => t.id === cleanTenantId || t.slug === cleanTenantId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...cleanData } as TenantProfile;
      } else {
        list.push({ id: cleanTenantId, ...cleanData } as TenantProfile);
      }
      localStorage.setItem('glowfy_custom_tenants', JSON.stringify(list));
    } catch (e) {
      console.warn("Notice: Local storage mirror update info:", e);
    }
  }

  // 2. Cloud Database write synced across all browsers using atomic patch (preserves products, services, professionals, etc.)
  await cloudDbUpdate(`tenants/${cleanTenantId}`, { id: cleanTenantId, ...cleanData });
}

export interface CreateMerchantParams {
  name: string;
  slug: string;
  businessType: BusinessType;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  plan: 'starter' | 'pro' | 'enterprise' | 'free_trial';
  city: string;
  phone: string;
  primaryColor?: string;
}

export interface MerchantCreationResult {
  tenant: TenantProfile;
  ownerMember: TenantMember;
  credentials: {
    loginUrl: string;
    publicPortalUrl: string;
    email: string;
    password: string;
    role: string;
    businessName: string;
  };
}

/**
 * Creates a new merchant business provisioned directly by the SaaS Master Admin.
 * Provisions Firestore tenant, members, credentials, and initial catalog.
 */
export async function createMerchantAccount(
  params: CreateMerchantParams
): Promise<MerchantCreationResult> {
  const tenantId = params.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
  const ownerUid = `owner-${tenantId}-${Date.now().toString().slice(-4)}`;
  const meta = BUSINESS_TYPES[params.businessType] || BUSINESS_TYPES.barbershop;

  const defaultColor = params.primaryColor || (
    params.businessType === 'nail_salon' ? '#f43f5e' :
    params.businessType === 'beauty_salon' ? '#c084fc' :
    params.businessType === 'aesthetic_clinic' ? '#14b8a6' :
    '#e5a93b'
  );

  const profile: TenantProfile = {
    id: tenantId,
    name: params.name,
    slug: tenantId,
    businessType: params.businessType,
    primaryColor: defaultColor,
    secondaryColor: '#0f172a',
    phone: params.phone,
    email: params.ownerEmail,
    ownerPassword: params.ownerPassword,
    address: '',
    city: params.city || 'Lisboa',
    active: true,
    createdAt: new Date().toISOString(),
    plan: params.plan,
    modulesEnabled: {
      appointments: true,
      sales: true,
      inventory: true,
      cash: true,
      loyalty: true,
      aiAssistant: true
    }
  };

  const ownerMember: TenantMember = {
    id: ownerUid,
    tenantId,
    role: 'owner',
    permissions: ROLE_PERMISSIONS['owner'],
    name: params.ownerName,
    email: params.ownerEmail,
    joinedAt: new Date().toISOString(),
    active: true
  };

  try {
    // 1. Create Tenant in Cloud Database & Firestore
    await cloudDbSet(`tenants/${tenantId}`, profile);
    await cloudDbSet(`stores/${tenantId}`, {
      id: tenantId,
      name: params.name,
      segment: params.businessType,
      ownerEmail: params.ownerEmail,
      createdAt: new Date().toISOString(),
      active: true,
      storeId: tenantId
    });

    // 2. Create Owner Member in /tenants/{tenantId}/members/{ownerUid}
    await cloudDbSet(`tenants/${tenantId}/members/${ownerUid}`, ownerMember);

    // 3. Store Merchant User Profile and credentials in /users/{ownerUid} with both role formats ('merchant' and 'owner')
    await cloudDbSet(`users/${ownerUid}`, {
      uid: ownerUid,
      id: ownerUid,
      email: params.ownerEmail,
      displayName: params.ownerName,
      tenantId,
      storeId: tenantId,
      role: 'merchant',
      legacyRole: 'owner',
      initialPassword: params.ownerPassword,
      businessName: params.name,
      businessType: params.businessType,
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    // 4. Seed default categories & services for this specific business vertical
    let catIdx = 0;
    for (const catName of meta.defaultCategories) {
      await cloudDbSet(`tenants/${tenantId}/serviceCategories/cat-${catIdx}`, { id: `cat-${catIdx}`, tenantId, name: catName, order: catIdx });
      catIdx++;
    }

    let servIdx = 0;
    for (const serv of meta.defaultServices) {
      await cloudDbSet(`tenants/${tenantId}/services/serv-${servIdx}`, {
        id: `serv-${servIdx}`,
        tenantId,
        name: serv.name,
        categoryName: serv.category,
        price: serv.price,
        durationMinutes: serv.durationMinutes,
        commissionPercentage: serv.commissionPercentage,
        active: true
      });
      servIdx++;
    }

    // 5. Seed default professional (the owner as staff specialist)
    await cloudDbSet(`tenants/${tenantId}/professionals/pro-${ownerUid}`, {
      id: `pro-${ownerUid}`,
      tenantId,
      name: params.ownerName,
      email: params.ownerEmail,
      phone: params.phone,
      active: true,
      rating: 5.0,
      totalReviews: 1,
      roleTitle: meta.professionalTerm,
      commissionPercentage: 50,
      specialties: [meta.serviceTerm]
    });

  } catch (err) {
    console.warn("Notice: Cloud DB write fallback, registered locally for session:", err);
  }

  // Update local storage cache to guarantee immediate reactive UI updates even if Firestore was offline/unauthorized
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('glowfy_custom_tenants');
      const list: TenantProfile[] = saved ? JSON.parse(saved) : [];
      if (!list.some(t => t.id === tenantId)) {
        list.push(profile);
        localStorage.setItem('glowfy_custom_tenants', JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Could not save new tenant to localStorage:", e);
    }
  }

  return {
    tenant: profile,
    ownerMember,
    credentials: {
      loginUrl: `/login?tenant=${tenantId}`,
      publicPortalUrl: `/b/${tenantId}`,
      email: params.ownerEmail,
      password: params.ownerPassword,
      role: 'owner',
      businessName: params.name
    }
  };
}

export async function createTenant(
  name: string,
  slug: string,
  businessType: BusinessType,
  ownerUid: string,
  ownerEmail: string,
  ownerName: string
): Promise<TenantProfile> {
  const res = await createMerchantAccount({
    name,
    slug,
    businessType,
    ownerName,
    ownerEmail,
    ownerPassword: 'temp' + Math.random().toString(36).slice(-6),
    plan: 'pro',
    city: 'Lisboa',
    phone: ''
  });
  return res.tenant;
}

/**
 * Resets or re-establishes a merchant's owner password.
 * Allows Super Admin to restore access if merchant forgot their password.
 */
export async function resetMerchantPassword(tenantId: string, newPassword: string): Promise<void> {
  try {
    const tenantRef = doc(db, 'tenants', tenantId);
    await updateDoc(tenantRef, {
      ownerPassword: newPassword,
      updatedAt: serverTimestamp()
    });

    // Also update in owner member subcollection if present
    try {
      const membersSnap = await getDocs(query(collection(db, 'tenants', tenantId, 'members'), where('role', '==', 'owner')));
      membersSnap.forEach(async (mDoc) => {
        await updateDoc(mDoc.ref, { password: newPassword });
      });
    } catch (e) {
      console.warn("Notice: Member password update fallback:", e);
    }
  } catch (err) {
    console.warn("Notice: Firestore resetMerchantPassword fallback to local storage:", err);
  }

  // Update in localStorage cache
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('glowfy_custom_tenants');
    if (saved) {
      try {
        const list: TenantProfile[] = JSON.parse(saved);
        const idx = list.findIndex(t => t.id === tenantId || t.slug === tenantId);
        if (idx >= 0) {
          list[idx].ownerPassword = newPassword;
          localStorage.setItem('glowfy_custom_tenants', JSON.stringify(list));
        }
      } catch {}
    }
  }
}
