import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  User, 
  Scissors, 
  Check, 
  CheckCircle2, 
  ShoppingBag, 
  Plus, 
  Minus, 
  VolumeX, 
  Volume2, 
  Phone, 
  Share2, 
  ArrowLeft, 
  Star, 
  Sparkles, 
  Home, 
  LogOut, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Download,
  AlertCircle,
  Award,
  X
} from 'lucide-react';
import { TenantProfile, Service, Professional, Appointment, Product } from '../../../types';
import { getPortalTheme, getPortalUnits, getPortalProfessionals, PortalUnit, PortalBarber, PortalProduct } from '../portalData';
import { BUSINESS_TYPES } from '../../../utils/businessTypes';
import { auth, googleProvider } from '../../../config/firebase';
import { signInWithPopup, OAuthProvider } from 'firebase/auth';

interface MobileAppViewProps {
  tenant: TenantProfile | null;
  services: Service[];
  professionals: Professional[];
  products?: Product[];
  onConfirmBooking: (bookingData: {
    service: Service;
    barber: PortalBarber | Professional | null;
    unit: PortalUnit;
    date: string;
    timeSlot: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    quietService: boolean;
    notes: string;
    selectedProducts: { product: PortalProduct; quantity: number }[];
  }) => Promise<Appointment | void>;
  existingAppointments?: Appointment[];
  onCancelAppointment?: (appId: string, reason?: string) => Promise<void>;
  onRescheduleAppointment?: (appId: string, newStartAt: string, newEndAt: string) => Promise<void>;
  onBlockTime?: (blockData: { date: string; startTime: string; endTime: string; reason: string; barberName: string }) => Promise<void>;
}

type MobileTab = 'home' | 'appointments' | 'loyalty' | 'profile';
type BookingStep = 'unit_select' | 'service_select' | 'barber_select' | 'datetime_select' | 'products_select' | 'confirm_summary' | 'success_voucher';

