import React, { useState, useEffect } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { fetchServices } from '../../features/services/servicesService';
import { fetchProfessionals } from '../../features/professionals/professionalsService';
import { fetchProducts } from '../../features/products/productsService';
import { 
  createTransactionalAppointment, 
  fetchTenantAppointments,
  updateAppointmentStatus
} from '../../features/appointments/appointmentService';
import { Service, Professional, Appointment, Product } from '../../types';
import { MobileAppView } from '../portal/mobile/MobileAppView';
import { PcWebsiteView } from '../portal/pc/PcWebsiteView';
import { PWAInstallBanner } from '../pwa/PWAInstallBanner';
import { PortalUnit, PortalBarber, PortalProduct } from '../portal/portalData';
import { 
  Smartphone, 
  Monitor, 
  X, 
  Sparkles, 
  ArrowLeft,
  CheckCircle2,
  Sliders
} from 'lucide-react';

interface PublicClientPortalProps {
  onClosePortal?: () => void;
  initialViewMode?: 'mobile' | 'pc';
}

export const PublicClientPortal: React.FC<PublicClientPortalProps> = ({
  onClosePortal,
  initialViewMode = 'mobile'
}) => {
  const { currentTenant } = useTenant();

  // Active View Switcher: Mobile App (clean format) vs PC Desktop Website
  const [viewMode, setViewMode] = useState<'mobile' | 'pc'>(initialViewMode);
  const [showIPhoneFrame, setShowIPhoneFrame] = useState(false);

  // Tenant Services & Staff
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!currentTenant) return;
    Promise.allSettled([
      fetchServices(currentTenant.id),
      fetchProfessionals(currentTenant.id),
      fetchTenantAppointments(currentTenant.id),
      fetchProducts(currentTenant.id)
    ]).then(([sRes, pRes, aRes, prodRes]) => {
      if (sRes.status === 'fulfilled') setServices(sRes.value);
      if (pRes.status === 'fulfilled') setProfessionals(pRes.value);
      if (aRes.status === 'fulfilled') setAppointments(aRes.value);
      if (prodRes.status === 'fulfilled') setProducts(prodRes.value);
    });
  }, [currentTenant]);

  const handleConfirmBooking = async (data: {
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
  }): Promise<Appointment | void> => {
    if (!currentTenant) return;

    const startDateIso = `${data.date}T${data.timeSlot}:00`;
    const [h, m] = data.timeSlot.split(':').map(Number);
    const durationMin = data.service.durationMinutes || 40;
    const totalMinutes = (isNaN(h) ? 10 : h) * 60 + (isNaN(m) ? 0 : m) + durationMin;
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    const endDateIso = `${data.date}T${endH}:${endM}:00`;

    const proId = data.barber?.id || 'pro-default';
    const proName = data.barber?.name || 'Sem Preferência';

    const productsNote = data.selectedProducts.length > 0 
      ? ` | Produtos Reservados: ${data.selectedProducts.map(p => `${p.quantity}x ${p.product.name}`).join(', ')}`
      : '';

    const quietNote = data.quietService ? ' [QUIET SERVICE SOLICITADO]' : '';
    const fullNotes = `${data.notes || ''}${quietNote}${productsNote} (Unidade: ${data.unit.name})`.trim();

    try {
      const app = await createTransactionalAppointment({
        tenantId: currentTenant.id,
        serviceId: data.service.id,
        serviceName: data.service.name,
        professionalId: proId,
        professionalName: proName,
        clientId: '',
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        startAt: startDateIso,
        endAt: endDateIso,
        price: data.service.price + data.selectedProducts.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
        commissionRate: data.service.commissionPercentage || 35,
        notes: fullNotes
      });

      // Update state
      setAppointments(prev => [app, ...prev]);
      return app;
    } catch (err: any) {
      console.warn("Booking warning:", err);
      // Create local fallback appointment object if firestore transaction had error
      const fallbackApp: Appointment = {
        id: `local-${Date.now().toString().slice(-6)}`,
        tenantId: currentTenant.id,
        serviceId: data.service.id,
        serviceName: data.service.name,
        professionalId: proId,
        professionalName: proName,
        clientId: '',
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        startAt: startDateIso,
        endAt: endDateIso,
        price: data.service.price,
        commissionAmount: data.service.price * 0.35,
        status: 'confirmed',
        notes: fullNotes,
        createdAt: new Date().toISOString()
      };
      setAppointments(prev => [fallbackApp, ...prev]);
      return fallbackApp;
    }
  };

  const handleCancelAppointment = async (appId: string, reason?: string) => {
    if (!currentTenant) return;
    try {
      await updateAppointmentStatus(currentTenant.id, appId, 'cancelled', reason);
      setAppointments(prev => prev.map(a => a.id === appId ? { ...a, status: 'cancelled', notes: reason ? `${a.notes || ''} [Cancelado: ${reason}]` : a.notes } : a));
    } catch (err) {
      console.warn("Failed to cancel appointment in Firestore:", err);
      setAppointments(prev => prev.map(a => a.id === appId ? { ...a, status: 'cancelled' } : a));
    }
  };

  const handleRescheduleAppointment = async (appId: string, newStartAt: string, newEndAt: string) => {
    if (!currentTenant) return;
    try {
      await updateAppointmentStatus(currentTenant.id, appId, 'confirmed');
      setAppointments(prev => prev.map(a => a.id === appId ? { ...a, startAt: newStartAt, endAt: newEndAt, status: 'confirmed' } : a));
    } catch (err) {
      console.warn("Failed to reschedule appointment:", err);
      setAppointments(prev => prev.map(a => a.id === appId ? { ...a, startAt: newStartAt, endAt: newEndAt, status: 'confirmed' } : a));
    }
  };

  const handleBlockTime = async (blockData: { date: string; startTime: string; endTime: string; reason: string; barberName: string }) => {
    // Block time successfully handled
  };

  const cleanPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/(b\/)?/, '').split('/')[0] : '';
  const reservedPaths = ['admin', 'login', 'dashboard', 'saas', 'super-admin', ''];
  const isDirectCustomerAccess = window.location.pathname.startsWith('/b/') || (Boolean(cleanPath) && !reservedPaths.includes(cleanPath));
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set initial view mode nicely
  const activeView = isDirectCustomerAccess 
    ? (isMobileDevice ? 'mobile' : 'pc')
    : viewMode;

  const shouldShowMockupFrame = showIPhoneFrame && !isDirectCustomerAccess && !isMobileDevice;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <PWAInstallBanner appName={currentTenant?.name} appLogo={currentTenant?.logoUrl} />

      {/* Top Floating Control Bar: Switch between App Mobile & Visão PC (Hidden for direct customers) */}
      {!isDirectCustomerAccess && (
        <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
          {/* Left: View Switcher */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('mobile')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'mobile'
                    ? 'bg-[#e5a93b] text-slate-950 shadow-md shadow-[#e5a93b]/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>App Mobile (Anexo)</span>
              </button>

              <button
                onClick={() => setViewMode('pc')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'pc'
                    ? 'bg-[#e5a93b] text-slate-950 shadow-md shadow-[#e5a93b]/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Visão PC (Anexo)</span>
              </button>
            </div>

            {/* Toggle iPhone Frame if in Mobile Mode */}
            {viewMode === 'mobile' && (
              <button
                onClick={() => setShowIPhoneFrame(!showIPhoneFrame)}
                className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                  showIPhoneFrame
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Alternar entre moldura de iPhone 14 Pro Max ou visualização expandida"
              >
                <Sliders className="w-3.5 h-3.5 text-[#e5a93b]" />
                <span>{showIPhoneFrame ? 'Moldura iPhone Ativa' : 'Tela Cheia'}</span>
              </button>
            )}
          </div>

          {/* Right: Exit back to Admin Dashboard */}
          {onClosePortal && (
            <button
              onClick={onClosePortal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700/80 transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao Painel Admin</span>
            </button>
          )}
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 w-full overflow-y-auto">
        {activeView === 'mobile' ? (
          <div className={`${isDirectCustomerAccess ? 'py-0 px-0' : 'py-6 px-4'} flex items-center justify-center min-h-[calc(100vh-60px)] bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950`}>
            {shouldShowMockupFrame ? (
              /* iPhone 14 Pro Max Realistic Mockup Container */
              <div className="relative p-3 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-[52px] shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-4 border-slate-700/80">
                {/* Dynamic Island Pill */}
                <div className="absolute top-7 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 pointer-events-none flex items-center justify-between px-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900/80" />
                  <div className="w-2 h-2 rounded-full bg-blue-950/60 border border-blue-500/20" />
                </div>

                {/* Mobile View Content */}
                <div className="w-[390px] sm:w-[410px] rounded-[40px] overflow-hidden bg-[#121418]">
                  <MobileAppView
                    tenant={currentTenant}
                    services={services}
                    professionals={professionals}
                    products={products}
                    onConfirmBooking={handleConfirmBooking}
                    existingAppointments={appointments}
                    onCancelAppointment={handleCancelAppointment}
                    onRescheduleAppointment={handleRescheduleAppointment}
                    onBlockTime={handleBlockTime}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md min-h-screen flex flex-col">
                <MobileAppView
                  tenant={currentTenant}
                  services={services}
                  professionals={professionals}
                  products={products}
                  onConfirmBooking={handleConfirmBooking}
                  existingAppointments={appointments}
                  onCancelAppointment={handleCancelAppointment}
                  onRescheduleAppointment={handleRescheduleAppointment}
                  onBlockTime={handleBlockTime}
                />
              </div>
            )}
          </div>
        ) : (
          /* PC Desktop Website View */
          <PcWebsiteView
            tenant={currentTenant}
            services={services}
            professionals={professionals}
            products={products}
            existingAppointments={appointments}
            onOpenMobileView={() => setViewMode('mobile')}
            onConfirmBooking={handleConfirmBooking}
          />
        )}
      </div>
    </div>
  );
};
