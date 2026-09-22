import React, { useState, useEffect } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { fetchServices } from '../../features/services/servicesService';
import { fetchProfessionals } from '../../features/professionals/professionalsService';
import { fetchClients, saveClient } from '../../features/clients/clientsService';
import { createTransactionalAppointment } from '../../features/appointments/appointmentService';
import { Service, Professional, Client } from '../../types';
import { Calendar, Clock, User, Scissors, Check, X, AlertCircle } from 'lucide-react';

interface NewBookingModalProps {
  isOpen: boolean;
  initialDate?: string;
  onClose: () => void;
  onBookingSuccess: () => void;
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

  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
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
      fetchClients(currentTenant.id)
    ]).then(([sList, pList, cList]) => {
      setServices(sList);
      setProfessionals(pList);
      setClients(cList);
      if (sList.length > 0) setServiceId(sList[0].id);
      if (pList.length > 0) setProfessionalId(pList[0].id);
    });
  }, [currentTenant, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !serviceId || !professionalId) return;

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
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

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Data *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Horário *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
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
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl shadow-lg shadow-rose-950/50"
            >
              {submitting ? 'A Validar...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
