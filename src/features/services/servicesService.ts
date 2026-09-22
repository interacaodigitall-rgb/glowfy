import { Service, ServiceCategory } from '../../types';
import { BUSINESS_TYPES } from '../../utils/businessTypes';
import { 
  cloudDbList, 
  cloudDbSet, 
  cloudDbDelete, 
  cloudDbSubscribe, 
  normalizeTenantId 
} from '../../services/cloudDb';

export async function fetchServices(rawTenantId: string): Promise<Service[]> {
  const tenantId = normalizeTenantId(rawTenantId);

  // 1. Fetch deleted service IDs
  const deletedCloudList = await cloudDbList<{ id: string }>(`tenants/${tenantId}/deletedServices`);
  const deletedIds = deletedCloudList.map(d => d.id);

  if (typeof window !== 'undefined') {
    try {
      const localDeleted: string[] = JSON.parse(localStorage.getItem(`glowfy_deleted_services_${tenantId}`) || '[]');
      localDeleted.forEach(id => {
        if (!deletedIds.includes(id)) deletedIds.push(id);
      });
    } catch {}
  }

  // 2. Fetch from Cloud Database
  const cloudServices = await cloudDbList<Service>(`tenants/${tenantId}/services`);
  if (cloudServices && cloudServices.length > 0) {
    const filtered = cloudServices.filter(s => !deletedIds.includes(s.id));
    if (filtered.length > 0 || deletedIds.length > 0) {
      return filtered;
    }
  }

  // 3. Fallback to default services and auto-seed to cloud
  if (deletedIds.length === 0) {
    const meta = BUSINESS_TYPES['barbershop'];
    const fallbackList: Service[] = (meta.defaultServices || []).map((serv, servIdx) => ({
      id: `serv_${servIdx + 1}`,
      tenantId,
      name: serv.name,
      categoryName: serv.category,
      price: serv.price,
      durationMinutes: serv.durationMinutes,
      commissionPercentage: serv.commissionPercentage,
      active: true,
      description: '',
      imageUrl: ''
    }));

    for (const s of fallbackList) {
      cloudDbSet(`tenants/${tenantId}/services/${s.id}`, s).catch(() => {});
    }

    return fallbackList;
  }

  return [];
}

export async function fetchServiceCategories(rawTenantId: string): Promise<ServiceCategory[]> {
  const tenantId = normalizeTenantId(rawTenantId);
  const cloudCats = await cloudDbList<ServiceCategory>(`tenants/${tenantId}/serviceCategories`);

  if (cloudCats && cloudCats.length > 0) {
    return cloudCats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  const meta = BUSINESS_TYPES['barbershop'];
  const fallbackCats: ServiceCategory[] = (meta.defaultCategories || []).map((name, idx) => ({
    id: `cat_${idx + 1}`,
    tenantId,
    name,
    order: idx
  }));

  for (const c of fallbackCats) {
    cloudDbSet(`tenants/${tenantId}/serviceCategories/${c.id}`, c).catch(() => {});
  }

  return fallbackCats;
}

export async function saveService(rawTenantId: string, service: Partial<Service>): Promise<Service> {
  const tenantId = normalizeTenantId(rawTenantId);
  const id = service.id || `serv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const fullService: Service = {
    id,
    tenantId,
    name: service.name || 'Novo Serviço',
    categoryName: service.categoryName || 'Geral',
    price: Number(service.price) || 0,
    durationMinutes: Number(service.durationMinutes) || 30,
    commissionPercentage: Number(service.commissionPercentage) || 30,
    active: service.active ?? true,
    description: service.description || '',
    imageUrl: service.imageUrl || ''
  };

  try {
    cloudDbDelete(`tenants/${tenantId}/deletedServices/${id}`).catch(() => {});
    if (typeof window !== 'undefined') {
      const deletedKey = `glowfy_deleted_services_${tenantId}`;
      const deletedIds: string[] = JSON.parse(localStorage.getItem(deletedKey) || '[]');
      const filtered = deletedIds.filter(dId => dId !== id);
      localStorage.setItem(deletedKey, JSON.stringify(filtered));
    }
  } catch {}

  await cloudDbSet(`tenants/${tenantId}/services/${id}`, fullService);
  return fullService;
}

export async function deleteService(rawTenantId: string, serviceId: string): Promise<void> {
  const tenantId = normalizeTenantId(rawTenantId);

  await cloudDbDelete(`tenants/${tenantId}/services/${serviceId}`);
  await cloudDbSet(`tenants/${tenantId}/deletedServices/${serviceId}`, { id: serviceId, deletedAt: new Date().toISOString() });

  if (typeof window !== 'undefined') {
    try {
      const deletedKey = `glowfy_deleted_services_${tenantId}`;
      const deletedList: string[] = JSON.parse(localStorage.getItem(deletedKey) || '[]');
      if (!deletedList.includes(serviceId)) {
        deletedList.push(serviceId);
        localStorage.setItem(deletedKey, JSON.stringify(deletedList));
      }
    } catch {}
  }
}

export function subscribeServices(rawTenantId: string, callback: (services: Service[]) => void): () => void {
  const tenantId = normalizeTenantId(rawTenantId);
  return cloudDbSubscribe<Service>(`tenants/${tenantId}/services`, (items) => {
    callback(items);
  });
}
