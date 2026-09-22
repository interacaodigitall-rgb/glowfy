import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { TenantProvider, useTenant } from './features/tenants/TenantContext';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';

// Views
import { AppointmentsView } from './components/views/AppointmentsView';
import { ClientsView } from './components/views/ClientsView';
import { ServicesView } from './components/views/ServicesView';
import { ProfessionalsView } from './components/views/ProfessionalsView';
import { ProductsView } from './components/views/ProductsView';
import { SalesView } from './components/views/SalesView';
import { LoyaltyView } from './components/views/LoyaltyView';
import { ReportsView } from './components/views/ReportsView';
import { WhiteLabelView } from './components/views/WhiteLabelView';
import { SaasMasterView } from './components/views/SaasMasterView';

// Auth & Modals
import { LoginPage } from './components/auth/LoginPage';
import { PublicClientPortal } from './components/public/PublicClientPortal';
import { NewBookingModal } from './components/modals/NewBookingModal';
import { OnboardingModal } from './components/modals/OnboardingModal';

import { Appointment } from './types';
import { updateDynamicPWAManifest } from './features/tenants/pwaService';
import { Building2, ShieldCheck, Plus, Store } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentTenant, allTenants, loading: tenantLoading, switchTenant } = useTenant();
  const { isSuperAdmin, isMerchant, isAuthenticated, activeMerchantSession, loading: authLoading } = useAuth();
  
  // Default to appointments or saasMaster depending on credentials
  const [activeTab, setActiveTab] = useState<TabType>('appointments');

  // Modals & Overlay state
  const [isLoginPageOpen, setIsLoginPageOpen] = useState(false);
  const [loginPageDefaultTab, setLoginPageDefaultTab] = useState<'super_admin' | 'merchant'>('merchant');
  const [isPublicPortalOpen, setIsPublicPortalOpen] = useState(false);
  const [portalMode, setPortalMode] = useState<'mobile' | 'pc'>('mobile');
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [newBookingInitialDate, setNewBookingInitialDate] = useState<string | undefined>(undefined);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  // Appointment passed directly to POS checkout
  const [checkoutApp, setCheckoutApp] = useState<Appointment | null>(null);

  // Switch tabs and sync tenant state upon authentication
  useEffect(() => {
    if (isAuthenticated) {
      if (isSuperAdmin) {
        setActiveTab('saasMaster');
      } else if (isMerchant && activeMerchantSession) {
        setActiveTab('appointments');
        if (currentTenant?.id !== activeMerchantSession.tenantId) {
          switchTenant(activeMerchantSession.tenantId);
        }
      }
    }
  }, [isAuthenticated, isSuperAdmin, isMerchant, activeMerchantSession]);

  const GLOWFY_FAVICON = 'https://i.postimg.cc/j2DZ0wxr/glowfy-hub-logo.png';
  const GLOWFY_TITLE = 'Glowfy Hub — Vertical Engine for Beauty & Aesthetics';

  const updateBrowserFavicon = (iconUrl: string) => {
    if (typeof document === 'undefined') return;
    const selectors = ["link[rel*='icon']", "link[rel='apple-touch-icon']", "link[rel='shortcut icon']"];
    const existingLinks = document.querySelectorAll<HTMLLinkElement>(selectors.join(', '));
    
    if (existingLinks.length > 0) {
      existingLinks.forEach(link => {
        link.href = iconUrl;
      });
    } else {
      const link = document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      link.href = iconUrl;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  };

  useEffect(() => {
    // Check if URL has public store slug or query
    const path = window.location.pathname;
    const cleanPath = path.replace(/^\/(b\/)?/, '').split('/')[0];
    const reservedPaths = ['admin', 'login', 'dashboard', 'saas', 'super-admin', ''];
    const isPublicStoreRoute = path.startsWith('/b/') || (Boolean(cleanPath) && !reservedPaths.includes(cleanPath)) || Boolean(window.location.search.includes('tenant='));

    if (isPublicStoreRoute) {
      setIsPublicPortalOpen(true);
    }
  }, []);

  // Update document title, favicon and PWA manifest consistently
  useEffect(() => {
    const path = window.location.pathname;
    const cleanPath = path.replace(/^\/(b\/)?/, '').split('/')[0];
    const reservedPaths = ['admin', 'login', 'dashboard', 'saas', 'super-admin', ''];
    const isDirectStorePath = path.startsWith('/b/') || (Boolean(cleanPath) && !reservedPaths.includes(cleanPath));
    const isPublicStoreRoute = isDirectStorePath || Boolean(window.location.search.includes('tenant='));
    const isPublicStoreActive = (isPublicStoreRoute || isPublicPortalOpen) && !isLoginPageOpen && (isDirectStorePath || window.location.search.includes('tenant='));

    if (isPublicStoreActive && currentTenant) {
      const targetFavicon = currentTenant.faviconUrl || currentTenant.logoUrl || GLOWFY_FAVICON;
      document.title = `${currentTenant.name} | Agendamento Online`;
      updateBrowserFavicon(targetFavicon);
      updateDynamicPWAManifest(currentTenant);
    } else {
      // Glowfy Hub Platform / Login / Admin CRM / SaaS Master
      document.title = GLOWFY_TITLE;
      updateBrowserFavicon(GLOWFY_FAVICON);
    }
  }, [currentTenant, isPublicPortalOpen, isLoginPageOpen]);

  const handleLaunchPOS = (app: Appointment) => {
    setCheckoutApp(app);
    setActiveTab('sales');
  };

  const handleOpenPortal = (mode: 'mobile' | 'pc' = 'mobile') => {
    setPortalMode(mode);
    setIsPublicPortalOpen(true);
  };

  const handleOpenLogin = (defaultTab: 'super_admin' | 'merchant' = 'super_admin') => {
    setLoginPageDefaultTab(defaultTab);
    setIsLoginPageOpen(true);
  };

  // Auto-protect: If merchant role, never allow saasMaster tab
  useEffect(() => {
    if (!isSuperAdmin && activeTab === 'saasMaster') {
      setActiveTab('appointments');
    }
  }, [isSuperAdmin, activeTab]);

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center text-[#111827] space-y-4 font-sans">
        <div className="w-10 h-10 rounded-full border-3 border-[#C5A059] border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-[#6B7280]">Carregando Glowfy Hub...</p>
      </div>
    );
  }

  // Render Full Screen Public White-Label Portal if requested (Accessible publicly)
  if (isPublicPortalOpen) {
    return (
      <PublicClientPortal 
        initialViewMode={portalMode} 
        onClosePortal={() => setIsPublicPortalOpen(false)} 
      />
    );
  }

  // Force login page for all unauthenticated users
  if (!isAuthenticated) {
    return (
      <LoginPage
        defaultTab="merchant"
        onSuccessSuperAdmin={() => {
          // Active session triggers saasMaster redirection
        }}
        onSuccessMerchant={(tenantId) => {
          switchTenant(tenantId);
          setActiveTab('appointments');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] font-sans flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onOpenPublicPortal={handleOpenPortal}
        onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
        onOpenNewBooking={() => setIsNewBookingModalOpen(true)}
        onOpenLogin={handleOpenLogin}
      />

      {/* Main Admin Dashboard Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic View Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Zero state banner if no tenants registered and user is viewing store modules */}
          {allTenants.length === 0 && activeTab !== 'saasMaster' ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-8 space-y-5 shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 text-[#C5A059] flex items-center justify-center mx-auto">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#111827]">
                  Sistema Ativo e Pronto para Cadastros do Zero
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280] max-w-md mx-auto leading-relaxed">
                  Não há comerciantes registados de momento. Como Super Admin, tem permissão total para cadastrar cada negócio (barbearia, salão de beleza, nails designer ou clínica estética) com catálogo e ambiência próprios.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('saasMaster')}
                  className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg shadow-sm flex items-center space-x-2 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Aceder ao SaaS Master & Cadastrar Comerciante</span>
                </button>
                <button
                  onClick={() => handleOpenLogin('super_admin')}
                  className="px-4 py-2.5 bg-white hover:bg-gray-50 text-[#111827] rounded-lg border border-gray-200 text-xs font-semibold transition-colors shadow-sm"
                >
                  <span>Login Super Admin</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'appointments' && (
                <AppointmentsView
                  onOpenNewBooking={(targetDate?: string) => {
                    setNewBookingInitialDate(targetDate);
                    setIsNewBookingModalOpen(true);
                  }}
                  onLaunchPOSWithAppointment={handleLaunchPOS}
                />
              )}

              {activeTab === 'clients' && <ClientsView />}

              {activeTab === 'services' && <ServicesView />}

              {activeTab === 'professionals' && <ProfessionalsView />}

              {activeTab === 'products' && <ProductsView />}

              {activeTab === 'sales' && (
                <SalesView
                  initialAppointmentForCheckout={checkoutApp}
                  onClearInitialAppointment={() => setCheckoutApp(null)}
                />
              )}

              {activeTab === 'loyalty' && <LoyaltyView />}

              {activeTab === 'reports' && <ReportsView />}

              {activeTab === 'whiteLabel' && (
                <WhiteLabelView onOpenPublicPortal={handleOpenPortal} />
              )}

              {activeTab === 'saasMaster' && <SaasMasterView />}
            </>
          )}
        </main>
      </div>

      {/* Login Modal / Overlay */}
      {isLoginPageOpen && (
        <LoginPage
          defaultTab={loginPageDefaultTab}
          onClose={() => setIsLoginPageOpen(false)}
          onSuccessSuperAdmin={() => {
            setIsLoginPageOpen(false);
            setActiveTab('saasMaster');
          }}
          onSuccessMerchant={(tenantId) => {
            setIsLoginPageOpen(false);
            switchTenant(tenantId);
            setActiveTab('appointments');
          }}
        />
      )}

      {/* Modals */}
      <NewBookingModal
        isOpen={isNewBookingModalOpen}
        initialDate={newBookingInitialDate}
        onClose={() => {
          setIsNewBookingModalOpen(false);
          setNewBookingInitialDate(undefined);
        }}
        onBookingSuccess={() => {
          // Re-trigger view update if needed
        }}
      />

      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <MainAppContent />
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