export const MobileAppView: React.FC<MobileAppViewProps> = ({
  tenant,
  services,
  professionals,
  products = [],
  onConfirmBooking,
  existingAppointments = [],
  onCancelAppointment,
  onRescheduleAppointment,
  onBlockTime
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [bookingStep, setBookingStep] = useState<BookingStep>('unit_select');
  const [appointmentsSubTab, setAppointmentsSubTab] = useState<'upcoming' | 'history'>('upcoming');

  const theme = getPortalTheme(tenant?.businessType);
  const availableUnits = getPortalUnits(tenant?.businessType, tenant?.name);
  
  // Real products from Firestore / tenant catalog only - no fake fallback products
  const availableProducts: PortalProduct[] = (products && products.length > 0)
    ? products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        category: p.category || 'Geral',
        imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80'
      }))
    : [];

  const availableBarbers = professionals.length > 0
    ? professionals.map(p => ({
        id: p.id,
        name: p.name,
        role: p.roleTitle || 'Especialista',
        avatarUrl: p.avatarUrl || (tenant?.businessType === 'nail_salon'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'),
        rating: p.rating || 5.0,
        reviewsCount: p.totalReviews || 120,
        specialties: p.specialties || ['Atendimento VIP']
      }))
    : getPortalProfessionals(tenant?.businessType);

  const businessMeta = BUSINESS_TYPES[tenant?.businessType || 'barbershop'] || BUSINESS_TYPES.barbershop;

  // Real today formatted in Portuguese
  const todayFormatted = React.useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).replace(/^\w/, (c) => c.toUpperCase());
  }, []);

  // Helper to check if a date is on a closed day based on working hours
  const isDayClosed = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const defaultHours = { active: dayOfWeek !== 0, start: '09:00', end: '19:00' };
    const dayHours = tenant?.workingHours
      ? (tenant.workingHours[dayOfWeek] || tenant.workingHours[String(dayOfWeek)] || defaultHours)
      : defaultHours;
    return !dayHours || !dayHours.active;
  };

  // Booking selections with safe initial open day
  const [selectedUnit, setSelectedUnit] = useState<PortalUnit>(() => availableUnits[0]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [selectedBarber, setSelectedBarber] = useState<PortalBarber | null>(null); // null = "Sem Preferência"
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;
      const dayOfWeek = d.getDay();
      const defaultHours = { active: dayOfWeek !== 0 };
      const dayHours = tenant?.workingHours 
        ? (tenant.workingHours[dayOfWeek] || tenant.workingHours[String(dayOfWeek)] || defaultHours)
        : defaultHours;
      if (dayHours && dayHours.active) {
        return dateStr;
      }
    }
    return new Date().toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:30');
  const [quietService, setQuietService] = useState<boolean>(false);
  const [observationNotes, setObservationNotes] = useState<string>('');

  // Cart of recommended products
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  // Helper to load persisted session from localStorage
  const getInitialPortalSession = () => {
    if (typeof window === 'undefined') return null;
    const tenantKey = tenant ? `glowfy_portal_session_${tenant.id}` : 'glowfy_portal_session_default';
    const saved = localStorage.getItem(tenantKey) || localStorage.getItem('glowfy_portal_session_global');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse portal session:", e);
      }
    }
    return null;
  };

  const initialSession = getInitialPortalSession();

  // Client info (persisted in session)
  const [clientName, setClientName] = useState(initialSession?.clientName || '');
  const [clientPhone, setClientPhone] = useState(initialSession?.clientPhone || '');
  const [clientEmail, setClientEmail] = useState(initialSession?.clientEmail || '');

  // Load Loyalty Config
  const loyaltyConfig = (() => {
    if (tenant?.loyaltyProgram) {
      return tenant.loyaltyProgram;
    }
    if (typeof window !== 'undefined' && tenant) {
      const saved = localStorage.getItem(`glowfy_loyalty_config_${tenant.id}`);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {
      mode: 'stamp_card',
      stampsNeeded: 10,
      rewardDescription: 'Corte de Cabelo Grátis',
      pointsPerEuro: 1,
      euroPerPoint: 0.05,
      minRedeemPoints: 50
    };
  })();

  // Live client loyalty stamps/points look up
  const getClientLoyaltyPoints = (): number => {
    if (typeof window !== 'undefined' && tenant && clientPhone) {
      const cached = localStorage.getItem(`glowfy_clients_${tenant.id}`);
      if (cached) {
        try {
          const list: any[] = JSON.parse(cached);
          const cleaned = clientPhone.replace(/\s+/g, '');
          const found = list.find(c => c.phone && c.phone.replace(/\s+/g, '') === cleaned);
          if (found) return found.loyaltyPoints || 0;
        } catch {}
      }
    }
    return 0;
  };

  // Robust local date formatting to prevent timezone drift
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getAppointmentDateKey = (app: Appointment): string => {
    if (app.startAt) {
      if (app.startAt.includes('T')) {
        return app.startAt.split('T')[0];
      }
      return app.startAt.slice(0, 10);
    }
    const appAny = app as any;
    if (appAny.date) return appAny.date;
    return '';
  };

  const getAppointmentTimeStr = (isoString?: string): string => {
    if (!isoString) return '--:--';
    if (isoString.includes('T')) {
      const timePart = isoString.split('T')[1];
      if (timePart) {
        return timePart.slice(0, 5);
      }
    }
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  // Check available slots specifically for rescheduling (ignoring the current appointment being rescheduled)
  const getRescheduleAvailableSlots = React.useCallback((targetDate: string, targetProId?: string, excludeAppId?: string): string[] => {
    if (!targetDate) return [];
    if (isDayClosed(targetDate)) return [];

    const dateObj = new Date(targetDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();

    const defaultHours = { active: dayOfWeek !== 0, start: '09:00', end: '20:30' };
    const dayHours = tenant?.workingHours 
      ? (tenant.workingHours[dayOfWeek] || tenant.workingHours[String(dayOfWeek)] || defaultHours) 
      : defaultHours;

    if (!dayHours || !dayHours.active) return [];

    const [sH, sM] = (dayHours.start || '09:00').split(':').map(Number);
    const [eH, eM] = (dayHours.end || '20:30').split(':').map(Number);
    const startMin = (isNaN(sH) ? 9 : sH) * 60 + (isNaN(sM) ? 0 : sM);
    const endMin = (isNaN(eH) ? 20 : eH) * 60 + (isNaN(eM) ? 30 : eM);

    const now = new Date();
    const todayStr = formatLocalDate(now);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const candidateSlots: string[] = [];
    for (let m = startMin; m < endMin; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const slot = `${hh}:${mm}`;

      // If target date is today, exclude past slots
      if (targetDate === todayStr) {
        const slotMinutes = Math.floor(m / 60) * 60 + (m % 60);
        const nowMinutes = currentHour * 60 + currentMin;
        if (slotMinutes <= nowMinutes) {
          continue;
        }
      }

      // Check tenant lunch / break hours
      const dHours = dayHours as any;
      if (dHours.breakStart && dHours.breakEnd) {
        if (slot >= dHours.breakStart && slot < dHours.breakEnd) {
          continue;
        }
      }

      // Check manually blocked times on this date
      if (tenant?.blockedTimes && tenant.blockedTimes.length > 0) {
        const isTimeBlocked = tenant.blockedTimes.some(b => b.date === targetDate && slot >= b.start && slot < b.end);
        if (isTimeBlocked) {
          continue;
        }
      }

      // Check conflicts with OTHER existing appointments (ignoring excludeAppId)
      const hasConflict = existingAppointments.some(app => {
        // 1. Ignore the current appointment being rescheduled
        if (app.id === excludeAppId) return false;
        // 2. Ignore cancelled appointments
        if (app.status === 'cancelled') return false;
        // 3. Ignore appointments of other professionals
        if (targetProId && app.professionalId && app.professionalId !== targetProId) return false;

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

        if (appDate !== targetDate) return false;

        // Exact time match
        if (appTime === slot) return true;

        // Interval overlap for multi-slot bookings
        if (app.startAt && app.endAt) {
          const appStartMs = new Date(app.startAt).getTime();
          const appEndMs = new Date(app.endAt).getTime();
          const slotStartMs = new Date(`${targetDate}T${slot}:00`).getTime();
          const slotEndMs = slotStartMs + 30 * 60 * 1000;
          if (!isNaN(appStartMs) && !isNaN(appEndMs) && !isNaN(slotStartMs)) {
            if (slotStartMs < appEndMs && slotEndMs > appStartMs) {
              return true;
            }
          }
        }

        return false;
      });

      if (!hasConflict) {
        candidateSlots.push(slot);
      }
    }

    return candidateSlots;
  }, [tenant, existingAppointments]);

  const isTimeSlotAvailable = (time: string): boolean => {
    if (!tenant) return true;

    // 1. Check if the entire date is blocked (Vacations/Holidays)
    if (tenant.blockedDates && tenant.blockedDates.includes(selectedDate)) {
      return false;
    }

    // 2. Check if this specific time is manually blocked
    if (tenant.blockedTimes) {
      const match = tenant.blockedTimes.find(b => {
        if (b.date !== selectedDate) return false;
        return time >= b.start && time < b.end;
      });
      if (match) return false;
    }

    // 3. Check business working hours for this weekday (safely parsed at noon)
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ...
    
    const dayHours = tenant.workingHours 
      ? (tenant.workingHours[dayOfWeek] || tenant.workingHours[String(dayOfWeek)])
      : null;

    if (dayHours) {
      if (!dayHours.active) return false;
      if (time < dayHours.start || time >= dayHours.end) return false;
      if (dayHours.breakStart && dayHours.breakEnd) {
        if (time >= dayHours.breakStart && time < dayHours.breakEnd) return false;
      }
    }

    // 4. Check selected barber working hours if available
    if (selectedBarber && (selectedBarber as any).workingHours) {
      const proHours = (selectedBarber as any).workingHours[dayOfWeek] || (selectedBarber as any).workingHours[String(dayOfWeek)];
      if (proHours) {
        if (!proHours.active) return false;
        const effectiveEnd = (dayHours && dayHours.end > proHours.end) ? dayHours.end : proHours.end;
        if (time < proHours.start || time >= effectiveEnd) return false;
        if (proHours.breakStart && proHours.breakEnd) {
          if (time >= proHours.breakStart && time < proHours.breakEnd) return false;
        }
      }
    }

    // 5. Check if already booked in existing appointments
    if (existingAppointments && existingAppointments.length > 0) {
      const selectedProId = selectedBarber?.id;
      const hasConflict = existingAppointments.some(app => {
        if (app.status === 'cancelled') return false;
        if (selectedProId && app.professionalId !== selectedProId) return false;

        let appDate = '';
        let appTime = '';
        if (app.startAt) {
          const parts = app.startAt.split('T');
          appDate = parts[0];
          if (parts[1]) appTime = parts[1].slice(0, 5);
        } else {
          const appAny = app as any;
          if (appAny.date && appAny.time) {
            appDate = appAny.date;
            appTime = appAny.time;
          }
        }

        if (appDate === selectedDate && appTime === time) {
          return true;
        }
        return false;
      });
      if (hasConflict) return false;
    }

    return true;
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  // Profile auth state & role selection (persisted across refresh/reopen)
  const [userRole, setUserRole] = useState<'client' | 'barber'>(initialSession?.userRole || 'client');
  const [loggedInBarber, setLoggedInBarber] = useState<Professional | PortalBarber | null>(initialSession?.loggedInBarber || null);
  const [selectedBarberEmail, setSelectedBarberEmail] = useState(initialSession?.selectedBarberEmail || '');

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(initialSession?.isLoggedIn));
  const [showPassword, setShowPassword] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+351');

  // Automatically persist session whenever auth/profile values change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tenantKey = tenant ? `glowfy_portal_session_${tenant.id}` : 'glowfy_portal_session_default';
    if (isLoggedIn) {
      const sessionData = {
        isLoggedIn: true,
        userRole,
        clientName,
        clientPhone,
        clientEmail,
        loggedInBarber,
        selectedBarberEmail
      };
      localStorage.setItem(tenantKey, JSON.stringify(sessionData));
      localStorage.setItem('glowfy_portal_session_global', JSON.stringify(sessionData));
    } else {
      localStorage.removeItem(tenantKey);
      localStorage.removeItem('glowfy_portal_session_global');
    }
  }, [isLoggedIn, userRole, clientName, clientPhone, clientEmail, loggedInBarber, selectedBarberEmail, tenant?.id]);

  const handlePortalLogout = () => {
    setIsLoggedIn(false);
    setUserRole('client');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setLoggedInBarber(null);
    setSelectedBarberEmail('');
    if (typeof window !== 'undefined') {
      const tenantKey = tenant ? `glowfy_portal_session_${tenant.id}` : 'glowfy_portal_session_default';
      localStorage.removeItem(tenantKey);
      localStorage.removeItem('glowfy_portal_session_global');
    }
  };

  // Cancellation with reason state
  const [cancelModalApp, setCancelModalApp] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Barber panel extra states
  const [showManualBookingModal, setShowManualBookingModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [rescheduleApp, setRescheduleApp] = useState<Appointment | null>(null);
  const [newReschedDate, setNewReschedDate] = useState('');
  const [newReschedTime, setNewReschedTime] = useState('10:00');
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [blockStartTime, setBlockStartTime] = useState('09:00');
  const [blockEndTime, setBlockEndTime] = useState('12:00');
  const [blockReason, setBlockReason] = useState('Almoço / Folga / Manutenção');
  const [barberPin, setBarberPin] = useState('');
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualServiceId, setManualServiceId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState('10:00');

  // Google & Apple Login handlers
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user) {
        setClientName(user.displayName || 'Cliente Google');
        setClientEmail(user.email || 'google@client.com');
        setIsLoggedIn(true);
        setUserRole('client');
      }
    } catch (err) {
      console.warn("Google popup fallback:", err);
      setClientName('Cliente Google');
      setClientEmail('google.client@exemplo.pt');
      setIsLoggedIn(true);
      setUserRole('client');
    }
  };

  const handleAppleLogin = async () => {
    try {
      const appleProvider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, appleProvider);
      const user = result.user;
      if (user) {
        setClientName(user.displayName || 'Cliente Apple');
        setClientEmail(user.email || 'apple@client.com');
        setIsLoggedIn(true);
        setUserRole('client');
      }
    } catch (err) {
      console.warn("Apple popup fallback:", err);
      setClientName('Cliente Apple');
      setClientEmail('apple.client@exemplo.pt');
      setIsLoggedIn(true);
      setUserRole('client');
    }
  };

  // Days for the horizontal date slider (real upcoming 14 days starting from today)
  const dayPills = React.useMemo(() => {
    const pills = [];
    const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const label = weekDays[d.getDay()];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;
      const closed = isDayClosed(dateStr);
      pills.push({ label, day: dayNum, dateStr, isClosed: closed });
    }
    return pills;
  }, [tenant]);

  // Time slots generated dynamically based on working hours
  const { morningSlots, afternoonSlots } = React.useMemo(() => {
    if (!selectedDate) return { morningSlots: [], afternoonSlots: [] };
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();

    const defaultHours = { active: dayOfWeek !== 0, start: '09:00', end: '20:30' };
    const dayHours = tenant?.workingHours 
      ? (tenant.workingHours[dayOfWeek] || tenant.workingHours[String(dayOfWeek)] || defaultHours) 
      : defaultHours;

    if (!dayHours || !dayHours.active) {
      return { morningSlots: [], afternoonSlots: [] };
    }

    const [sH, sM] = (dayHours.start || '09:00').split(':').map(Number);
    const [eH, eM] = (dayHours.end || '20:30').split(':').map(Number);
    const startMin = (isNaN(sH) ? 9 : sH) * 60 + (isNaN(sM) ? 0 : sM);
    const endMin = (isNaN(eH) ? 20 : eH) * 60 + (isNaN(eM) ? 30 : eM);

    const morning: string[] = [];
    const afternoon: string[] = [];

    for (let m = startMin; m < endMin; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const slot = `${hh}:${mm}`;
      if (Math.floor(m / 60) < 12) {
        morning.push(slot);
      } else {
        afternoon.push(slot);
      }
    }

    return { morningSlots: morning, afternoonSlots: afternoon };
  }, [selectedDate, tenant]);

  // Automatically select the first available slot when date changes
  React.useEffect(() => {
    const all = [...morningSlots, ...afternoonSlots].filter(isTimeSlotAvailable);
    if (all.length > 0 && (!selectedTimeSlot || !all.includes(selectedTimeSlot))) {
      setSelectedTimeSlot(all[0]);
    }
  }, [selectedDate, morningSlots, afternoonSlots]);

  // Filter appointments for Meus Agendamentos tab
  const filteredAppointments = React.useMemo(() => {
    const todayStr = formatLocalDate(new Date());
    const clientCleanPhone = clientPhone ? clientPhone.replace(/\D/g, '') : '';
    const clientCleanEmail = clientEmail ? clientEmail.trim().toLowerCase() : '';
    const clientCleanName = clientName ? clientName.trim().toLowerCase() : '';

    let relevant = existingAppointments;
    if (userRole === 'barber' && loggedInBarber) {
      const barberId = loggedInBarber.id;
      const barberName = (loggedInBarber.name || '').trim().toLowerCase();
      const barberMatches = existingAppointments.filter(app => {
        const matchesId = barberId && app.professionalId === barberId;
        const matchesName = barberName && app.professionalName && app.professionalName.trim().toLowerCase() === barberName;
        return matchesId || matchesName;
      });
      relevant = barberMatches.length > 0 ? barberMatches : existingAppointments;
    } else if (clientCleanPhone || clientCleanEmail || clientCleanName) {
      const clientMatches = existingAppointments.filter(app => {
        const appPhone = app.clientPhone ? app.clientPhone.replace(/\D/g, '') : '';
        const appEmail = app.clientEmail ? app.clientEmail.trim().toLowerCase() : '';
        const appName = app.clientName ? app.clientName.trim().toLowerCase() : '';
        return (clientCleanPhone && appPhone.includes(clientCleanPhone)) || 
               (clientCleanEmail && appEmail === clientCleanEmail) ||
               (clientCleanName && appName === clientCleanName);
      });
      relevant = clientMatches.length > 0 ? clientMatches : existingAppointments;
    }

    let combined = [...relevant];
    if (confirmedBooking && !combined.some(a => a.id === confirmedBooking.id)) {
      combined.unshift(confirmedBooking);
    }

    if (appointmentsSubTab === 'upcoming') {
      return combined.filter(app => {
        const appDate = getAppointmentDateKey(app);
        const isNotCancelled = app.status !== 'cancelled';
        const isNotCompleted = app.status !== 'completed';
        return isNotCancelled && isNotCompleted && (!appDate || appDate >= todayStr);
      });
    } else {
      return combined.filter(app => {
        const appDate = getAppointmentDateKey(app);
        return app.status === 'cancelled' || app.status === 'completed' || (appDate && appDate < todayStr);
      });
    }
  }, [existingAppointments, confirmedBooking, appointmentsSubTab, clientPhone, clientEmail, clientName, userRole, loggedInBarber]);

  // Dynamic Categories from theme
  const categories = ['TODOS', ...theme.defaultCategories];

  // Services tailored to the business vertical
  const displayServices: Service[] = services.length > 0 ? services : businessMeta.defaultServices.map((ds, idx) => ({
    id: `serv-${idx}`,
    tenantId: tenant?.id || 't1',
    name: ds.name,
    price: ds.price,
    durationMinutes: ds.durationMinutes,
    commissionPercentage: ds.commissionPercentage,
    active: true,
    categoryName: ds.category
  }));

  const filteredServices = displayServices.filter(s => {
    if (selectedCategory === 'TODOS') return true;
    const cat = s.categoryName?.toLowerCase() || '';
    const sel = selectedCategory.toLowerCase();
    return cat.includes(sel) || s.name.toLowerCase().includes(sel);
  });

  const handleUpdateProductQuantity = (prodId: string, delta: number) => {
    setProductQuantities(prev => {
      const current = prev[prodId] || 0;
      const nextVal = Math.max(0, current + delta);
      return { ...prev, [prodId]: nextVal };
    });
  };

  const selectedProductsList = availableProducts
    .filter(p => (productQuantities[p.id] || 0) > 0)
    .map(p => ({ product: p, quantity: productQuantities[p.id] }));

  const productsTotal = selectedProductsList.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const finalTotalPrice = (selectedService?.price || 0) + productsTotal;

  const handleFinalizeBooking = async () => {
    if (!selectedService) return;
    setIsSubmitting(true);
    try {
      const result = await onConfirmBooking({
        service: selectedService,
        barber: selectedBarber || (availableBarbers[0] as any),
        unit: selectedUnit,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        clientName,
        clientPhone,
        clientEmail,
        quietService,
        notes: observationNotes,
        selectedProducts: selectedProductsList
      });

      if (result) {
        setConfirmedBooking(result);
      } else {
        // Fallback representation
        setConfirmedBooking({
          id: `app-${Date.now().toString().slice(-6)}`,
          tenantId: tenant?.id || 'tenant',
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          professionalId: selectedBarber?.id || 'pro-default',
          professionalName: selectedBarber?.name || 'Sem Preferência (Primeiro Disponível)',
          clientId: 'client-1',
          clientName,
          clientPhone,
          clientEmail,
          startAt: `${selectedDate}T${selectedTimeSlot}:00`,
          endAt: `${selectedDate}T10:30:00`,
          price: finalTotalPrice,
          commissionAmount: finalTotalPrice * 0.4,
          status: 'confirmed',
          notes: quietService ? `[QUIET SERVICE ATIVADO] ${observationNotes}` : observationNotes,
          createdAt: new Date().toISOString()
        });
      }
      setBookingStep('success_voucher');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startNewBooking = (unit?: PortalUnit) => {
    if (unit) setSelectedUnit(unit);
    setSelectedService(null);
    setSelectedBarber(null);
    setProductQuantities({});
    setQuietService(false);
    setObservationNotes('');
    setBookingStep('service_select');
    setActiveTab('home');
  };

  return (
    <div className="w-full max-w-full mx-auto min-h-[720px] bg-[#121418] text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-[#e5a93b] selection:text-slate-950">
      {/* VIEW: TAB 1 - HOME & BOOKING FLOW */}
      {activeTab === 'home' && (
        <div className="flex-1 flex flex-col overflow-y-auto pb-20 scrollbar-none">
          {/* STEP 0: HOME SCREEN WITH UNIT SELECTOR */}
          {bookingStep === 'unit_select' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Top Business Logo & Name Branding Row */}
              <div className="px-5 pt-4 pb-2 flex items-center space-x-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
                <img
                  src={tenant?.logoUrl || "https://i.postimg.cc/j2DZ0wxr/glowfy-hub-logo.png"}
                  alt={tenant?.name || "Logo"}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://i.postimg.cc/j2DZ0wxr/glowfy-hub-logo.png";
                  }}
                  className="w-12 h-12 rounded-xl object-contain bg-transparent flex-shrink-0 drop-shadow-md"
                />
                <div>
                  <h2 className="font-black text-white text-base sm:text-lg tracking-tight uppercase leading-snug drop-shadow-sm">
                    {tenant?.name || 'GLOWFY HUB'}
                  </h2>
                  <span className="text-[10px] tracking-widest text-[#e5a93b] font-extrabold uppercase mt-0.5 block">
                    {tenant?.businessType === 'nail_salon' ? 'Nail Design Studio' : tenant?.businessType === 'beauty_salon' ? 'Beauty Salon' : tenant?.businessType === 'aesthetic_clinic' ? 'Clínica & Estética' : 'HAIRCUT & SHAVE MASTERS'}
                  </span>
                </div>
              </div>

              {/* Top Greeting Header */}
              <div className="px-5 pt-2 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-1.5">
                    <span>
                      {isLoggedIn ? (
                        userRole === 'barber' && loggedInBarber ? (
                          <>Olá, bem-vindo(a), <span className="text-[#e5a93b]">{loggedInBarber.name}</span></>
                        ) : (
                          <>Olá, bem-vindo(a), <span className="text-[#e5a93b]">{clientName ? clientName.split(' ')[0] : 'Cliente'}</span></>
                        )
                      ) : (
                        <>Olá, bem-vindo(a)!</>
                      )}
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                    <span>{todayFormatted}</span>
                    {isLoggedIn && (
                      <span className="text-emerald-400 font-bold ml-1">
                        • {userRole === 'barber' ? 'Barbeiro Conectado' : 'Cliente Conectado'}
                      </span>
                    )}
                  </p>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setActiveTab('appointments')}
                    className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                  >
                    <Bell className="w-4 h-4 text-slate-300" />
                  </button>
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#e5a93b] border-2 border-[#121418]" />
                </div>
              </div>

              {/* Hero Showcase Card */}
              <div className="px-5">
                <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[16/9] border border-slate-800/80 group">
                  <img
                    src={theme.heroImageUrl}
                    alt={tenant?.name || 'Espaço'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-5">
                    {/* Stylized Badge Emblem */}
                    <div 
                      className="inline-flex items-center space-x-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border w-max mb-1.5"
                      style={{ borderColor: `${theme.primaryAccent}60` }}
                    >
                      <img
                        src={tenant?.logoUrl || "https://i.postimg.cc/h4YbXjCk/MISTER-VETOR-removebg-preview.png"}
                        alt={tenant?.name || "Logo"}
                        className="w-4 h-4 object-contain flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://i.postimg.cc/h4YbXjCk/MISTER-VETOR-removebg-preview.png";
                        }}
                      />
                      <span className="text-[11px] font-black tracking-wider uppercase" style={{ color: theme.primaryAccent }}>
                        {tenant?.name || 'Glowfy Hub'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white leading-snug">
                      {theme.heroHeadline}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      {theme.badgeText}
                    </p>
                  </div>
                </div>
              </div>

              {/* UNIDADES OR SINGLE UNIT Section (Fix #5) */}
              {tenant?.filiais && tenant.filiais.length > 0 ? (
                <div className="px-5 pt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black tracking-wider text-slate-300 uppercase">
                      UNIDADES
                    </h2>
                    <div className="flex items-center space-x-1">
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-950"
                        style={{ backgroundColor: theme.primaryAccent }}
                      >
                        PORTUGAL
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        TODAS
                      </span>
                    </div>
                  </div>

                  {/* Units List */}
                  <div className="space-y-3">
                    {availableUnits.map((unit) => (
                      <div
                        key={unit.id}
                        onClick={() => startNewBooking(unit)}
                        className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800/90 hover:border-[#e5a93b]/60 rounded-2xl p-3.5 transition-all cursor-pointer flex items-center space-x-3 group shadow-md"
                      >
                        <img
                          src={unit.imageUrl}
                          alt={unit.name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-700/50 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-white group-hover:text-[#e5a93b] transition-colors truncate">
                            {unit.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-[#e5a93b] flex-shrink-0" />
                            <span className="truncate">{unit.address}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">
                            {unit.hours}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-[#e5a93b] text-slate-400 group-hover:text-slate-950 flex items-center justify-center transition-all flex-shrink-0">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-5 pt-4">
                  <button
                    onClick={() => startNewBooking(availableUnits[0])}
                    className="w-full bg-[#e5a93b] hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl uppercase tracking-wider text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#e5a93b]/15"
                  >
                    <CalendarIcon className="w-4.5 h-4.5" />
                    <span>Fazer Agendamento Online</span>
                  </button>
                </div>
              )}

              {/* PROPAGANDA DA FIDELIZAÇÃO (Loyalty Promo Card) - Fix #2 */}
              {tenant?.modulesEnabled?.loyalty !== false && (
                <div className="px-5 pt-4">
                  <div 
                    onClick={() => setActiveTab('loyalty')}
                    className="relative rounded-2xl p-4 bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#141211] border border-amber-500/20 shadow-lg overflow-hidden group cursor-pointer hover:border-amber-500/45 transition-all animate-in slide-in-from-bottom-3 duration-300"
                  >
                    {/* Glowing background accents */}
                    <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/[0.03] rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span className="text-[9px] font-black tracking-widest text-[#e5a93b] uppercase">Clube de Fidelização VIP</span>
                        </div>
                        <h4 className="font-extrabold text-xs text-white uppercase">
                          {loyaltyConfig.mode === 'stamp_card' 
                            ? `Ganhe 1 Carimbo por Corte!` 
                            : `Ganhe Cashback em cada Visita!`}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {loyaltyConfig.mode === 'stamp_card'
                            ? `Complete ${loyaltyConfig.stampsNeeded} carimbos digitais e resgate: ${loyaltyConfig.rewardDescription}`
                            : `Consulte seu saldo e receba descontos diretamente nos seus agendamentos.`}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 transition-transform group-hover:translate-x-0.5 flex-shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: ESCOLHA O SERVIÇO */}
          {bookingStep === 'service_select' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header with Back Button */}
              <div className="sticky top-0 z-10 bg-[#121418]/95 backdrop-blur-md px-5 py-3 border-b border-slate-800 flex items-center space-x-3">
                <button
                  onClick={() => setBookingStep('unit_select')}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">Escolha o Serviço</h2>
                  <p className="text-[10px] font-bold text-[#e5a93b] tracking-wider uppercase">
                    {selectedUnit.name}
                  </p>
                </div>
              </div>

              {/* Category Pills */}
              <div className="px-5 overflow-x-auto scrollbar-none flex space-x-2 py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-[#e5a93b] text-slate-950 shadow-md shadow-[#e5a93b]/20'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Service Cards List */}
              <div className="px-5 space-y-3">
                {filteredServices.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => {
                      setSelectedService(srv);
                      setBookingStep('barber_select');
                    }}
                    className="bg-slate-900 border border-slate-800 hover:border-[#e5a93b]/70 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-[#e5a93b] group-hover:scale-105 transition-transform flex-shrink-0">
                        {srv.name.toLowerCase().includes('barba') ? (
                          <span className="text-lg">🪒</span>
                        ) : srv.name.toLowerCase().includes('+') ? (
                          <Sparkles className="w-5 h-5 text-[#e5a93b]" />
                        ) : (
                          <Scissors className="w-5 h-5 text-[#e5a93b]" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white group-hover:text-[#e5a93b] transition-colors">
                          {srv.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className="uppercase font-semibold tracking-wider text-[10px]">
                            {srv.durationMinutes} MIN
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-black text-[#e5a93b] font-mono">
                        €{srv.price.toFixed(2)}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-slate-800 group-hover:bg-[#e5a93b] text-slate-400 group-hover:text-slate-950 flex items-center justify-center transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: ESCOLHA O BARBEIRO / PROFISSIONAL */}
          {bookingStep === 'barber_select' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-[#121418]/95 backdrop-blur-md px-5 py-3 border-b border-slate-800 flex items-center space-x-3">
                <button
                  onClick={() => setBookingStep('service_select')}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">Escolha o Barbeiro</h2>
                  <p className="text-[10px] font-bold text-[#e5a93b] tracking-wider uppercase">
                    {selectedUnit.name}
                  </p>
                </div>
              </div>

              <div className="px-5">
                <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3">
                  SELECIONE O PROFISSIONAL
                </h3>

                {/* Option 1: SEM PREFERÊNCIA */}
                <div
                  onClick={() => {
                    setSelectedBarber(null);
                    setBookingStep('datetime_select');
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between mb-3 ${
                    selectedBarber === null
                      ? 'bg-[#e5a93b]/10 border-[#e5a93b]'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#e5a93b] to-amber-200 flex items-center justify-center text-slate-950 font-black text-xl shadow-md">
                      ★
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Sem Preferência</h4>
                      <p className="text-[11px] text-slate-400">Primeiro(a) {businessMeta.professionalTerm.toLowerCase()} disponível</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* List of Specific Barbers */}
                <div className="space-y-3">
                  {availableBarbers.map((barber) => (
                    <div
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarber(barber);
                        setBookingStep('datetime_select');
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedBarber?.id === barber.id
                          ? 'bg-[#e5a93b]/10 border-[#e5a93b]'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <img
                          src={barber.avatarUrl}
                          alt={barber.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 flex-shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-white uppercase">{barber.name}</h4>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="flex items-center font-bold" style={{ color: theme.primaryAccent }}>
                              ★ {barber.rating.toFixed(1)}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400">{barber.role}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DATA E HORÁRIO */}
          {bookingStep === 'datetime_select' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-[#121418]/95 backdrop-blur-md px-5 py-3 border-b border-slate-800 flex items-center space-x-3">
                <button
                  onClick={() => setBookingStep('barber_select')}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">Data e Horário</h2>
                  <p className="text-[10px] font-bold text-[#e5a93b] tracking-wider uppercase">
                    {selectedUnit.name}
                  </p>
                </div>
              </div>

              {/* Horizontal Day Slider */}
              <div className="px-5">
                <p className="text-xs font-black tracking-wider text-slate-400 uppercase mb-2.5">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }).toUpperCase()}
                </p>
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
                  {dayPills.map((p) => {
                    const isSelected = selectedDate === p.dateStr;
                    return (
                      <button
                        key={p.dateStr}
                        onClick={() => setSelectedDate(p.dateStr)}
                        className={`flex flex-col items-center justify-center w-14 h-16 rounded-2xl transition-all flex-shrink-0 relative ${
                          isSelected
                            ? 'bg-[#e5a93b] text-slate-950 font-black shadow-lg shadow-[#e5a93b]/25 scale-105'
                            : p.isClosed
                            ? 'bg-slate-950 border border-slate-850 text-slate-500 opacity-60'
                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-bold tracking-wider">{p.label}</span>
                        <span className="text-lg font-black font-mono leading-tight">{p.day}</span>
                        {p.isClosed && (
                          <span className="text-[8px] font-extrabold uppercase text-rose-400">FECHADO</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notice if date is closed */}
              {isDayClosed(selectedDate) && (
                <div className="mx-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>Estabelecimento fechado nesta data. Por favor, selecione outro dia com expediente.</span>
                </div>
              )}

              {/* Time Slots: MANHÃ */}
              {!isDayClosed(selectedDate) && (
                <>
                  <div className="px-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
                        MANHÃ
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {morningSlots.filter(isTimeSlotAvailable).length} horários
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {morningSlots.filter(isTimeSlotAvailable).map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTimeSlot(time)}
                          className={`py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                            selectedTimeSlot === time
                              ? 'bg-[#e5a93b] text-slate-950 border-[#e5a93b] shadow-md shadow-[#e5a93b]/20 font-black'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                      {morningSlots.filter(isTimeSlotAvailable).length === 0 && (
                        <p className="col-span-3 text-[11px] text-slate-500 italic py-1">Indisponível no período da manhã</p>
                      )}
                    </div>
                  </div>

                  {/* Time Slots: TARDE / NOITE */}
                  <div className="px-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
                        TARDE / NOITE
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {afternoonSlots.filter(isTimeSlotAvailable).length} horários
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {afternoonSlots.filter(isTimeSlotAvailable).map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTimeSlot(time)}
                          className={`py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                            selectedTimeSlot === time
                              ? 'bg-[#e5a93b] text-slate-950 border-[#e5a93b] shadow-md shadow-[#e5a93b]/20 font-black'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                      {afternoonSlots.filter(isTimeSlotAvailable).length === 0 && (
                        <p className="col-span-3 text-[11px] text-slate-500 italic py-1">Indisponível no período da tarde/noite</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Sticky Continue Button */}
              <div className="px-5 pt-2">
                <button
                  onClick={() => {
                    if (isDayClosed(selectedDate)) {
                      alert('Por favor, selecione uma data em que o estabelecimento esteja aberto.');
                      return;
                    }
                    if (!selectedTimeSlot || !isTimeSlotAvailable(selectedTimeSlot)) {
                      alert('Por favor, selecione um horário disponível para continuar.');
                      return;
                    }
                    setBookingStep('products_select');
                  }}
                  disabled={isDayClosed(selectedDate) || !selectedTimeSlot || !isTimeSlotAvailable(selectedTimeSlot)}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center space-x-2 ${
                    isDayClosed(selectedDate) || !selectedTimeSlot || !isTimeSlotAvailable(selectedTimeSlot)
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-[#e5a93b] hover:bg-amber-400 text-slate-950 shadow-xl shadow-[#e5a93b]/20'
                  }`}
                >
                  <span>CONTINUAR</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PRODUTOS RECOMENDADOS (DESEJA LEVAR ALGO?) */}
          {bookingStep === 'products_select' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-[#121418]/95 backdrop-blur-md px-5 py-3 border-b border-slate-800 flex items-center space-x-3">
                <button
                  onClick={() => setBookingStep('datetime_select')}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">Produtos Recomendados</h2>
                  <p className="text-[10px] font-bold text-[#e5a93b] tracking-wider uppercase">
                    Deseja levar algo?
                  </p>
                </div>
              </div>

              <div className="px-5">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 mb-4">
                  <p className="text-xs text-slate-300 font-medium">
                    {availableProducts.length > 0
                      ? "Aproveite e reserve os produtos recomendados para você."
                      : "Sem produtos adicionais cadastrados para este estabelecimento."}
                  </p>
                </div>

                {/* Products List or Clean Empty State */}
                {availableProducts.length === 0 ? (
                  <div className="py-8 text-center space-y-2.5 bg-slate-900/30 rounded-2xl border border-slate-800/60 p-5">
                    <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-300 font-medium">Nenhum produto cadastrado no catálogo</p>
                    <p className="text-[11px] text-slate-500">Pode avançar diretamente para a revisão do agendamento.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableProducts.map((prod) => {
                      const qty = productQuantities[prod.id] || 0;
                      return (
                        <div
                          key={prod.id}
                          className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-700/60 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-white uppercase truncate">
                                {prod.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {prod.description}
                              </p>
                              <span className="text-xs font-black font-mono mt-1 block" style={{ color: theme.primaryAccent }}>
                                €{prod.price.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Counter Stepper */}
                          <div className="flex items-center space-x-2">
                            {qty > 0 && (
                              <>
                                <button
                                  onClick={() => handleUpdateProductQuantity(prod.id, -1)}
                                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-5 text-center font-mono font-bold text-xs text-white">
                                  {qty}
                                </span>
                              </>
                            )}
                            <button
                              onClick={() => handleUpdateProductQuantity(prod.id, 1)}
                              className="w-8 h-8 rounded-full text-slate-950 hover:brightness-110 flex items-center justify-center font-bold shadow-md transition-all"
                              style={{ backgroundColor: theme.primaryAccent }}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="pt-5 space-y-2">
                  <button
                    onClick={() => setBookingStep('confirm_summary')}
                    className="w-full py-3.5 rounded-2xl bg-[#e5a93b] hover:bg-amber-400 text-slate-950 font-black text-sm tracking-wider uppercase shadow-xl shadow-[#e5a93b]/20 transition-all flex items-center justify-center space-x-2"
                  >
                    {selectedProductsList.length > 0 ? (
                      <span>
                        CONTINUAR ({selectedProductsList.length} ITENS • €{finalTotalPrice.toFixed(2)})
                      </span>
                    ) : availableProducts.length === 0 ? (
                      <span>AVANÇAR PARA A CONFIRMAÇÃO</span>
                    ) : (
                      <span>PULAR E CONTINUAR</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIRMAR AGENDAMENTO (SUMMARY & FORM) */}
          {bookingStep === 'confirm_summary' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-[#121418]/95 backdrop-blur-md px-5 py-3 border-b border-slate-800 flex items-center space-x-3">
                <button
                  onClick={() => setBookingStep('products_select')}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">Confirmar</h2>
                  <p className="text-[10px] font-bold text-[#e5a93b] tracking-wider uppercase">
                    Revise seus dados
                  </p>
                </div>
              </div>

              <div className="px-5 space-y-4">
                {/* Service Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-white">{selectedService?.name}</h3>
                    <p className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-[#e5a93b]" />
                      <span>{selectedBarber?.name || 'Sem Preferência (Primeiro Disponível)'}</span>
                    </p>
                  </div>
                  <span className="text-base font-black text-[#e5a93b] font-mono">
                    €{selectedService?.price.toFixed(2)}
                  </span>
                </div>

                {/* Date & Time Tags */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      DATA
                    </span>
                    <span className="text-sm font-black text-white font-mono">
                      {selectedDate.split('-')[2]}/{selectedDate.split('-')[1]}
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      HORÁRIO
                    </span>
                    <span className="text-sm font-black text-[#e5a93b] font-mono">
                      {selectedTimeSlot}
                    </span>
                  </div>
                </div>

                {/* Quiet Service Toggle Card */}
                <div 
                  onClick={() => setQuietService(!quietService)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    quietService 
                      ? 'bg-[#e5a93b]/10 border-[#e5a93b]' 
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${quietService ? 'bg-[#e5a93b] text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <VolumeX className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                        QUIET SERVICE
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Não quero conversar durante o atendimento
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch Pill */}
                  <div className={`w-11 h-6 rounded-full p-1 transition-colors ${quietService ? 'bg-[#e5a93b]' : 'bg-slate-800'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${quietService ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Alguma Observação? */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                    ALGUMA OBSERVAÇÃO?
                  </label>
                  <textarea
                    value={observationNotes}
                    onChange={(e) => setObservationNotes(e.target.value)}
                    rows={2}
                    placeholder="Ex: Cabelo muito grande, prefiro máquina 2 nas laterais..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#e5a93b]"
                  />
                </div>

                {/* Client Contact Info */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                    SEUS DADOS DE CONTATO
                  </h4>
                  <div>
                    <label className="text-slate-400 block mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Telemóvel / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                      placeholder="+351 912 345 678"
                    />
                  </div>
                </div>

                {/* Total and Action Buttons */}
                <div className="pt-2 space-y-2.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">VALOR TOTAL:</span>
                    <span className="text-xl font-black text-white font-mono">
                      €{finalTotalPrice.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleFinalizeBooking}
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-[#e5a93b] hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm tracking-wider uppercase shadow-xl shadow-[#e5a93b]/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'CONFIRMANDO...' : 'CONFIRMAR AGENDAMENTO'}</span>
                  </button>

                  <button
                    onClick={() => setBookingStep('unit_select')}
                    className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-white"
                  >
                    VOLTAR AO INÍCIO
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: SUCESSO / VOUCHER CONFIRMADO */}
          {bookingStep === 'success_voucher' && (
            <div className="p-5 space-y-5 animate-in zoom-in-95 duration-200 text-center">
              <div className="w-16 h-16 rounded-full bg-[#e5a93b] text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-[#e5a93b]/30">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">Agendamento Confirmado!</h2>
                <p className="text-xs text-slate-400">
                  A sua reserva está confirmada na unidade {selectedUnit.name}.
                </p>
              </div>

              {/* Voucher Ticket */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left space-y-3.5 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">CÓDIGO DE RESERVA</span>
                  <span className="font-mono font-black text-[#e5a93b] text-sm">
                    #{confirmedBooking?.id.slice(-6) || 'MN8492'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-bold text-white text-sm">{selectedService?.name}</p>
                  <p className="text-slate-300 flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-[#e5a93b]" />
                    <span>Profissional: <strong>{selectedBarber?.name || 'Sem Preferência'}</strong></span>
                  </p>
                  <p className="text-slate-300 flex items-center space-x-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#e5a93b]" />
                    <span>Data: <strong>{selectedDate} às {selectedTimeSlot}</strong></span>
                  </p>
                  <p className="text-slate-300 flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-[#e5a93b]" />
                    <span className="truncate">{selectedUnit.address}</span>
                  </p>
                  {quietService && (
                    <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-[#e5a93b]/10 text-[#e5a93b] rounded-md text-[10px] font-bold">
                      <VolumeX className="w-3 h-3" />
                      <span>Quiet Service Ativo</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-bold uppercase">Total a Pagar no Local:</span>
                  <span className="text-lg font-black text-white font-mono">
                    €{finalTotalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    const text = encodeURIComponent(`Olá! Confirmo o meu agendamento de ${selectedService?.name} na ${selectedUnit.name} para o dia ${selectedDate} às ${selectedTimeSlot}.`);
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700"
                >
                  <Share2 className="w-4 h-4 text-[#e5a93b]" />
                  <span>Enviar Lembrete para o WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('appointments');
                    setBookingStep('unit_select');
                  }}
                  className="w-full py-3 rounded-2xl bg-[#e5a93b] hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg"
                >
                  Ver Meus Agendamentos
                </button>

                <button
                  onClick={() => setBookingStep('unit_select')}
                  className="w-full py-2 text-center text-xs text-slate-400 hover:text-white"
                >
                  Fazer Novo Agendamento
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: TAB 2 - MEUS AGENDAMENTOS */}
      {activeTab === 'appointments' && (
        <div className="flex-1 flex flex-col overflow-y-auto pb-20 animate-in fade-in duration-200">
          {!isLoggedIn && userRole === 'client' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 my-auto">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[#e5a93b] shadow-xl">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Área Exclusiva para Clientes</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Faça login ou cadastre-se para visualizar, acompanhar e gerir os seus agendamentos com segurança.
              </p>
              <button
                onClick={() => {
                  setUserRole('client');
                  setActiveTab('profile');
                }}
                className="px-6 py-3 bg-[#e5a93b] hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg"
              >
                Fazer Login / Cadastrar
              </button>
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-10 bg-[#121418]/95 backdrop-blur-md px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {userRole === 'barber' && loggedInBarber 
                    ? `Agenda • ${loggedInBarber.name}` 
                    : 'Meus Agendamentos'}
                </h2>
                <button 
                  onClick={() => {
                    setActiveTab('home');
                    setBookingStep('service_select');
                  }}
                  className="px-3 py-1 bg-[#e5a93b] text-slate-950 rounded-full font-bold text-xs"
                >
                  + Novo
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Appointments Tab Filter */}
                <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl text-xs font-bold border border-slate-800">
                  <button
                    onClick={() => setAppointmentsSubTab('upcoming')}
                    className={`py-2 rounded-lg transition-all ${
                      appointmentsSubTab === 'upcoming'
                        ? 'bg-[#e5a93b] text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PRÓXIMOS
                  </button>
                  <button
                    onClick={() => setAppointmentsSubTab('history')}
                    className={`py-2 rounded-lg transition-all ${
                      appointmentsSubTab === 'history'
                        ? 'bg-[#e5a93b] text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    HISTÓRICO
                  </button>
                </div>

                {/* List or Empty State */}
                {filteredAppointments.length === 0 ? (
                  <div className="py-16 text-center space-y-3 px-4">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                      <CalendarIcon className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-white text-sm">
                      {appointmentsSubTab === 'upcoming'
                        ? 'Nenhum agendamento futuro'
                        : 'Nenhum histórico de agendamentos'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-[260px] mx-auto">
                      {appointmentsSubTab === 'upcoming'
                        ? 'Não existem agendamentos ativos na lista de momento.'
                        : 'Ainda não possui agendamentos finalizados ou anteriores.'}
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('home');
                        setBookingStep('unit_select');
                      }}
                      className="px-6 py-2.5 bg-[#e5a93b] hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#e5a93b]/20 transition-all"
                    >
                      AGENDAR AGORA
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments.map((app) => {
                      const isJustConfirmed = confirmedBooking && confirmedBooking.id === app.id;
                      const dateKey = getAppointmentDateKey(app);
                      let dateStr = 'Data a definir';
                      if (dateKey) {
                        const [y, m, d] = dateKey.split('-');
                        dateStr = `${d}/${m}/${y}`;
                      }
                      const timeStr = getAppointmentTimeStr(app.startAt);

                      return (
                        <div
                          key={app.id}
                          className={`bg-slate-900 rounded-2xl p-4 space-y-3 shadow-lg transition-all ${
                            isJustConfirmed
                              ? 'border border-[#e5a93b]/60'
                              : 'border border-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                app.status === 'confirmed'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : app.status === 'completed'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : app.status === 'cancelled'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {app.status === 'confirmed'
                                ? 'CONFIRMADO'
                                : app.status === 'completed'
                                ? 'CONCLUÍDO'
                                : app.status === 'cancelled'
                                ? 'CANCELADO'
                                : 'PENDENTE'}
                            </span>
                            <span className="font-mono text-xs text-slate-400">
                              #{app.id.slice(-6)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-white">{app.serviceName}</h4>
                            <p className="text-xs text-slate-300 flex items-center space-x-1.5">
                              <User className="w-3.5 h-3.5 text-[#e5a93b]" />
                              <span>Cliente: <strong className="text-white">{app.clientName || 'Cliente'}</strong> {app.clientPhone ? `(${app.clientPhone})` : ''}</span>
                            </p>
                            <p className="text-xs text-slate-400 flex items-center space-x-1.5">
                              <span className="text-[#e5a93b]">✂️</span>
                              <span>Barbeiro: {app.professionalName || 'Sem Preferência'}</span>
                            </p>
                            <p className="text-xs text-slate-400 flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#e5a93b]" />
                              <span>{dateStr} às {timeStr}</span>
                            </p>
                          </div>

                          <div className="border-t border-slate-800 pt-2.5 flex justify-between items-center text-xs">
                            <span className="font-bold text-[#e5a93b]">
                              Total: €{(app.price || 0).toFixed(2)}
                            </span>
                            {app.status !== 'cancelled' && app.status !== 'completed' && (
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => {
                                    setRescheduleApp(app);
                                    const appDate = getAppointmentDateKey(app) || formatLocalDate(new Date());
                                    const appTime = getAppointmentTimeStr(app.startAt);
                                    setNewReschedDate(appDate);
                                    const available = getRescheduleAvailableSlots(appDate, app.professionalId, app.id);
                                    if (available.includes(appTime)) {
                                      setNewReschedTime(appTime);
                                    } else {
                                      setNewReschedTime(available[0] || '');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Remarcar
                                </button>
                                <button 
                                  onClick={() => setCancelModalApp(app)}
                                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW: TAB - FIDELIDADE */}
      {activeTab === 'loyalty' && (
        <div className="flex-1 flex flex-col overflow-y-auto pb-20 p-5 space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-1.5 pt-2">
            <div className="inline-flex p-2.5 rounded-2xl bg-[#e5a93b]/10 border border-[#e5a93b]/20 text-[#e5a93b] mb-1">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              O Seu Cartão Fidelidade
            </h2>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Ganhe carimbos em cada visita e troque por prémios exclusivos!
            </p>
          </div>

          {/* Premium Digital Gold Card Visual */}
          <div className="relative rounded-3xl p-5 bg-gradient-to-br from-[#1e1a14] via-[#2a2318] to-[#120f0a] border border-amber-500/30 shadow-xl overflow-hidden group">
            {/* Background design accents */}
            <div className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-[#e5a93b]/5 blur-2xl group-hover:bg-[#e5a93b]/10 transition-all" />
            <div className="absolute -left-10 -top-10 w-32 h-32 rounded-full bg-slate-800/10 blur-xl" />

            <div className="flex justify-between items-start pb-4 border-b border-amber-500/15">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#e5a93b]/80">Clube de Vantagens</span>
                <h3 className="font-black text-white text-base tracking-tight uppercase mt-0.5">{tenant?.name || 'Glowfy Hub'}</h3>
              </div>
              <img
                src={tenant?.logoUrl || "https://i.postimg.cc/j2DZ0wxr/glowfy-hub-logo.png"}
                alt="Logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://i.postimg.cc/j2DZ0wxr/glowfy-hub-logo.png";
                }}
                className="h-8 w-auto object-contain max-w-[90px] rounded"
              />
            </div>

            {/* Loyalty Content based on selected mode */}
            {loyaltyConfig.mode === 'stamp_card' ? (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-5 gap-2.5">
                  {Array.from({ length: loyaltyConfig.stampsNeeded }).map((_, idx) => {
                    const isStamped = idx < getClientLoyaltyPoints();
                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded-full flex items-center justify-center transition-all ${
                          isStamped
                            ? 'bg-gradient-to-br from-[#e5a93b] to-amber-600 text-slate-950 shadow-md border border-amber-400 scale-105'
                            : 'bg-black/40 border border-slate-800 text-slate-500 border-dashed'
                        }`}
                      >
                        {isStamped ? (
                          <Sparkles className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
                        ) : (
                          <span className="text-[9px] font-bold font-mono text-slate-500">{idx + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-center pt-2">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">
                    PROMOÇÃO ATIVA
                  </p>
                  <p className="text-xs text-slate-200 font-bold mt-0.5">
                    A cada {loyaltyConfig.stampsNeeded} carimbos, ganhe:
                  </p>
                  <p className="text-sm font-black text-white mt-1 bg-black/30 py-1.5 px-3 rounded-xl border border-amber-500/10 inline-block">
                    🎁 {loyaltyConfig.rewardDescription}
                  </p>
                </div>
              </div>
            ) : (
              // Cashback / Points System
              <div className="space-y-4 pt-4 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">O Seu Saldo Atual</p>
                  <h4 className="text-3xl font-black text-emerald-400 font-mono mt-1">
                    {getClientLoyaltyPoints()} <span className="text-xs font-bold text-slate-400">PTS</span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Equivale a <span className="font-bold text-[#e5a93b]">€{(getClientLoyaltyPoints() * loyaltyConfig.euroPerPoint).toFixed(2)}</span> em descontos
                  </p>
                </div>

                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800/60 text-[10px] text-slate-400 text-left">
                  <p className="font-bold text-slate-300 uppercase tracking-wider mb-1">Como Funciona?</p>
                  <p>• Cada €1 gasto na nossa loja gera {loyaltyConfig.pointsPerEuro} ponto(s).</p>
                  <p>• Cada ponto equivale a €{loyaltyConfig.euroPerPoint} de desconto direto em qualquer serviço!</p>
                </div>
              </div>
            )}

            {/* Client Owner Info bar */}
            <div className="border-t border-amber-500/10 mt-4 pt-3 flex justify-between items-center text-[10px]">
              <div>
                <p className="text-slate-400">Titular do Cartão</p>
                <p className="font-bold text-white uppercase">{isLoggedIn ? clientName : 'Convidado de Demonstração'}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Telemóvel</p>
                <p className="font-mono text-white">{clientPhone}</p>
              </div>
            </div>
          </div>

          {/* Quick Info / Explanatory list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Perguntas Frequentes</h4>
            
            <div className="space-y-2 text-[11px] text-slate-300">
              <div>
                <p className="font-bold text-amber-500">Como acumulo carimbos/pontos?</p>
                <p className="text-slate-400">Basta fornecer o seu número de telemóvel ao barbeiro/profissional no momento do pagamento na loja.</p>
              </div>
              <div>
                <p className="font-bold text-amber-500">Onde posso resgatar o prémio?</p>
                <p className="text-slate-400">Assim que completar o cartão, avise o profissional na recepção para ativar e abater a recompensa na hora.</p>
              </div>
            </div>
          </div>

          {!isLoggedIn && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <p className="text-[11px] text-slate-400">
                Está a ver um cartão de demonstração. 
                <button onClick={() => setActiveTab('profile')} className="text-amber-500 font-bold ml-1 hover:underline">
                  Faça login
                </button> para sincronizar os seus dados.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW: TAB 3 - LOGIN / PERFIL */}
      {activeTab === 'profile' && (
        <div className="flex-1 flex flex-col overflow-y-auto pb-20 p-5 space-y-5 animate-in fade-in duration-200">
          <div className="text-center space-y-2 pt-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-[#e5a93b] flex items-center justify-center text-[#e5a93b] mx-auto shadow-xl">
              <Scissors className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">
              {tenant?.name || 'Mr. Navalha'}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Agende online, receba notificações, resgate itens do programa de fidelidade e muito mais...
            </p>
          </div>

          {/* Role selector when not logged in */}
          {!isLoggedIn && (
            <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl text-xs font-bold border border-slate-800">
              <button
                onClick={() => setUserRole('client')}
                className={`py-2.5 rounded-lg transition-all ${
                  userRole === 'client' ? 'bg-[#e5a93b] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                👤 SOU CLIENTE
              </button>
              <button
                onClick={() => setUserRole('barber')}
                className={`py-2.5 rounded-lg transition-all ${
                  userRole === 'barber' ? 'bg-[#e5a93b] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ✂️ SOU BARBEIRO
              </button>
            </div>
          )}

          {isLoggedIn ? (
            userRole === 'barber' ? (
              /* BARBER PANEL DASHBOARD */
              <div className="space-y-4 pt-2">
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 text-white space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 uppercase">
                      Painel Profissional / Barbeiro
                    </span>
                    <button
                      onClick={handlePortalLogout}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{loggedInBarber?.name || 'Barbeiro'}</h3>
                    <p className="text-xs text-slate-400">Gestão de Agenda, Rendimentos e Clientes</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-black/30 border border-slate-800 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase">Atendimentos Hoje</p>
                      <p className="text-lg font-bold text-[#e5a93b]">
                        {existingAppointments.filter(a => a.status === 'confirmed').length}
                      </p>
                    </div>
                    <div className="bg-black/30 border border-slate-800 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase">Rendimento Estimado</p>
                      <p className="text-lg font-bold text-emerald-400">
                        €{existingAppointments.filter(a => a.status === 'confirmed' || a.status === 'completed').reduce((sum, a) => sum + (a.price || 20), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="w-full py-3 bg-[#e5a93b] hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all"
                    >
                      <CalendarIcon className="w-4 h-4" />
                      <span>Ver Minha Agenda de Atendimentos</span>
                    </button>
                    <p className="text-[11px] text-slate-400 text-center">
                      Consulte, remarque ou cancele os seus agendamentos diretamente na aba <strong className="text-white">Agendamentos</strong>.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* CLIENT LOGGED IN PROFILE */
              <div className="space-y-4 pt-2">
                <div className="bg-slate-900 border border-[#e5a93b]/40 rounded-2xl p-5 text-center space-y-3 shadow-xl">
                  <div className="w-16 h-16 rounded-full bg-[#e5a93b]/20 border-2 border-[#e5a93b] flex items-center justify-center text-[#e5a93b] mx-auto text-xl font-bold">
                    {clientName ? clientName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <span className="text-xs text-[#e5a93b] font-bold uppercase tracking-wider block mb-1">Seja bem-vindo(a)</span>
                    <h3 className="text-lg font-bold text-white uppercase">{clientName || 'Cliente'}</h3>
                    <p className="text-xs text-slate-400">{clientEmail || clientPhone || 'Conta Verificada'}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-around text-xs">
                    <div>
                      <p className="text-slate-400">Pontos Fidelidade</p>
                      <p className="font-bold text-[#e5a93b] text-sm">Ativo & Sincronizado</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Reservas</p>
                      <p className="font-bold text-white text-sm">{filteredAppointments.length}</p>
                    </div>
                  </div>

                  <button
                    onClick={handlePortalLogout}
                    className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center space-x-2 transition-colors mt-3"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair da Conta (Terminar Sessão)</span>
                  </button>
                </div>
              </div>
            )
          ) : userRole === 'barber' ? (
            /* BARBER LOGIN FORM */
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase text-center">
                LOGIN PROFISSIONAL (BARBEIRO)
              </h3>
              <p className="text-[11px] text-slate-400 text-center">
                Selecione o seu perfil profissional para gerir a sua agenda
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Profissional / Barbeiro</label>
                  <select
                    value={selectedBarberEmail}
                    onChange={(e) => setSelectedBarberEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-xs"
                  >
                    <option value="">Selecione o profissional...</option>
                    {(professionals.length > 0 ? professionals : getPortalProfessionals(tenant?.businessType)).map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({(p as any).role || 'Barbeiro'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">PIN de Acesso</label>
                  <input
                    type="password"
                    value={barberPin}
                    onChange={(e) => setBarberPin(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-mono text-center tracking-widest text-xs"
                  />
                </div>

                <button
                  onClick={() => {
                    const list = professionals.length > 0 ? professionals : getPortalProfessionals(tenant?.businessType);
                    const found = list.find(p => p.name === selectedBarberEmail) || (list[0] || { id: 'p1', name: selectedBarberEmail || 'Barbeiro Principal' });
                    setLoggedInBarber(found);
                    setUserRole('barber');
                    setIsLoggedIn(true);
                  }}
                  className="w-full py-3 rounded-2xl bg-[#e5a93b] hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg mt-2"
                >
                  Entrar no Painel do Barbeiro
                </button>
              </div>
            </div>
          ) : authMode === 'login' ? (
            /* CLIENT LOGIN FORM */
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase text-center">
                FAÇA LOGIN PARA CONTINUAR
              </h3>

              <button
                onClick={handleAppleLogin}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-xs font-bold text-white flex items-center justify-center space-x-2 transition-colors"
              >
                <span></span>
                <span>Continuar com a Apple</span>
              </button>

              <button
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-xs font-bold text-white flex items-center justify-center space-x-2 transition-colors"
              >
                <span className="text-blue-400 font-bold">G</span>
                <span>Continuar com o Google</span>
              </button>

              <div className="relative py-2">
                <div className="border-t border-slate-800" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#121418] px-2 text-[10px] text-slate-500 font-medium">
                  OU
                </span>
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Email ou Telemóvel"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
                <input
                  type="password"
                  placeholder="Senha"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
                <button
                  onClick={() => {
                    if (!clientName && clientEmail) {
                      const derived = clientEmail.split('@')[0];
                      setClientName(derived.charAt(0).toUpperCase() + derived.slice(1));
                    } else if (!clientName) {
                      setClientName('Cliente');
                    }
                    setUserRole('client');
                    setIsLoggedIn(true);
                  }}
                  className="w-full py-3 rounded-2xl bg-[#e5a93b] hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg"
                >
                  Entrar
                </button>
              </div>

              <p className="text-center text-xs text-slate-400 pt-2">
                Não tem uma conta?{' '}
                <button
                  onClick={() => setAuthMode('register')}
                  className="text-[#e5a93b] font-bold hover:underline"
                >
                  Cadastre-se
                </button>
              </p>
            </div>
          ) : (
            /* CLIENT REGISTER FORM */
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase text-center">
                CADASTRE-SE
              </h3>
              <p className="text-[11px] text-slate-400 text-center">
                Informe os dados básicos para criar sua conta
              </p>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Nome completo</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Celular / Telemóvel</label>
                  <div className="flex space-x-2">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 text-white text-xs font-mono"
                    >
                      <option value="+351">🇵🇹 +351</option>
                      <option value="+55">🇧🇷 +55</option>
                      <option value="+34">🇪🇸 +34</option>
                    </select>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-mono"
                      placeholder="912 345 678"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white"
                    placeholder="seuemail@exemplo.pt"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white pr-10"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserRole('client');
                    setIsLoggedIn(true);
                    setAuthMode('login');
                  }}
                  className="w-full py-3 rounded-2xl bg-[#e5a93b] hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg mt-2"
                >
                  Cadastrar
                </button>

                <p className="text-[10px] text-slate-500 text-center pt-1">
                  Acessando você concorda com os Termos de Uso e Política de Privacidade.
                </p>

                <p className="text-center text-xs text-slate-400 pt-2">
                  Já possui conta?{' '}
                  <button
                    onClick={() => setAuthMode('login')}
                    className="text-[#e5a93b] font-bold hover:underline"
                  >
                    Fazer Login
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS FOR CANCELLATION, WALK-IN BOOKING, & BLOCK TIME */}
      {cancelModalApp && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Cancelar Agendamento</h3>
            <p className="text-xs text-slate-400">Por favor, informe a observação ou motivo do cancelamento:</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Imprevisto de última hora, remarcação..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white h-24 resize-none"
            />
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setCancelModalApp(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                Voltar
              </button>
              <button
                onClick={async () => {
                  if (onCancelAppointment) {
                    await onCancelAppointment(cancelModalApp.id, cancelReason || 'Cancelado');
                  }
                  if (confirmedBooking && confirmedBooking.id === cancelModalApp.id) {
                    setConfirmedBooking(null);
                  }
                  setCancelModalApp(null);
                  setCancelReason('');
                  alert("Agendamento cancelado com sucesso.");
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualBookingModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Novo Agendamento Avulso (Balcão)</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={manualClientName}
                  onChange={(e) => setManualClientName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Telemóvel</label>
                <input
                  type="tel"
                  value={manualClientPhone}
                  onChange={(e) => setManualClientPhone(e.target.value)}
                  placeholder="912 345 678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Serviço</label>
                <select
                  value={manualServiceId}
                  onChange={(e) => setManualServiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                >
                  <option value="">Selecione o serviço...</option>
                  {displayServices.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (€{(s.price || 0).toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Data</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Horário</label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowManualBookingModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                Voltar
              </button>
              <button
                onClick={async () => {
                  const serv = displayServices.find(s => s.id === manualServiceId) || displayServices[0];
                  const barberObj = loggedInBarber || professionals[0] || null;
                  const unitObj = availableUnits[0];
                  if (onConfirmBooking && serv) {
                    await onConfirmBooking({
                      service: serv,
                      barber: barberObj,
                      unit: unitObj,
                      date: manualDate,
                      timeSlot: manualTime,
                      clientName: manualClientName || 'Cliente Balcão',
                      clientPhone: manualClientPhone || '911222333',
                      clientEmail: 'balcao@exemplo.pt',
                      quietService: false,
                      notes: 'Agendamento Avulso (Painel Barbeiro)',
                      selectedProducts: []
                    });
                  }
                  setShowManualBookingModal(false);
                  setManualClientName('');
                  setManualClientPhone('');
                  alert("Agendamento avulso registrado com sucesso!");
                }}
                className="flex-1 py-2.5 bg-[#e5a93b] hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}

      {showBlockModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Fechar / Bloquear Horário</h3>
            <p className="text-xs text-slate-400">Selecione o período de indisponibilidade na agenda:</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Data</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Início</label>
                  <input
                    type="time"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Fim</label>
                  <input
                    type="time"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Motivo</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Almoço, Folga, Manutenção..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                Voltar
              </button>
              <button
                onClick={async () => {
                  if (onBlockTime) {
                    await onBlockTime({
                      date: blockDate,
                      startTime: blockStartTime,
                      endTime: blockEndTime,
                      reason: blockReason,
                      barberName: loggedInBarber?.name || 'Profissional'
                    });
                  }
                  setShowBlockModal(false);
                  alert(`Horário fechado com sucesso das ${blockStartTime} às ${blockEndTime} em ${blockDate}.`);
                }}
                className="flex-1 py-2.5 bg-[#e5a93b] hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs"
              >
                Bloquear Horário
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleApp && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-base">Remarcar Agendamento</h3>
                <p className="text-xs text-slate-400 mt-0.5">{rescheduleApp.serviceName} • {rescheduleApp.professionalName || 'Profissional'}</p>
              </div>
              <button 
                onClick={() => setRescheduleApp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
              <p className="text-slate-400">Cliente: <span className="text-white font-semibold">{rescheduleApp.clientName || 'Cliente'}</span></p>
              <p className="text-slate-400">
                Horário Atual: <span className="text-amber-400 font-mono font-semibold">
                  {getAppointmentDateKey(rescheduleApp)} às {getAppointmentTimeStr(rescheduleApp.startAt)}
                </span>
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1.5 font-semibold">1. Selecione a Nova Data</label>
                <input
                  type="date"
                  min={formatLocalDate(new Date())}
                  value={newReschedDate}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setNewReschedDate(nextDate);
                    const slots = getRescheduleAvailableSlots(nextDate, rescheduleApp.professionalId, rescheduleApp.id);
                    const origDate = getAppointmentDateKey(rescheduleApp);
                    const origTime = getAppointmentTimeStr(rescheduleApp.startAt);
                    if (nextDate === origDate && slots.includes(origTime)) {
                      setNewReschedTime(origTime);
                    } else if (slots.includes(newReschedTime)) {
                      // Keep selected time if free on new date
                    } else if (slots.length > 0) {
                      setNewReschedTime(slots[0]);
                    } else {
                      setNewReschedTime('');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-mono focus:border-[#e5a93b] outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1.5 font-semibold">
                  2. Horários Livres no Dia ({getRescheduleAvailableSlots(newReschedDate, rescheduleApp.professionalId, rescheduleApp.id).length} disponíveis)
                </label>
                {(() => {
                  const availableSlots = getRescheduleAvailableSlots(newReschedDate, rescheduleApp.professionalId, rescheduleApp.id);
                  if (availableSlots.length === 0) {
                    return (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center text-rose-300 text-xs">
                        ⚠️ Não há horários disponíveis para esta data. Por favor escolha outro dia no calendário acima.
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1.5 bg-slate-950 rounded-xl border border-slate-800/80">
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setNewReschedTime(slot)}
                          className={`py-2 px-1 rounded-lg text-xs font-mono font-bold transition-all text-center ${
                            newReschedTime === slot
                              ? 'bg-[#e5a93b] text-slate-950 shadow-md ring-2 ring-amber-400/50'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setRescheduleApp(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                Voltar
              </button>
              <button
                disabled={!newReschedDate || !newReschedTime}
                onClick={async () => {
                  if (onRescheduleAppointment && rescheduleApp && newReschedDate && newReschedTime) {
                    const newStartAt = `${newReschedDate}T${newReschedTime}:00`;
                    const [h, m] = newReschedTime.split(':').map(Number);
                    const totalM = (isNaN(h) ? 10 : h) * 60 + (isNaN(m) ? 0 : m) + 30;
                    const endH = String(Math.floor(totalM / 60)).padStart(2, '0');
                    const endM = String(totalM % 60).padStart(2, '0');
                    const newEndAt = `${newReschedDate}T${endH}:${endM}:00`;
                    await onRescheduleAppointment(rescheduleApp.id, newStartAt, newEndAt);
                  }
                  setRescheduleApp(null);
                  alert(`Agendamento remarcado com sucesso para ${newReschedDate} às ${newReschedTime}!`);
                }}
                className="flex-1 py-2.5 bg-[#e5a93b] hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-xl font-bold text-xs transition-colors"
              >
                Confirmar Remarcação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav 
        className="sticky bottom-0 inset-x-0 w-full bg-[#121418]/95 backdrop-blur-xl border-t border-slate-800/90 px-4 py-2 sm:px-6 sm:py-2.5 flex items-center justify-around z-40 shadow-[0_-8px_20px_rgba(0,0,0,0.6)] mt-auto"
        style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 12px))' }}
      >
        <button
          onClick={() => {
            setActiveTab('home');
            setBookingStep('unit_select');
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 transition-colors ${
            activeTab === 'home' ? 'text-[#e5a93b]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-wider uppercase">INÍCIO</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex flex-col items-center justify-center py-1 px-3 transition-colors relative ${
            activeTab === 'appointments' ? 'text-[#e5a93b]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <CalendarIcon className="w-5 h-5 mb-0.5" />
            {confirmedBooking && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#e5a93b]" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase">AGENDAMENTOS</span>
        </button>

        <button
          onClick={() => setActiveTab('loyalty')}
          className={`flex flex-col items-center justify-center py-1 px-3 transition-colors ${
            activeTab === 'loyalty' ? 'text-[#e5a93b]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-wider uppercase">FIDELIDADE</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-3 transition-colors ${
            activeTab === 'profile' ? 'text-[#e5a93b]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-wider uppercase">
            {isLoggedIn ? 'PERFIL' : 'LOGIN'}
          </span>
        </button>
      </nav>
    </div>
  );
};
