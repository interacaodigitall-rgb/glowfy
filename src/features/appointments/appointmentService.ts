import { Appointment, AppointmentStatus } from '../../types';
import { 
  cloudDbList, 
  cloudDbSet, 
  cloudDbDelete, 
  cloudDbSubscribe, 
  normalizeTenantId 
} from '../../services/cloudDb';

export interface CreateAppointmentInput {
  tenantId: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  startAt: string; // ISO String
  endAt: string;   // ISO String
  price: number;
  commissionRate?: number;
  notes?: string;
}

export async function fetchTenantAppointments(rawTenantId: string): Promise<Appointment[]> {
  const tenantId = normalizeTenantId(rawTenantId);
  const list = await cloudDbList<Appointment>(`tenants/${tenantId}/appointments`);
  return list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export async function createAppointmentTransactional(input: CreateAppointmentInput): Promise<Appointment> {
  const tenantId = normalizeTenantId(input.tenantId);
  const newId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newStartMs = new Date(input.startAt).getTime();
  const newEndMs = new Date(input.endAt).getTime();

  const commissionAmount = input.commissionRate 
    ? (input.price * input.commissionRate) / 100 
    : (input.price * 30) / 100;

  const newAppointment: Appointment = {
    id: newId,
    tenantId,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    professionalId: input.professionalId,
    professionalName: input.professionalName,
    clientId: input.clientId,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail || '',
    startAt: input.startAt,
    endAt: input.endAt,
    price: input.price,
    commissionAmount,
    status: 'confirmed',
    notes: input.notes || '',
    createdAt: new Date().toISOString()
  };

  // Conflict check against existing appointments
  const existingList = await cloudDbList<Appointment>(`tenants/${tenantId}/appointments`);
  let conflictFound = false;

  for (const existing of existingList) {
    if (existing.professionalId === input.professionalId && existing.status !== 'cancelled' && existing.id !== newId) {
      const exStartMs = new Date(existing.startAt).getTime();
      const exEndMs = new Date(existing.endAt).getTime();
      if (newStartMs < exEndMs && newEndMs > exStartMs) {
        conflictFound = true;
        break;
      }
    }
  }

  if (conflictFound) {
    throw new Error("HORARIO_OCUPADO: Este profissional já possui uma reserva para este horário exato.");
  }

  // Save appointment to Cloud Database
  await cloudDbSet(`tenants/${tenantId}/appointments/${newId}`, newAppointment);

  // Automatically upsert client into tenant CRM collection
  try {
    const clientCleanPhone = (input.clientPhone || '').replace(/\D/g, '');
    const clientId = input.clientId || `client-${clientCleanPhone || Date.now()}`;
    const existingClients = await cloudDbList<any>(`tenants/${tenantId}/clients`);
    const existingClient = existingClients.find(c => c.id === clientId || (clientCleanPhone && c.phone && c.phone.replace(/\D/g, '') === clientCleanPhone));

    const spent = (existingClient?.totalSpent || 0) + input.price;
    const count = (existingClient?.appointmentsCount || 0) + 1;
    const points = (existingClient?.loyaltyPoints || 0) + Math.floor(input.price);

    const clientPayload = {
      id: clientId,
      tenantId,
      name: input.clientName || 'Cliente sem Nome',
      email: input.clientEmail || existingClient?.email || '',
      phone: input.clientPhone || existingClient?.phone || '',
      totalSpent: spent,
      appointmentsCount: count,
      loyaltyPoints: points,
      createdAt: existingClient?.createdAt || new Date().toISOString()
    };

    await cloudDbSet(`tenants/${tenantId}/clients/${clientId}`, clientPayload);
  } catch (e) {
    console.warn("Could not auto-save client to CRM:", e);
  }

  // Save real-time notification
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await cloudDbSet(`tenants/${tenantId}/notifications/${notifId}`, {
      id: notifId,
      tenantId,
      professionalId: input.professionalId,
      type: 'appointment_created',
      title: `Novo Agendamento: ${input.serviceName}`,
      message: `${input.clientName} marcou com ${input.professionalName} para ${new Date(input.startAt).toLocaleDateString('pt-PT')} às ${new Date(input.startAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
      read: false,
      appointmentId: newId,
      createdAt: new Date().toISOString()
    });
  } catch {}

  return newAppointment;
}

export function subscribeToTenantAppointments(
  rawTenantId: string,
  onUpdate: (appointments: Appointment[]) => void
): () => void {
  const tenantId = normalizeTenantId(rawTenantId);
  return cloudDbSubscribe<Appointment>(`tenants/${tenantId}/appointments`, (list) => {
    const sorted = list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    onUpdate(sorted);
  });
}

export async function updateAppointmentStatus(
  rawTenantId: string, 
  appointmentId: string, 
  status: AppointmentStatus,
  reason?: string
): Promise<void> {
  const tenantId = normalizeTenantId(rawTenantId);
  const appointments = await cloudDbList<Appointment>(`tenants/${tenantId}/appointments`);
  const app = appointments.find(a => a.id === appointmentId);
  if (app) {
    app.status = status;
    if (reason) (app as any).cancellationReason = reason;
    await cloudDbSet(`tenants/${tenantId}/appointments/${appointmentId}`, app);
  }
}

export async function rescheduleAppointment(
  rawTenantId: string,
  appointmentId: string,
  newStartAt: string,
  newEndAt: string
): Promise<void> {
  const tenantId = normalizeTenantId(rawTenantId);
  const appointments = await cloudDbList<Appointment>(`tenants/${tenantId}/appointments`);
  const app = appointments.find(a => a.id === appointmentId);
  if (!app) return;

  const newStartMs = new Date(newStartAt).getTime();
  const newEndMs = new Date(newEndAt).getTime();

  let conflictFound = false;
  for (const existing of appointments) {
    if (existing.professionalId === app.professionalId && existing.status !== 'cancelled' && existing.id !== appointmentId) {
      const exStartMs = new Date(existing.startAt).getTime();
      const exEndMs = new Date(existing.endAt).getTime();
      if (newStartMs < exEndMs && newEndMs > exStartMs) {
        conflictFound = true;
        break;
      }
    }
  }

  if (conflictFound) {
    throw new Error("HORARIO_OCUPADO: Este profissional já possui uma reserva ativa neste horário.");
  }

  const newDate = newStartAt.includes('T') ? newStartAt.split('T')[0] : '';
  const newTime = newStartAt.includes('T') ? newStartAt.split('T')[1].slice(0, 5) : '';

  app.startAt = newStartAt;
  app.endAt = newEndAt;
  if (newDate) {
    (app as any).date = newDate;
  }
  if (newTime) {
    (app as any).time = newTime;
  }
  app.status = 'confirmed';
  (app as any).updatedAt = new Date().toISOString();

  await cloudDbSet(`tenants/${tenantId}/appointments/${appointmentId}`, app);

  // Dispatch real-time notification to Firestore in 'notifications' collection
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const formattedDate = newDate || new Date(newStartAt).toLocaleDateString('pt-PT');
    const formattedTime = newTime || new Date(newStartAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    
    await cloudDbSet(`tenants/${tenantId}/notifications/${notifId}`, {
      id: notifId,
      tenantId,
      professionalId: app.professionalId,
      type: 'appointment_rescheduled',
      title: `Agendamento Reagendado: ${app.serviceName}`,
      message: `${app.clientName || 'Cliente'} remarcou para ${formattedDate} às ${formattedTime}`,
      read: false,
      appointmentId,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Could not dispatch reschedule notification:", err);
  }
}

export { createAppointmentTransactional as createTransactionalAppointment };
