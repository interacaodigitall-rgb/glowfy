import { Professional } from '../../types';
import { BUSINESS_TYPES } from '../../utils/businessTypes';
import { 
  cloudDbList, 
  cloudDbSet, 
  cloudDbDelete, 
  cloudDbSubscribe, 
  normalizeTenantId 
} from '../../services/cloudDb';

export async function fetchProfessionals(rawTenantId: string): Promise<Professional[]> {
  const tenantId = normalizeTenantId(rawTenantId);

  // 1. Check deleted IDs
  const deletedCloudList = await cloudDbList<{ id: string }>(`tenants/${tenantId}/deletedPros`);
  const deletedIds = deletedCloudList.map(d => d.id);

  if (typeof window !== 'undefined') {
    try {
      const localDeleted: string[] = JSON.parse(localStorage.getItem(`glowfy_deleted_pros_${tenantId}`) || '[]');
      localDeleted.forEach(id => {
        if (!deletedIds.includes(id)) deletedIds.push(id);
      });
    } catch {}
  }

  // 2. Fetch from Cloud Database
  const cloudPros = await cloudDbList<Professional>(`tenants/${tenantId}/professionals`);
  if (cloudPros && cloudPros.length > 0) {
    const filtered = cloudPros.filter(p => !deletedIds.includes(p.id));
    if (filtered.length > 0 || deletedIds.length > 0) {
      return filtered;
    }
  }

  // 3. Fallback to default professionals and auto-seed to cloud
  if (deletedIds.length === 0) {
    const meta = BUSINESS_TYPES['barbershop'];
    const fallbackList: Professional[] = (meta.defaultProfessionals || []).map((defaultPro, idx) => ({
      id: `pro_default_${idx + 1}`,
      tenantId,
      name: defaultPro.name,
      email: defaultPro.email,
      phone: '',
      avatarUrl: '',
      specialties: defaultPro.specialties,
      commissionRate: defaultPro.commissionRate,
      active: true,
      workingHours: {
        1: { active: true, start: '09:00', end: '19:00' },
        2: { active: true, start: '09:00', end: '19:00' },
        3: { active: true, start: '09:00', end: '19:00' },
        4: { active: true, start: '09:00', end: '19:00' },
        5: { active: true, start: '09:00', end: '20:00' },
        6: { active: true, start: '09:00', end: '18:00' },
        0: { active: false, start: '09:00', end: '13:00' }
      }
    }));

    for (const p of fallbackList) {
      cloudDbSet(`tenants/${tenantId}/professionals/${p.id}`, p).catch(() => {});
    }

    return fallbackList;
  }

  return [];
}

export async function saveProfessional(rawTenantId: string, pro: Partial<Professional>): Promise<Professional> {
  const tenantId = normalizeTenantId(rawTenantId);
  const id = pro.id || `pro_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const fullPro: Professional = {
    id,
    tenantId,
    name: pro.name || 'Novo Profissional',
    email: pro.email || '',
    phone: pro.phone || '',
    avatarUrl: pro.avatarUrl || '',
    specialties: pro.specialties || ['Atendimento Geral'],
    commissionRate: Number(pro.commissionRate) || 30,
    active: pro.active ?? true,
    workingHours: pro.workingHours || {
      1: { active: true, start: '09:00', end: '19:00' },
      2: { active: true, start: '09:00', end: '19:00' },
      3: { active: true, start: '09:00', end: '19:00' },
      4: { active: true, start: '09:00', end: '19:00' },
      5: { active: true, start: '09:00', end: '20:00' },
      6: { active: true, start: '09:00', end: '18:00' },
      0: { active: false, start: '09:00', end: '13:00' }
    }
  };

  try {
    cloudDbDelete(`tenants/${tenantId}/deletedPros/${id}`).catch(() => {});
    if (typeof window !== 'undefined') {
      const deletedKey = `glowfy_deleted_pros_${tenantId}`;
      const deletedIds: string[] = JSON.parse(localStorage.getItem(deletedKey) || '[]');
      const filtered = deletedIds.filter(dId => dId !== id);
      localStorage.setItem(deletedKey, JSON.stringify(filtered));
    }
  } catch {}

  await cloudDbSet(`tenants/${tenantId}/professionals/${id}`, fullPro);
  return fullPro;
}

export async function deleteProfessional(rawTenantId: string, proId: string): Promise<void> {
  const tenantId = normalizeTenantId(rawTenantId);

  await cloudDbDelete(`tenants/${tenantId}/professionals/${proId}`);
  await cloudDbSet(`tenants/${tenantId}/deletedPros/${proId}`, { id: proId, deletedAt: new Date().toISOString() });

  if (typeof window !== 'undefined') {
    try {
      const deletedKey = `glowfy_deleted_pros_${tenantId}`;
      const deletedList: string[] = JSON.parse(localStorage.getItem(deletedKey) || '[]');
      if (!deletedList.includes(proId)) {
        deletedList.push(proId);
        localStorage.setItem(deletedKey, JSON.stringify(deletedList));
      }
    } catch {}
  }
}

export function subscribeProfessionals(rawTenantId: string, callback: (pros: Professional[]) => void): () => void {
  const tenantId = normalizeTenantId(rawTenantId);
  return cloudDbSubscribe<Professional>(`tenants/${tenantId}/professionals`, (items) => {
    callback(items);
  });
}
