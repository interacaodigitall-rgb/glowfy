import React, { useState } from 'react';
import { 
  Scissors, 
  MapPin, 
  Phone, 
  Clock, 
  Calendar, 
  Star, 
  ChevronRight, 
  Check, 
  VolumeX, 
  ArrowUp, 
  Smartphone, 
  User, 
  ShieldCheck,
  Sparkles,
  Award,
  ExternalLink
} from 'lucide-react';
import { TenantProfile, Service, Professional, Appointment, Client, Product } from '../../../types';
import { fetchClients } from '../../../features/clients/clientsService';
import { getPortalTheme, getPortalUnits, getPortalProfessionals, PortalUnit, PortalBarber, PortalProduct } from '../portalData';
import { BUSINESS_TYPES } from '../../../utils/businessTypes';

interface PcWebsiteViewProps {
  tenant: TenantProfile | null;
  services: Service[];
  professionals: Professional[];
  products?: Product[];
  existingAppointments?: Appointment[];
  onOpenMobileView: () => void;
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
}

export const PcWebsiteView: React.FC<PcWebsiteViewProps> = ({
  tenant,
  services,
  professionals,
  products = [],
  existingAppointments = [],
  onOpenMobileView,
  onConfirmBooking
}) => {
  const theme = getPortalTheme(tenant?.businessType);
  const availableUnits = getPortalUnits(tenant?.businessType, tenant?.name);
  
  // Real products from Firestore / props only
  const availableProducts: PortalProduct[] = products.length > 0
    ? products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1597854710119-a6a4221161d1?auto=format&fit=crop&w=400&q=80',
        category: p.category || 'Geral',
        rating: 5.0
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

  // Real services from tenant/firebase
  const displayServices: Service[] = services.length > 0 ? services : businessMeta.defaultServices.map((ds, idx) => ({
    id: `serv-pc-${idx}`,
    tenantId: tenant?.id || 't1',
    name: ds.name,
    description: (ds as any).description || '',
    price: ds.price,
    durationMinutes: ds.durationMinutes,
    commissionPercentage: ds.commissionPercentage,
    active: true,
    categoryName: ds.category
  }));

  // Desktop Booking State
  const [selectedUnit, setSelectedUnit] = useState<PortalUnit>(() => availableUnits[0]);
  const [selectedService, setSelectedService] = useState<Service | null>(displayServices[0] || null);
  const [selectedBarber, setSelectedBarber] = useState<PortalBarber | null>(null);

  // Initialize selectedDate with the next available open working day
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const defaultHours = { active: dayOfWeek !== 0 };
      const dayHours = tenant?.workingHours 
        ? (tenant.workingHours[dayOfWeek] || tenant.workingHours[String(dayOfWeek)] || defaultHours)
        : defaultHours;
      const isBlocked = tenant?.blockedDates && tenant.blockedDates.includes(dateStr);
      if (dayHours && dayHours.active && !isBlocked) {
        return dateStr;
      }
    }
    return today.toISOString().split('T')[0];
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:00');
  const [quietService, setQuietService] = useState<boolean>(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  const isTimeSlotAvailable = (time: string): boolean => {
    if (!tenant) return true;

    if (tenant.blockedDates && tenant.blockedDates.includes(selectedDate)) {
      return false;
    }

    if (tenant.blockedTimes) {
      const match = tenant.blockedTimes.find(b => {
        if (b.date !== selectedDate) return false;
        return time >= b.start && time < b.end;
      });
      if (match) return false;
    }

    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    
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

        return appDate === selectedDate && appTime === time;
      });
      if (hasConflict) return false;
    }

    return true;
  };

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
  const activeService = selectedService || displayServices[0];
  const finalTotalPrice = (activeService?.price || 0) + productsTotal;

  const scrollToBooking = () => {
    const el = document.getElementById('agendamento-online');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookDesktop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService) return;
    setIsSubmitting(true);
    try {
      const app = await onConfirmBooking({
        service: activeService,
        barber: selectedBarber || (availableBarbers[0] as any),
        unit: selectedUnit,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        clientName,
        clientPhone,
        clientEmail,
        quietService,
        notes,
        selectedProducts: selectedProductsList
      });

      if (app) {
        setConfirmedBooking(app);
      } else {
        setConfirmedBooking({
          id: `pc-${Date.now().toString().slice(-6)}`,
          tenantId: tenant?.id || 'tenant',
          serviceId: activeService.id,
          serviceName: activeService.name,
          professionalId: selectedBarber?.id || 'pro-1',
          professionalName: selectedBarber?.name || 'Sem Preferência',
          clientId: 'client-pc',
          clientName,
          clientPhone,
          clientEmail,
          startAt: `${selectedDate}T${selectedTimeSlot}:00`,
          endAt: `${selectedDate}T10:30:00`,
          price: finalTotalPrice,
          commissionAmount: finalTotalPrice * 0.4,
          status: 'confirmed',
          notes,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const brandLogoUrl = tenant?.logoUrl || "https://i.postimg.cc/h4YbXjCk/MISTER-VETOR-removebg-preview.png";
  const brandHeroImage = tenant?.heroImageUrl || theme.heroImageUrl || "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1920&q=85";
  const brandStoryImage = tenant?.storyImageUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans selection:bg-[#C5A059] selection:text-black">
      
      {/* ========================================================================= */}
      {/* 1. HEADER — EDITORIAL & CLEAN (DIRECT TRANSPARENT LOGO, NO BOX/CARD) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#090a0f]/95 backdrop-blur-md border-b border-slate-800/80 px-6 lg:px-14 py-4 flex items-center justify-between transition-all">
        {/* Brand Transparent Logo without any framing or artificial box */}
        <a href="#inicio" className="flex items-center space-x-3 group">
          <img
            src={brandLogoUrl}
            alt={tenant?.name || 'Mr. Navalha'}
            className="h-12 sm:h-14 w-auto max-w-[170px] object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://i.postimg.cc/h4YbXjCk/MISTER-VETOR-removebg-preview.png";
            }}
          />
        </a>

        {/* Clean Editorial Navigation */}
        <nav className="hidden md:flex items-center space-x-10 text-xs font-semibold tracking-widest uppercase text-slate-300">
          <a href="#inicio" className="hover:text-[#C5A059] transition-colors">Início</a>
          <a href="#servicos" className="hover:text-[#C5A059] transition-colors">Serviços</a>
          <a href="#agendamento-online" className="hover:text-[#C5A059] transition-colors">Agendar</a>
          <a href="#experiencia" className="hover:text-[#C5A059] transition-colors">Experiência</a>
          <a href="#historia" className="hover:text-[#C5A059] transition-colors">História</a>
        </nav>

        {/* Header Action CTAs */}
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onOpenMobileView}
            className="hidden sm:flex items-center space-x-2 px-4 py-2.5 rounded-full border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold tracking-wider transition-all"
            title="Abrir no formato telemóvel"
          >
            <Smartphone className="w-4 h-4 text-[#C5A059]" />
            <span>Abrir App</span>
          </button>

          <button
            onClick={scrollToBooking}
            className="px-6 py-2.5 rounded-full bg-[#C5A059] hover:bg-[#d8b065] text-slate-950 text-xs font-black tracking-wider uppercase transition-all shadow-lg shadow-[#C5A059]/20"
          >
            Agendar Horário
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO — ALTO IMPACTO, SEM BADGE COM ESTRELINHA, PURA IDENTIDADE */}
      {/* ========================================================================= */}
      <section id="inicio" className="relative min-h-[640px] lg:min-h-[720px] flex items-center justify-center overflow-hidden border-b border-slate-800/80">
        {/* Full Cinematic Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={brandHeroImage}
            alt={tenant?.name || 'Mr. Navalha'}
            className="w-full h-full object-cover object-center opacity-40 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090a0f] via-[#090a0f]/90 to-[#090a0f]/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-14 py-24 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 space-y-6">
            {/* Discreta Marca Superior */}
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-[#C5A059]">
              {tenant?.name || 'MR. NAVALHA'}
            </p>

            {/* Headline Principal Limpo e Imponente */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase leading-[1.05]">
              Corte. Barba.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e5a93b] via-[#C5A059] to-[#ecd49c]">
                Presença.
              </span>
            </h1>

            {/* Descrição Elegante */}
            <p className="text-base sm:text-lg text-slate-300 max-w-xl font-light leading-relaxed">
              Barbearia tradicional com uma experiência contemporânea. Mestres em visagismo, toalhas quentes e precisão cirúrgica no centro da Guarda.
            </p>

            {/* CTAs Primários */}
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={scrollToBooking}
                className="px-8 py-4 bg-[#C5A059] hover:bg-[#d8b065] text-slate-950 font-black text-xs sm:text-sm tracking-widest uppercase rounded-full shadow-2xl shadow-[#C5A059]/30 transition-all flex items-center space-x-2.5 transform hover:scale-[1.02]"
              >
                <span>Agendar Horário</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>

              <a
                href="#servicos"
                className="px-7 py-4 bg-transparent hover:bg-white/5 text-white font-bold text-xs sm:text-sm tracking-widest uppercase rounded-full border border-slate-700 hover:border-slate-500 transition-all"
              >
                Conhecer Serviços
              </a>
            </div>

            {/* Quick Status Bar */}
            <div className="pt-6 flex items-center space-x-8 text-xs text-slate-400 font-medium">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Marcações Abertas para Hoje</span>
              </div>
              <div className="hidden sm:block text-slate-600">•</div>
              <div className="hidden sm:flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{tenant?.address || 'Rua Dr. Francisco dos Prazeres 2, Guarda'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SERVIÇOS — SEM EXCESSO DE BADGES, LISTAGEM EDITORIAL REFINADA */}
      {/* ========================================================================= */}
      <section id="servicos" className="py-24 bg-[#0d0f15] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-14 space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
            <div className="space-y-2">
              <span className="text-xs font-bold tracking-[0.25em] text-[#C5A059] uppercase">
                Menu de Atendimento
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
                Nossos Serviços
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              Cada serviço é executado com navalha esterilizada, produtos cosméticos de linha premium e atendimento sob medida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {displayServices.map((srv) => (
              <div
                key={srv.id}
                className="bg-[#12141c] border border-slate-800 hover:border-[#C5A059]/60 p-7 rounded-2xl flex flex-col justify-between transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#C5A059] transition-colors">
                      {srv.name}
                    </h3>
                    <span className="text-xl font-bold font-mono text-[#C5A059]">
                      €{srv.price.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {srv.description || 'Corte completo, acabamento impecável na navalha e finalização com produtos premium.'}
                  </p>

                  <div className="flex items-center space-x-2 text-xs text-slate-400 pt-2 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{srv.durationMinutes || 40} min</span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/70">
                  <button
                    onClick={() => {
                      setSelectedService(srv);
                      scrollToBooking();
                    }}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-[#C5A059] text-slate-200 hover:text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 border border-slate-800 hover:border-[#C5A059]"
                  >
                    <span>Agendar este Serviço</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. EXPERIÊNCIA MR. NAVALHA (SEM CARDS ANINHADOS + MOCKUP REAL DO APP) */}
      {/* ========================================================================= */}
      <section id="experiencia" className="py-24 bg-[#090a0f] border-b border-slate-800/80 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Lado Esquerdo: Conteúdo Editorial e Benefícios */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-3">
                <span className="text-xs font-bold tracking-[0.25em] text-[#C5A059] uppercase">
                  Atendimento de Excelência
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-tight">
                  Experiência {tenant?.name || 'Mr. Navalha'}
                </h2>
              </div>

              <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed max-w-xl">
                Mais do que um corte. Uma experiência pensada para si. Conforto incomparável, toalha quente, espresso artesanal e a certeza de um visual impecável.
              </p>

              {/* 4 Benefícios Diretos e Claros (Sem mini cards artificiais) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#C5A059]/15 flex items-center justify-center text-[#C5A059] font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <span className="text-sm sm:text-base font-medium text-slate-200">
                    Atendimento personalizado e sem pressa
                  </span>
                </div>

                <div className="flex items-center space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#C5A059]/15 flex items-center justify-center text-[#C5A059] font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <span className="text-sm sm:text-base font-medium text-slate-200">
                    Profissionais especializados em visagismo e navalha clássica
                  </span>
                </div>

                <div className="flex items-center space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#C5A059]/15 flex items-center justify-center text-[#C5A059] font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <span className="text-sm sm:text-base font-medium text-slate-200">
                    Agendamento online instantâneo em segundos
                  </span>
                </div>

                <div className="flex items-center space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#C5A059]/15 flex items-center justify-center text-[#C5A059] font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <span className="text-sm sm:text-base font-medium text-slate-200">
                    Histórico dos seus serviços e lembretes automáticos
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={scrollToBooking}
                  className="px-8 py-4 bg-[#C5A059] hover:bg-[#d8b065] text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-xl transition-all"
                >
                  Garantir Meu Horário
                </button>
              </div>
            </div>

            {/* Lado Direito: MOCKUP GRANDE DO APP MOBILE DO COMÉRCIO */}
            <div className="lg:col-span-5 flex justify-center">
              <div 
                onClick={onOpenMobileView}
                className="w-full max-w-[340px] bg-slate-950 p-4 rounded-[42px] border-4 border-slate-800 shadow-2xl cursor-pointer group transform hover:scale-[1.02] transition-all"
                title="Toque para testar o aplicativo no telemóvel"
              >
                {/* Speaker & Sensor Notch */}
                <div className="flex justify-between items-center px-4 py-1 mb-3">
                  <span className="text-[10px] font-mono text-slate-500">09:41</span>
                  <div className="w-16 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">5G</span>
                </div>

                {/* Simulated Screen of the Brand */}
                <div className="bg-[#0f1117] rounded-[30px] p-4 text-slate-100 space-y-4 border border-slate-800/80">
                  {/* Brand Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2.5">
                      <img 
                        src={brandLogoUrl}
                        alt="Logo"
                        className="h-8 w-auto object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://i.postimg.cc/h4YbXjCk/MISTER-VETOR-removebg-preview.png";
                        }}
                      />
                      <div>
                        <p className="text-xs font-bold text-white leading-none">{tenant?.name || 'Mr. Navalha'}</p>
                        <span className="text-[9px] text-[#C5A059] font-medium">Guarda, Portugal</span>
                      </div>
                    </div>
                    <span className="text-[9px] px-2.5 py-1 bg-[#C5A059]/10 text-[#C5A059] font-bold rounded-full border border-[#C5A059]/30">
                      APP OFICIAL
                    </span>
                  </div>

                  {/* App Hero Banner */}
                  <div className="relative rounded-2xl overflow-hidden h-28 border border-slate-800">
                    <img 
                      src={brandHeroImage} 
                      alt="Barber" 
                      className="w-full h-full object-cover brightness-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        Experiência Premium no Telemóvel
                      </p>
                    </div>
                  </div>

                  {/* Real Services Preview */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serviços Populares</p>
                    {displayServices.slice(0, 2).map(s => (
                      <div key={s.id} className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex justify-between items-center">
                        <span className="text-xs font-semibold text-white">{s.name}</span>
                        <span className="text-xs font-mono font-bold text-[#C5A059]">€{s.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Mobile CTA */}
                  <div className="pt-2">
                    <div className="w-full py-3 bg-[#C5A059] text-slate-950 rounded-xl text-xs font-black uppercase text-center flex items-center justify-center space-x-1.5 shadow-lg group-hover:brightness-110 transition-all">
                      <Smartphone className="w-4 h-4" />
                      <span>Agendar no Telemóvel</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TECNOLOGIA & PRATICIDADE (FOCO EXCLUSIVO NO PWA, SEM APP STORE FAKE) */}
      {/* ========================================================================= */}
      <section className="py-24 bg-[#0d0f15] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-14 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-bold tracking-[0.25em] text-[#C5A059] uppercase">
              Tecnologia & Praticidade
            </span>

            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-tight">
              O seu horário,<br />
              sempre consigo.
            </h2>

            <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed max-w-xl">
              Agende online, consulte os seus horários e acompanhe a sua experiência diretamente no seu telemóvel com facilidade instantânea.
            </p>

            {/* Apenas PWA nativo limpo */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenMobileView}
                className="px-8 py-4 bg-white hover:bg-slate-200 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-xl transition-all flex items-center space-x-2.5"
              >
                <Smartphone className="w-4 h-4 text-slate-950" />
                <span>Abrir App</span>
              </button>

              <button
                onClick={scrollToBooking}
                className="px-8 py-4 bg-transparent hover:bg-white/5 text-slate-200 font-bold text-xs uppercase tracking-widest rounded-full border border-slate-700 transition-all"
              >
                Agendar Pelo Site
              </button>
            </div>

            <p className="text-xs text-slate-400 pt-2 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
              <span>Sem necessidade de download pesado. Funciona diretamente no seu navegador.</span>
            </p>
          </div>

          {/* Realistic Phone Demonstration */}
          <div className="lg:col-span-5 flex justify-center">
            <div 
              onClick={onOpenMobileView}
              className="w-full max-w-[320px] bg-slate-950 p-4 rounded-[40px] border-4 border-slate-800 shadow-2xl cursor-pointer group"
            >
              <div className="bg-[#11141c] rounded-[28px] p-5 space-y-4 text-center border border-slate-800">
                <img
                  src={brandLogoUrl}
                  alt={tenant?.name || 'Mr. Navalha'}
                  className="h-10 w-auto mx-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://i.postimg.cc/h4YbXjCk/MISTER-VETOR-removebg-preview.png";
                  }}
                />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white uppercase">App {tenant?.name || 'Mr. Navalha'}</h4>
                  <p className="text-xs text-slate-400">Instalação Instantânea em 1 Toque</p>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <span className="text-[#C5A059] font-bold">✓</span>
                    <span>Confirmação imediata</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300">
                    <span className="text-[#C5A059] font-bold">✓</span>
                    <span>Lembrete por WhatsApp / SMS</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300">
                    <span className="text-[#C5A059] font-bold">✓</span>
                    <span>Sem senhas complicadas</span>
                  </div>
                </div>

                <div className="w-full py-3 bg-[#C5A059] text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider shadow-md">
                  Acessar no Telemóvel
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. HISTÓRIA DO MR. NAVALHA — EDITORIAL COM FOTOGRAFIA REAL */}
      {/* ========================================================================= */}
      <section id="historia" className="py-24 bg-[#090a0f] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Lado Esquerdo: Fotografia Editorial do Espaço */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl aspect-[4/5]">
                <img
                  src={brandStoryImage}
                  alt={tenant?.name || 'História'}
                  className="w-full h-full object-cover filter brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-xs font-mono uppercase text-[#C5A059] tracking-widest">Excelência & Tradição</p>
                  <p className="text-lg font-bold text-white mt-1">Guarda, Portugal</p>
                </div>
              </div>
            </div>

            {/* Lado Direito: Narrativa e Identidade */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-bold tracking-[0.25em] text-[#C5A059] uppercase">
                Tradição & Visagismo
              </span>

              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-tight">
                História do {tenant?.name || 'Mr. Navalha'}
              </h2>

              <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed font-light">
                {tenant?.businessHistory ? (
                  <p className="whitespace-pre-line">
                    {tenant.businessHistory}
                  </p>
                ) : (
                  <>
                    <p>
                      Fundada com o compromisso inabalável de resgatar o melhor da barbearia tradicional combinada com as técnicas contemporâneas de visagismo, o Mr. Navalha na Guarda consolidou-se como um espaço de referência para homens que prezam por elegância, pontualidade e bem-estar.
                    </p>
                    <p>
                      Aqui, cada corte e barba é tratado como uma obra de arte individual. Oferecemos um ambiente exclusivo onde pode relaxar a mente, desfrutar de um bom café e renovar a sua presença com confiança.
                    </p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-white uppercase">Precisão</p>
                  <p className="text-slate-400">Navalha clássica e acabamento milimétrico</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-white uppercase">Pontualidade</p>
                  <p className="text-slate-400">Atendimento rigoroso sem tempo de espera</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-white uppercase">Hospitalidade</p>
                  <p className="text-slate-400">Espaço climatizado, café espresso e ambiente acolhedor</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. PRODUTOS REAIS (APENAS SE EXISTIREM NO FIREBASE) */}
      {/* ========================================================================= */}
      {availableProducts.length > 0 && (
        <section className="py-24 bg-[#0d0f15] border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-14 space-y-12">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-bold tracking-[0.25em] text-[#C5A059] uppercase">
                Cuidados Pessoais
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
                Produtos Disponíveis no Espaço
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {availableProducts.map(prod => (
                <div key={prod.id} className="bg-[#12141c] border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-3">
                  <img src={prod.imageUrl} alt={prod.name} className="w-full h-44 object-cover rounded-xl" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm truncate">{prod.name}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{prod.description}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-mono font-bold text-[#C5A059]">€{prod.price.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Disponível no local</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 8. AGENDAMENTO ONLINE — BOOKING PREMIUM, CLARO E FLUIDO */}
      {/* ========================================================================= */}
      <section id="agendamento-online" className="py-24 bg-[#090a0f] border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-bold tracking-[0.25em] text-[#C5A059] uppercase">
              Marcação Direta
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              Reserve o Seu Horário Online
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Selecione o serviço, data e profissional de sua preferência com confirmação instantânea.
            </p>
          </div>

          {confirmedBooking ? (
            <div className="bg-[#12141c] border border-[#C5A059] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-[#C5A059] text-slate-950 flex items-center justify-center mx-auto shadow-xl">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase">Reserva Confirmada com Sucesso!</h3>
              <p className="text-xs text-slate-400">
                O seu agendamento foi guardado com sucesso no sistema do {tenant?.name || 'Mr. Navalha'}.
              </p>

              <div className="bg-[#090a0f] border border-slate-800 rounded-2xl p-6 text-left text-xs space-y-2.5">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Código da Reserva:</span>
                  <span className="font-mono font-bold text-[#C5A059]">#{confirmedBooking.id.slice(-6)}</span>
                </div>
                <p className="text-slate-200"><strong>Serviço:</strong> {confirmedBooking.serviceName}</p>
                <p className="text-slate-200"><strong>Profissional:</strong> {confirmedBooking.professionalName}</p>
                <p className="text-slate-200"><strong>Data e Hora:</strong> {selectedDate} às {selectedTimeSlot}</p>
                <p className="text-slate-200"><strong>Valor a Pagar no Local:</strong> €{confirmedBooking.price.toFixed(2)}</p>
              </div>

              <button
                onClick={() => setConfirmedBooking(null)}
                className="px-8 py-3.5 bg-[#C5A059] hover:bg-[#d8b065] text-slate-950 font-bold rounded-full text-xs uppercase tracking-wider"
              >
                Fazer Novo Agendamento
              </button>
            </div>
          ) : (
            <form onSubmit={handleBookDesktop} className="bg-[#12141c] border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 1. Escolha o Serviço */}
                <div className="space-y-3">
                  <label className="text-xs font-bold tracking-wider text-[#C5A059] uppercase block">
                    1. Serviço
                  </label>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {displayServices.map((srv) => (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          selectedService?.id === srv.id
                            ? 'bg-slate-800 text-white font-bold border-[#C5A059]'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate pr-2">{srv.name}</span>
                        <span className="font-mono font-bold text-[#C5A059]">€{srv.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Escolha o Profissional */}
                <div className="space-y-3">
                  <label className="text-xs font-bold tracking-wider text-[#C5A059] uppercase block">
                    2. Profissional
                  </label>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    <div
                      onClick={() => setSelectedBarber(null)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 text-xs ${
                        selectedBarber === null
                          ? 'bg-slate-800 text-white font-bold border-[#C5A059]'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-[#C5A059] text-slate-950 flex items-center justify-center font-bold text-xs">
                        ★
                      </div>
                      <span>Primeiro Disponível</span>
                    </div>

                    {availableBarbers.map((barber) => (
                      <div
                        key={barber.id}
                        onClick={() => setSelectedBarber(barber)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 text-xs ${
                          selectedBarber?.id === barber.id
                            ? 'bg-slate-800 text-white font-bold border-[#C5A059]'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={barber.avatarUrl}
                          alt={barber.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div className="truncate">
                          <p className="font-bold text-white truncate">{barber.name}</p>
                          <p className="text-[10px] text-slate-400">{barber.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Data e Horário */}
                <div className="space-y-3">
                  <label className="text-xs font-bold tracking-wider text-[#C5A059] uppercase block">
                    3. Data e Horário
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:border-[#C5A059] focus:outline-none"
                  />

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 font-semibold block">Horários Disponíveis:</span>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                      {(() => {
                        const dateObj = new Date(selectedDate + 'T12:00:00');
                        const dayOfWeek = dateObj.getDay();
                        const defaultHours = { active: dayOfWeek !== 0, start: '09:00', end: '20:30' };
                        const dayHours = tenant?.workingHours 
                          ? (tenant.workingHours[dayOfWeek] || tenant.workingHours[String(dayOfWeek)] || defaultHours) 
                          : defaultHours;

                        const allSlots: string[] = [];
                        if (dayHours && dayHours.active) {
                          const [sH, sM] = (dayHours.start || '09:00').split(':').map(Number);
                          const [eH, eM] = (dayHours.end || '20:30').split(':').map(Number);
                          const startMin = (isNaN(sH) ? 9 : sH) * 60 + (isNaN(sM) ? 0 : sM);
                          const endMin = (isNaN(eH) ? 20 : eH) * 60 + (isNaN(eM) ? 30 : eM);

                          for (let m = startMin; m < endMin; m += 30) {
                            const hh = String(Math.floor(m / 60)).padStart(2, '0');
                            const mm = String(m % 60).padStart(2, '0');
                            allSlots.push(`${hh}:${mm}`);
                          }
                        }

                        const available = allSlots.filter(isTimeSlotAvailable);
                        if (available.length === 0) {
                          return (
                            <div className="col-span-3 py-4 text-center text-rose-400 text-xs font-semibold">
                              Fechado ou sem vagas nesta data.
                            </div>
                          );
                        }
                        return available.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTimeSlot(time)}
                            className={`py-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                              selectedTimeSlot === time
                                ? 'bg-[#C5A059] text-slate-950 border-[#C5A059]'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {time}
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiet Service & Notas */}
              <div className="border-t border-slate-800/80 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  onClick={() => setQuietService(!quietService)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    quietService 
                      ? 'bg-[#C5A059]/10 border-[#C5A059]' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${quietService ? 'bg-[#C5A059] text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <VolumeX className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                        Quiet Service
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Atendimento silencioso para relaxar
                      </p>
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${quietService ? 'bg-[#C5A059]' : 'bg-slate-800'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${quietService ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Observações (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Prefiro tesoura no topo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="border-t border-slate-800/80 pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-[#C5A059] focus:outline-none"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Telemóvel / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:border-[#C5A059] focus:outline-none"
                    placeholder="+351 912 345 678"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Email (Opcional)</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-[#C5A059] focus:outline-none"
                    placeholder="joao@exemplo.pt"
                  />
                </div>
              </div>

              {/* Botão de Confirmação */}
              <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400">Total a pagar na barbearia:</p>
                  <p className="text-2xl font-black font-mono text-[#C5A059]">
                    €{finalTotalPrice.toFixed(2)}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-10 py-4 bg-[#C5A059] hover:bg-[#d8b065] text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-2xl transition-all flex items-center space-x-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}</span>
                </button>
              </div>

            </form>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. LOCALIZAÇÃO E HORÁRIO EDITORIAL */}
      {/* ========================================================================= */}
      <section className="py-20 bg-[#0d0f15] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Localização</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {tenant?.address || 'Rua Dr. Francisco dos Prazeres 2'}<br />
              {tenant?.zipCode || '6300-556'} {tenant?.city || 'Guarda, Portugal'}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Horário de Funcionamento</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Segunda a Sexta: 09:00 - 20:30<br />
              Sábado: 09:00 - 20:30<br />
              Domingo: Fechado para descanso
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Contacto Direto</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Telemóvel: {tenant?.phone || '+351 912 345 678'}<br />
              Email: {tenant?.email || 'contacto@misternavalha.pt'}
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FOOTER — DIRETO, ELEGANTE E COM LOGO TRANSPARENTE */}
      {/* ========================================================================= */}
      <footer className="bg-[#090a0f] py-14 px-6 lg:px-14 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-800/80 pb-8">
          <img
            src={brandLogoUrl}
            alt={tenant?.name || 'Mr. Navalha'}
            className="h-10 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://i.postimg.cc/h4YbXjCk/MISTER-VETOR-removebg-preview.png";
            }}
          />

          <div className="flex items-center space-x-6 uppercase tracking-wider font-semibold text-slate-400 text-[11px]">
            <a href="#inicio" className="hover:text-white transition-colors">Início</a>
            <a href="#servicos" className="hover:text-white transition-colors">Serviços</a>
            <a href="#agendamento-online" className="hover:text-white transition-colors">Agendar</a>
            <a href="#historia" className="hover:text-white transition-colors">História</a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} {tenant?.name || 'Mr. Navalha'}. Todos os direitos reservados.</p>
          <p>Experiência Digital & Agendamento Online</p>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 11. MOBILE BOTTOM FLOATING CTA (AGENDAR HORÁRIO) */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3.5 bg-[#090a0f]/95 backdrop-blur-md border-t border-slate-800 z-50 flex gap-2">
        <button
          onClick={onOpenMobileView}
          className="p-3 rounded-full bg-slate-900 border border-slate-700 text-slate-200 flex items-center justify-center"
          title="Abrir App Mobile"
        >
          <Smartphone className="w-5 h-5 text-[#C5A059]" />
        </button>
        <button
          onClick={scrollToBooking}
          className="flex-1 py-3 bg-[#C5A059] text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-lg flex items-center justify-center space-x-1.5"
        >
          <Calendar className="w-4 h-4" />
          <span>Agendar Horário</span>
        </button>
      </div>

      {/* Back to top button on desktop */}
      <button
        onClick={scrollToTop}
        className="hidden md:flex fixed bottom-6 right-6 w-11 h-11 rounded-full bg-[#C5A059] hover:bg-[#d8b065] text-slate-950 items-center justify-center shadow-2xl z-30 transition-all hover:scale-110"
        title="Voltar ao topo"
      >
        <ArrowUp className="w-5 h-5 stroke-[2.5]" />
      </button>

    </div>
  );
};
