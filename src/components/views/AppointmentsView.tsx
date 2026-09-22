import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { Appointment, Professional, AppointmentStatus } from '../../types';
import { updateAppointmentStatus, subscribeToTenantAppointments, rescheduleAppointment } from '../../features/appointments/appointmentService';
import { fetchProfessionals } from '../../features/professionals/professionalsService';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Plus, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Sparkles
} from 'lucide-react';

interface AppointmentsViewProps {
  onOpenNewBooking: (date?: string) => void;
  onLaunchPOSWithAppointment: (appointment: Appointment) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  onOpenNewBooking,
  onLaunchPOSWithAppointment
}) => {
  const { currentTenant, businessMeta } = useTenant();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProId, setSelectedProId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // View mode: 'week' (grade de segunda a domingo) or 'day' (visão diária individual)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  
  // Reference date for the week (defaults to today)
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date());
  
  // Specific day selector for 'day' mode
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Rescheduling state
  const [reschedulingApp, setReschedulingApp] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string>('');

  const handleOpenReschedule = (app: Appointment) => {
    setReschedulingApp(app);
    setRescheduleDate(getAppointmentDateKey(app));
    setRescheduleTime(getAppointmentTimeStr(app.startAt));
    setRescheduleError('');
  };

  const handleSaveReschedule = async () => {
    if (!currentTenant || !reschedulingApp) return;
    setIsRescheduling(true);
    setRescheduleError('');

    try {
      const originalStart = reschedulingApp.startAt;
      const originalEnd = reschedulingApp.endAt;

      // Extract duration in minutes
      const startD = new Date(originalStart);
      const endD = new Date(originalEnd);
      const durationMs = endD.getTime() - startD.getTime();
      const durationMin = Math.round(durationMs / 60000) || 30;

      const startAtIso = `${rescheduleDate}T${rescheduleTime}:00`;
      const [h, m] = rescheduleTime.split(':').map(Number);
      const totalMinutes = (isNaN(h) ? 10 : h) * 60 + (isNaN(m) ? 0 : m) + durationMin;
      const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const endM = String(totalMinutes % 60).padStart(2, '0');
      const endAtIso = `${rescheduleDate}T${endH}:${endM}:05`; // Small offset to avoid edge overlap anomalies

      await rescheduleAppointment(currentTenant.id, reschedulingApp.id, startAtIso, endAtIso);
      
      setAppointments(prev => prev.map(a => a.id === reschedulingApp.id ? { ...a, startAt: startAtIso, endAt: endAtIso, status: 'confirmed' } : a));
      setReschedulingApp(null);
    } catch (e: any) {
      setRescheduleError(e.message || "Erro ao remarcar. Verifique se o horário está livre.");
    } finally {
      setIsRescheduling(false);
    }
  };

  useEffect(() => {
    if (!currentTenant) return;
    setLoading(true);

    // Initial fetch of professionals
    fetchProfessionals(currentTenant.id)
      .then(pros => setProfessionals(pros))
      .catch(err => console.warn("Could not load professionals:", err));

    // Real-time listener for appointments
    const unsubscribe = subscribeToTenantAppointments(currentTenant.id, (apps) => {
      setAppointments(apps);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [currentTenant]);

  const handleStatusChange = async (appId: string, newStatus: AppointmentStatus) => {
    if (!currentTenant) return;
    try {
      await updateAppointmentStatus(currentTenant.id, appId, newStatus);
      setAppointments(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    } catch (e) {
      alert("Erro ao atualizar estado do agendamento.");
    }
  };

  // Helper to format local Date object to YYYY-MM-DD
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to accurately extract the local YYYY-MM-DD from any appointment without timezone shift
  const getAppointmentDateKey = (app: Appointment | any): string => {
    if (!app) return '';
    if (app.date) return app.date;
    if (app.startAt) {
      if (app.startAt.includes('T')) {
        return app.startAt.split('T')[0];
      }
    }
    return '';
  };

  // Helper to accurately extract the time HH:mm from any appointment without timezone shift
  const getAppointmentTimeStr = (isoString?: string): string => {
    if (!isoString) return '10:00';
    if (isoString.includes('T')) {
      const parts = isoString.split('T')[1];
      if (parts) return parts.slice(0, 5);
    }
    return '10:00';
  };

  // Helper to compute Monday to Sunday days for the active week
  const weekDays = useMemo(() => {
    // Standardize to local noon (12:00) so timezone / daylight saving transitions never change day
    const ref = new Date(currentWeekDate.getFullYear(), currentWeekDate.getMonth(), currentWeekDate.getDate(), 12, 0, 0);
    const dayOfWeek = ref.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // Offset to get to Monday (if Sunday (0), go back 6 days; otherwise 1 - dayOfWeek)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diffToMonday, 12, 0, 0);

    const dayLabels = [
      { name: 'Segunda-feira', short: 'SEG' },
      { name: 'Terça-feira', short: 'TER' },
      { name: 'Quarta-feira', short: 'QUA' },
      { name: 'Quinta-feira', short: 'QUI' },
      { name: 'Sexta-feira', short: 'SEX' },
      { name: 'Sábado', short: 'SÁB' },
      { name: 'Domingo', short: 'DOM' }
    ];

    const todayStr = formatLocalDate(new Date());

    return dayLabels.map((label, idx) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx, 12, 0, 0);
      const dateStr = formatLocalDate(d);

      return {
        index: idx,
        dateString: dateStr,
        dayName: label.name,
        shortName: label.short,
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('pt-PT', { month: 'short' }),
        isToday: dateStr === todayStr,
        dateObj: d
      };
    });
  }, [currentWeekDate]);

  // Navigate weeks
  const handlePrevWeek = () => {
    const next = new Date(currentWeekDate);
    next.setDate(next.getDate() - 7);
    setCurrentWeekDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekDate);
    next.setDate(next.getDate() + 7);
    setCurrentWeekDate(next);
  };

  const handleTodayWeek = () => {
    setCurrentWeekDate(new Date());
    setSelectedDate(formatLocalDate(new Date()));
  };

  // Filtered appointments based on selected professional & status
  const baseFilteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const matchesPro = selectedProId === 'all' || a.professionalId === selectedProId;
      const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;
      return matchesPro && matchesStatus;
    });
  }, [appointments, selectedProId, selectedStatus]);

  // For day view
  const dayViewAppointments = useMemo(() => {
    return baseFilteredAppointments.filter(a => getAppointmentDateKey(a) === selectedDate);
  }, [baseFilteredAppointments, selectedDate]);

  // Appointments grouped by date for the current 7 days
  const appointmentsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    weekDays.forEach(day => {
      map[day.dateString] = [];
    });

    baseFilteredAppointments.forEach(app => {
      const appDate = getAppointmentDateKey(app);
      if (appDate && map[appDate]) {
        map[appDate].push(app);
      }
    });

    // Sort each day's appointments chronologically
    Object.keys(map).forEach(dateKey => {
      map[dateKey].sort((a, b) => (a.startAt || '').localeCompare(b.startAt || ''));
    });

    return map;
  }, [baseFilteredAppointments, weekDays]);

  // Weekly Stats
  const weekTotalAppointments = useMemo(() => {
    return Object.values(appointmentsByDay).reduce((sum, list) => sum + list.length, 0);
  }, [appointmentsByDay]);

  const weekConfirmedAppointments = useMemo(() => {
    return Object.values(appointmentsByDay).reduce((sum, list) => 
      sum + list.filter(a => a.status === 'confirmed' || a.status === 'checked_in' || a.status === 'in_progress').length, 0);
  }, [appointmentsByDay]);

  const weekCompletedAppointments = useMemo(() => {
    return Object.values(appointmentsByDay).reduce((sum, list) => 
      sum + list.filter(a => a.status === 'completed').length, 0);
  }, [appointmentsByDay]);

  const weekTotalRevenue = useMemo(() => {
    return Object.values(appointmentsByDay).reduce((sum, list) => 
      sum + list.reduce((sub, a) => sub + (a.price || 0), 0), 0);
  }, [appointmentsByDay]);

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">Confirmado</span>;
      case 'checked_in':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">Na Recepção</span>;
      case 'in_progress':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">Em Atendimento</span>;
      case 'completed':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Concluído</span>;
      case 'cancelled':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-red-50 text-red-700 border border-red-200">Cancelado</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-gray-100 text-gray-700">Pendente</span>;
    }
  };

  const formattedWeekRange = useMemo(() => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0];
    const last = weekDays[6];
    return `${first.dayNum} ${first.monthShort} – ${last.dayNum} ${last.monthShort} de ${first.dateObj.getFullYear()}`;
  }, [weekDays]);

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#C5A059]/10 text-[#8C6D23] flex items-center justify-center border border-[#C5A059]/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#111827] flex items-center space-x-2">
                <span>Agenda & Reservas</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#C5A059]/15 text-[#8C6D23] border border-[#C5A059]/30">
                  Grade Seg a Dom
                </span>
              </h2>
              <p className="text-xs text-[#6B7280]">
                Visualização contínua de horários e reservas de Segunda a Domingo.
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-[#111827] shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#8C6D23]" />
              <span>Grade Semanal (Seg-Dom)</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'day'
                  ? 'bg-white text-[#111827] shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-gray-600" />
              <span>Visão Diária</span>
            </button>
          </div>

          {/* Professional Filter */}
          <select
            value={selectedProId}
            onChange={(e) => setSelectedProId(e.target.value)}
            className="bg-white border border-gray-300 text-[#111827] text-xs rounded-lg px-2.5 py-1.5 focus:border-[#C5A059] focus:outline-none"
          >
            <option value="all">Todos os {businessMeta.professionalTerm}s</option>
            {professionals.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-gray-300 text-[#111827] text-xs rounded-lg px-2.5 py-1.5 focus:border-[#C5A059] focus:outline-none"
          >
            <option value="all">Todos os Estados</option>
            <option value="confirmed">Confirmados</option>
            <option value="checked_in">Na Recepção</option>
            <option value="in_progress">Em Atendimento</option>
            <option value="completed">Concluídos</option>
            <option value="cancelled">Cancelados</option>
          </select>

          <button
            onClick={() => onOpenNewBooking()}
            className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Reserva</span>
          </button>
        </div>
      </div>

      {/* Week Navigation Header (When in Week Mode) */}
      {viewMode === 'week' ? (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleTodayWeek}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg border border-gray-200 transition-colors"
            >
              Esta Semana (Hoje)
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
              title="Semana Seguinte"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-xs font-bold text-[#111827] block">
              Semana: {formattedWeekRange}
            </span>
            <span className="text-[11px] text-[#6B7280]">
              Segunda a Domingo com agendamentos em tempo real
            </span>
          </div>
        </div>
      ) : (
        /* Day Selector for Day View */
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-[#111827]">Data Selecionada:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-gray-300 text-[#111827] text-xs rounded-lg px-3 py-1.5 font-medium focus:border-[#C5A059] focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg border border-gray-200 transition-colors"
          >
            Ir para Hoje
          </button>
        </div>
      )}

      {/* Stats Quick Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] text-[#6B7280] font-medium">
            {viewMode === 'week' ? 'Agendamentos na Semana' : 'Agendamentos do Dia'}
          </p>
          <p className="text-xl font-bold text-[#111827] mt-1">
            {viewMode === 'week' ? weekTotalAppointments : dayViewAppointments.length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] text-[#6B7280] font-medium">Confirmados / Em Espera</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {viewMode === 'week' 
              ? weekConfirmedAppointments 
              : dayViewAppointments.filter(a => a.status === 'confirmed' || a.status === 'checked_in' || a.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] text-[#6B7280] font-medium">Concluídos</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {viewMode === 'week' 
              ? weekCompletedAppointments 
              : dayViewAppointments.filter(a => a.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] text-[#6B7280] font-medium">Faturação Prevista</p>
          <p className="text-xl font-bold text-[#8C6D23] mt-1">
            €{viewMode === 'week' ? weekTotalRevenue.toFixed(2) : dayViewAppointments.reduce((sum, a) => sum + (a.price || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* VIEW MODE 1: GRADE SEMANAL (SEGUNDA A DOMINGO - 7 COLUNAS) */}
      {viewMode === 'week' && (
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-[#6B7280] shadow-sm">
              Carregando grade semanal...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
              {weekDays.map(day => {
                const dayApps = appointmentsByDay[day.dateString] || [];
                const dayRevenue = dayApps.reduce((sum, a) => sum + (a.price || 0), 0);

                return (
                  <div
                    key={day.dateString}
                    className={`bg-white border rounded-xl flex flex-col min-h-[380px] shadow-sm transition-all ${
                      day.isToday 
                        ? 'border-[#C5A059] ring-2 ring-[#C5A059]/20' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Day Column Header */}
                    <div className={`p-3 border-b rounded-t-xl ${
                      day.isToday 
                        ? 'bg-gradient-to-br from-[#C5A059]/10 to-[#C5A059]/5 border-[#C5A059]/30' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black tracking-wider uppercase text-gray-500">
                          {day.shortName}
                        </span>
                        {day.isToday && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#C5A059] text-white">
                            HOJE
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline space-x-1 mt-0.5">
                        <span className={`text-base font-bold ${day.isToday ? 'text-[#8C6D23]' : 'text-[#111827]'}`}>
                          {day.dayNum}
                        </span>
                        <span className="text-[11px] text-[#6B7280] capitalize">
                          {day.monthShort}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 pt-1 border-t border-gray-200/60">
                        <span>{dayApps.length} {dayApps.length === 1 ? 'reserva' : 'reservas'}</span>
                        {dayRevenue > 0 && (
                          <span className="font-semibold text-[#8C6D23]">€{dayRevenue.toFixed(0)}</span>
                        )}
                      </div>
                    </div>

                    {/* Column Body: Appointments list for this specific day */}
                    <div className="p-2.5 flex-1 space-y-2 overflow-y-auto max-h-[520px]">
                      {dayApps.length === 0 ? (
                        <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-3 text-gray-400">
                          <p className="text-[11px] text-gray-400 font-medium">Sem agendamentos</p>
                          <button
                            onClick={() => onOpenNewBooking(day.dateString)}
                            className="mt-2 text-[10px] text-[#8C6D23] hover:text-[#73581c] font-semibold hover:underline flex items-center space-x-0.5"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Adicionar</span>
                          </button>
                        </div>
                      ) : (
                        dayApps.map(app => {
                          const startTime = getAppointmentTimeStr(app.startAt);
                          const endTime = getAppointmentTimeStr(app.endAt);

                          return (
                            <div
                              key={app.id}
                              className="bg-gray-50 hover:bg-white border border-gray-200 hover:border-[#C5A059]/50 rounded-lg p-2.5 space-y-2 transition-all shadow-2xs group"
                            >
                              {/* Time & Status */}
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] font-bold text-[#111827] flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span>{startTime}</span>
                                </span>
                                {getStatusBadge(app.status)}
                              </div>

                              {/* Service & Price */}
                              <div>
                                <p className="text-xs font-bold text-[#111827] line-clamp-1">
                                  {app.serviceName}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-[#6B7280] mt-0.5">
                                  <span className="font-semibold text-[#8C6D23]">€{(app.price || 0).toFixed(2)}</span>
                                  <span className="truncate max-w-[85px]">{app.professionalName || 'Staff'}</span>
                                </div>
                              </div>

                              {/* Client Info */}
                              <div className="text-[10px] text-gray-600 pt-1 border-t border-gray-200/80">
                                <p className="font-semibold text-gray-900 truncate">
                                  {app.clientName || 'Cliente'}
                                </p>
                                {app.clientPhone && (
                                  <p className="text-gray-500 font-mono text-[9px] truncate">
                                    {app.clientPhone}
                                  </p>
                                )}
                              </div>

                              {/* Actions Bar */}
                              <div className="pt-1 flex items-center justify-between gap-1">
                                {app.status === 'confirmed' && (
                                  <button
                                    onClick={() => handleStatusChange(app.id, 'checked_in')}
                                    className="flex-1 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9px] font-bold text-center transition-colors"
                                  >
                                    Check-in
                                  </button>
                                )}

                                {(app.status === 'confirmed' || app.status === 'checked_in') && (
                                  <button
                                    onClick={() => handleStatusChange(app.id, 'in_progress')}
                                    className="flex-1 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-[9px] font-bold text-center transition-colors flex items-center justify-center space-x-0.5"
                                  >
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    <span>Iniciar</span>
                                  </button>
                                )}

                                {app.status === 'in_progress' && (
                                  <button
                                    onClick={() => {
                                      handleStatusChange(app.id, 'completed');
                                      onLaunchPOSWithAppointment(app);
                                    }}
                                    className="flex-1 py-1 bg-[#C5A059] hover:bg-[#B38F46] text-white rounded text-[9px] font-bold text-center transition-colors flex items-center justify-center space-x-0.5"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>Cobrar</span>
                                  </button>
                                )}

                                {app.status === 'completed' && (
                                  <button
                                    onClick={() => onLaunchPOSWithAppointment(app)}
                                    className="flex-1 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 rounded text-[9px] font-bold text-center transition-colors flex items-center justify-center space-x-0.5"
                                  >
                                    <DollarSign className="w-2.5 h-2.5" />
                                    <span>Caixa</span>
                                  </button>
                                )}

                                {app.status !== 'cancelled' && app.status !== 'completed' && (
                                  <>
                                    <button
                                      onClick={() => handleOpenReschedule(app)}
                                      title="Remarcar Reserva"
                                      className="p-1 hover:bg-[#C5A059]/15 text-[#8C6D23] rounded transition-colors"
                                    >
                                      <CalendarIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(app.id, 'cancelled')}
                                      title="Cancelar Reserva"
                                      className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Column Footer: Quick Add for that day */}
                    <div className="p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                      <button
                        onClick={() => onOpenNewBooking(day.dateString)}
                        className="w-full py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center space-x-1"
                      >
                        <Plus className="w-3 h-3 text-[#8C6D23]" />
                        <span>Marcar {day.shortName}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: VISÃO DIÁRIA INDIVIDUAL */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-[#6B7280] text-xs">Carregando agendamentos...</div>
          ) : dayViewAppointments.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto text-gray-400">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <p className="text-[#111827] font-semibold text-sm">Sem agendamentos para o dia {selectedDate}.</p>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Utilize o botão abaixo para registar um novo agendamento para esta data.
              </p>
              <button
                onClick={() => onOpenNewBooking(selectedDate)}
                className="inline-flex items-center space-x-1.5 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Agendamento para {selectedDate}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayViewAppointments.map((app) => {
                const startTime = getAppointmentTimeStr(app.startAt);
                const endTime = getAppointmentTimeStr(app.endAt);

                return (
                  <div 
                    key={app.id} 
                    className="bg-white border border-gray-200 hover:border-gray-300 p-4 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Time Badge */}
                      <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-center flex-shrink-0">
                        <p className="text-sm font-bold text-[#111827] font-mono">{startTime}</p>
                        <p className="text-[10px] text-[#6B7280] font-mono">até {endTime}</p>
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-[#111827] text-sm">{app.serviceName}</h3>
                          {getStatusBadge(app.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B7280]">
                          <span className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-[#8C6D23]" />
                            <strong className="text-[#111827]">{app.clientName}</strong> ({app.clientPhone})
                          </span>
                          <span className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>Profissional: <strong className="text-[#111827]">{app.professionalName}</strong></span>
                          </span>
                        </div>
                        {app.notes && (
                          <p className="text-[11px] text-[#6B7280] italic">Nota: "{app.notes}"</p>
                        )}
                      </div>
                    </div>

                    {/* Right Actions & Price */}
                    <div className="flex items-center justify-between md:justify-end space-x-4 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                      <div className="text-right">
                        <p className="text-xs text-[#6B7280]">Preço</p>
                        <p className="text-base font-bold text-[#8C6D23]">€{(app.price || 0).toFixed(2)}</p>
                      </div>

                      {/* Status Transition Action Buttons */}
                      <div className="flex items-center space-x-1.5">
                        {app.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusChange(app.id, 'checked_in')}
                            title="Marcar como 'Chegou à Recepção'"
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            Check-in
                          </button>
                        )}

                        {(app.status === 'confirmed' || app.status === 'checked_in') && (
                          <button
                            onClick={() => handleStatusChange(app.id, 'in_progress')}
                            title="Iniciar Atendimento"
                            className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Iniciar</span>
                          </button>
                        )}

                        {app.status === 'in_progress' && (
                          <button
                            onClick={() => {
                              handleStatusChange(app.id, 'completed');
                              onLaunchPOSWithAppointment(app);
                            }}
                            title="Concluir Atendimento e Abrir Caixa/POS"
                            className="bg-[#C5A059] hover:bg-[#B38F46] text-white text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Concluir & Cobrar</span>
                          </button>
                        )}

                        {app.status === 'completed' && (
                          <button
                            onClick={() => onLaunchPOSWithAppointment(app)}
                            className="bg-gray-100 hover:bg-gray-200 text-[#111827] border border-gray-200 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Ver no Caixa</span>
                          </button>
                        )}

                        {app.status !== 'cancelled' && app.status !== 'completed' && (
                          <>
                            <button
                              onClick={() => handleOpenReschedule(app)}
                              title="Remarcar Horário"
                              className="p-1.5 hover:bg-[#C5A059]/15 text-[#8C6D23] rounded-lg transition-colors"
                            >
                              <CalendarIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(app.id, 'cancelled')}
                              title="Cancelar Reserva"
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingApp && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div>
              <h3 className="text-base font-bold text-[#111827] flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-[#8C6D23]" />
                <span>Remarcar Reserva</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Selecione um novo dia e horário para <strong>{reschedulingApp.clientName}</strong>.
              </p>
            </div>

            {rescheduleError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                {rescheduleError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-500 font-semibold mb-0.5">Profissional:</p>
                <p className="text-[#111827] font-bold">{reschedulingApp.professionalName}</p>
              </div>

              <div>
                <p className="text-gray-500 font-semibold mb-0.5">Serviço:</p>
                <p className="text-[#111827] font-bold">{reschedulingApp.serviceName} (€{reschedulingApp.price.toFixed(2)})</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111827] font-semibold mb-1">Nova Data:</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2 font-medium focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#111827] font-semibold mb-1">Novo Horário:</label>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2 font-medium focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setReschedulingApp(null)}
                disabled={isRescheduling}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-[#111827] font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveReschedule}
                disabled={isRescheduling}
                className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
              >
                {isRescheduling ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>A remarcar...</span>
                  </>
                ) : (
                  <span>Confirmar Alteração</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
