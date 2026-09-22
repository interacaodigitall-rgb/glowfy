import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { fetchServices } from '../../features/services/servicesService';
import { fetchProfessionals } from '../../features/professionals/professionalsService';
import { fetchClients, saveClient } from '../../features/clients/clientsService';
import { createTransactionalAppointment, fetchTenantAppointments } from '../../features/appointments/appointmentService';
import { Service, Professional, Client, Appointment } from '../../types';
import { Calendar, Clock, User, Scissors, Check, X, AlertCircle, Ban } from 'lucide-react';

interface NewBookingModalProps {
  isOpen: boolean;
  initialDate?: string;
  onClose: () => void;
  onBookingSuccess: () => void;
}

interface SlotInfo {
  time: string;
  available: boolean;
  reason?: string;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  initialDate,
  onClose,
  onBookingSuccess
}) => {
  const { currentTenant, businessMeta } = useTenant();

  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);

  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate, isOpen]);

  useEffect(() => {
    if (!currentTenant || !isOpen) return;
    Promise.all([
      fetchServices(currentTenant.id),
      fetchProfessionals(currentTenant.id),
      fetchClients(currentTenant.id),
      fetchTenantAppointments(currentTenant.id)
    ]).then(([sList, pList, cList, aList]) => {
      setServices(sList);
      setProfessionals(pList);
      setClients(cList);
      setExistingAppointments(aList);
      if (sList.length > 0) setServiceId(sList[0].id);
      if (pList.length > 0) setProfessionalId(pList[0].id);
    });
  }, [currentTenant, isOpen]);

  // Compute all available and occupied slots for the selected date and professional
  const computedSlots = useMemo<SlotInfo[]>(() => {
    if (!currentTenant || !date) return [];

    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();

    const defaultHours = { active: dayOfWeek !== 0, start: '09:00', end: '20:30' };
    const dayHours = currentTenant.workingHours 
      ? (currentTenant.workingHours[dayOfWeek] || (currentTenant.workingHours as any)[String(dayOfWeek)] || defaultHours) 
      : defaultHours;

    if (!dayHours || !dayHours.active) return [];

    const [sH, sM] = (dayHours.start || '09:00').split(':').map(Number);
    const [eH, eM] = (dayHours.end || '20:30').split(':').map(Number);
    const startMin = (isNaN(sH) ? 9 : sH) * 60 + (isNaN(sM) ? 0 : sM);
    const endMin = (isNaN(eH) ? 20 : eH) * 60 + (isNaN(eM) ? 30 : eM);

    const selectedService = services.find(s => s.id === serviceId);
    const durationMin = selectedService?.durationMinutes || 30;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const result: SlotInfo[] = [];

    for (let m = startMin; m < endMin; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const slot = `${hh}:${mm}`;

      // Check tenant lunch/break hours
      const dHours = dayHours as any;
      if (dHours.breakStart && dHours.breakEnd) {
        if (slot >= dHours.breakStart && slot < dHours.breakEnd) {
          result.push({ time: slot, available: false, reason: 'Pausa' });
          continue;
        }
      }

      // Check tenant manually blocked dates
      if (currentTenant.blockedDates && currentTenant.blockedDates.includes(date)) {
        result.push({ time: slot, available: false, reason: 'Fechado' });
        continue;
      }

      // Check tenant manually blocked times
      if (currentTenant.blockedTimes && currentTenant.blockedTimes.length > 0) {
        const isTimeBlocked = currentTenant.blockedTimes.some(b => b.date === date && slot >= b.start && slot < b.end);
        if (isTimeBlocked) {
          result.push({ time: slot, available: false, reason: 'Bloqueado' });
          continue;
        }
      }

      // If target date is today and slot has already passed
      if (date === todayStr && m <= nowMinutes) {
        result.push({ time: slot, available: false, reason: 'Passado' });
        continue;
      }

      // Check conflicts with existing appointments for this professional
      const slotStartMs = new Date(`${date}T${slot}:00`).getTime();
      const slotEndMs = slotStartMs + durationMin * 60 * 1000;

      const hasConflict = existingAppointments.some(app => {
        if (app.status === 'cancelled') return false;
        if (professionalId && app.professionalId && app.professionalId !== professionalId) return false;

        let appDate = '';
        let appTime = '';
        if (app.startAt) {
          if (app.startAt.includes('T')) {
            appDate = app.startAt.split('T')[0];
            const parts = app.startAt.split('T')[1];
            if (parts) appTime = parts.slice(0, 5);
          }
        } else {
          const appAny = app as any;
          appDate = appAny.date || '';
          appTime = appAny.time || '';
        }

        if (appDate !== date) return false;

        // Exact slot match
        if (appTime === slot) return true;

        // Interval overlap
        if (app.startAt && app.endAt) {
          const appStartMs = new Date(app.startAt).getTime();
          const appEndMs = new Date(app.endAt).getTime();
          if (!isNaN(appStartMs) && !isNaN(appEndMs) && !isNaN(slotStartMs) && !isNaN(slotEndMs)) {
            if (slotStartMs < appEndMs && slotEndMs > appStartMs) {
              return true;
            }
          }
        }

        return false;
      });

      if (hasConflict) {
        result.push({ time: slot, available: false, reason: 'Ocupado' });
      } else {
        result.push({ time: slot, available: true });
      }
    }

    return result;
  }, [currentTenant, date, professionalId, serviceId, services, existingAppointments]);

  // Keep selected time synchronized with available slots
  useEffect(() => {
    if (computedSlots.length > 0) {
      const isCurrentTimeFree = computedSlots.some(s => s.time === time && s.available);
      if (!isCurrentTimeFree) {
        const firstFree = computedSlots.find(s => s.available);
        if (firstFree) {
          setTime(firstFree.time);
        } else {
          setTime('');
        }
      }
    } else {
      setTime('');
    }
  }, [computedSlots]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !serviceId || !professionalId || !time) return;

    // Verify chosen slot is actually available
    const chosenSlot = computedSlots.find(s => s.time === time);
    if (!chosenSlot || !chosenSlot.available) {
      setErrorMsg("O horário selecionado está ocupado ou indisponível. Por favor, escolha um horário livre na grade.");
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const service = services.find(s => s.id === serviceId);
    const professional = professionals.find(p => p.id === professionalId);

    if (!service || !professional) {
      setErrorMsg("Serviço ou profissional inválido.");
      setSubmitting(false);
      return;
    }

    const startAtIso = `${date}T${time}:00`;
    const [h, m] = time.split(':').map(Number);
    const duration = service.durationMinutes || 30;
    const totalMinutes = (isNaN(h) ? 10 : h) * 60 + (isNaN(m) ? 0 : m) + duration;
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    const endAtIso = `${date}T${endH}:${endM}:00`;

    try {
      // Create or update client record if phone provided
      let matchedClient = clients.find(c => c.phone === clientPhone);
      if (!matchedClient && clientName && clientPhone) {
        matchedClient = await saveClient(currentTenant.id, {
          name: clientName,
          phone: clientPhone,
          totalSpent: 0,
          appointmentsCount: 0,
          loyaltyPoints: 0
        });
      }

      const app = await createTransactionalAppointment({
        tenantId: currentTenant.id,
        serviceId: service.id,
        serviceName: service.name,
        professionalId: professional.id,
        professionalName: professional.name,
        clientId: matchedClient?.id || '',
        clientName: clientName || matchedClient?.name || 'Cliente Balcão',
        clientPhone: clientPhone || matchedClient?.phone || '',
        startAt: startAtIso,
        endAt: endAtIso,
        price: service.price,
        commissionRate: service.commissionPercentage || professional.commissionRate || 30,
        notes
      });

      if (app) {
        onBookingSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de concorrência ou colisão de horário. Escolha outro horário.");
    } finally {
      setSubmitting(false);
    }
  };

  const freeSlotsCount = computedSlots.filter(s => s.available).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-rose-500" />
            <span>Novo Agendamento na Agenda</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">{businessMeta.serviceTerm} *</label>
            <select
              required
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-medium"
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — €{s.price.toFixed(2)} ({s.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">{businessMeta.professionalTerm} *</label>
            <select
              required
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-medium"
            >
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Data do Agendamento *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-mono"
            />
          </div>

          {/* SMART AVAILABLE SLOTS GRID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 font-semibold flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Horários Disponíveis ({freeSlotsCount} livres) *</span>
              </label>
              {time && (
                <span className="text-rose-400 font-mono font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  {time}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
              {computedSlots.length === 0 ? (
                <div className="col-span-full py-4 text-center text-slate-500 text-xs">
                  Sem horários de funcionamento para esta data.
                </div>
              ) : (
                computedSlots.map((slot) => {
                  const isSelected = time === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setTime(slot.time)}
                      className={`py-2 px-1 rounded-lg text-xs font-mono font-semibold transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-rose-600 text-white font-bold ring-2 ring-rose-400 shadow-md shadow-rose-950/50'
                          : slot.available
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/70 hover:border-rose-500/50'
                          : 'bg-slate-900/40 text-slate-600 border border-slate-800/40 cursor-not-allowed line-through opacity-40'
                      }`}
                      title={slot.available ? `Horário livre: ${slot.time}` : `Horário indisponível: ${slot.reason || 'Ocupado'}`}
                    >
                      <span>{slot.time}</span>
                      {!slot.available && (
                        <span className="text-[9px] text-rose-400/80 no-underline font-normal">
                          {slot.reason || 'Ocupado'}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            {!time && freeSlotsCount > 0 && (
              <p className="text-[11px] text-amber-400 mt-1">Clique num dos horários livres acima para selecionar.</p>
            )}
            {freeSlotsCount === 0 && computedSlots.length > 0 && (
              <p className="text-[11px] text-rose-400 mt-1 flex items-center space-x-1">
                <Ban className="w-3 h-3" />
                <span>Todos os horários estão ocupados ou indisponíveis nesta data.</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Nome do Cliente *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5"
                placeholder="Ex: João Santos"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Telemóvel *</label>
              <input
                type="text"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-mono"
                placeholder="+351 912 345 678"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Notas / Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5"
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !time || freeSlotsCount === 0}
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-5 py-2 rounded-xl shadow-lg shadow-rose-950/50 transition-colors"
            >
              {submitting ? 'A Validar...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
