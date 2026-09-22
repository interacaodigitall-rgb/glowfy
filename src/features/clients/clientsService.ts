import { Client } from '../../types';
import { 
  cloudDbList, 
  cloudDbSet, 
  cloudDbDelete, 
  cloudDbSubscribe, 
  normalizeTenantId 
} from '../../services/cloudDb';

export async function fetchClients(rawTenantId: string): Promise<Client[]> {
  const tenantId = normalizeTenantId(rawTenantId);
  return await cloudDbList<Client>(`tenants/${tenantId}/clients`);
}

export async function saveClient(rawTenantId: string, client: Partial<Client>): Promise<Client> {
  const tenantId = normalizeTenantId(rawTenantId);
  const id = client.id || `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const fullClient: Client = {
    id,
    tenantId,
    name: client.name || 'Novo Cliente',
    email: client.email || '',
    phone: client.phone || '',
    notes: client.notes || '',
    birthDate: client.birthDate || '',
    totalSpent: client.totalSpent ?? 0,
    appointmentsCount: client.appointmentsCount ?? 0,
    loyaltyPoints: client.loyaltyPoints ?? 0,
    createdAt: client.createdAt || new Date().toISOString()
  };

  await cloudDbSet(`tenants/${tenantId}/clients/${id}`, fullClient);
  return fullClient;
}

export async function deleteClient(rawTenantId: string, clientId: string): Promise<void> {
  const tenantId = normalizeTenantId(rawTenantId);
  await cloudDbDelete(`tenants/${tenantId}/clients/${clientId}`);
}

export function subscribeClients(rawTenantId: string, callback: (clients: Client[]) => void): () => void {
  const tenantId = normalizeTenantId(rawTenantId);
  return cloudDbSubscribe<Client>(`tenants/${tenantId}/clients`, (items) => {
    callback(items);
  });
}
