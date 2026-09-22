import React, { useState, useEffect } from 'react';
import { useTenant } from '../features/tenants/TenantContext';
import { useAuth } from '../features/auth/AuthContext';
import { 
  Building2, 
  ChevronDown, 
  LogOut, 
  ShieldCheck, 
  Plus,
  Smartphone,
  Monitor,
  LogIn,
  Store,
  Bell,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { subscribeToTenantNotifications, markNotificationAsRead } from '../features/notifications/notificationService';
import { TenantNotification } from '../types';

interface NavbarProps {
  onOpenPublicPortal: (mode?: 'mobile' | 'pc') => void;
  onOpenOnboarding: () => void;
  onOpenNewBooking: () => void;
  onOpenLogin: (defaultTab?: 'super_admin' | 'merchant') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenPublicPortal,
  onOpenOnboarding,
  onOpenNewBooking,
  onOpenLogin
}) => {
  const { currentTenant, allTenants, switchTenant, tenantMember, businessMeta } = useTenant();
  const { user, signOut, isSuperAdmin, activeMerchantSession, isMerchant } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);

  useEffect(() => {
    if (!currentTenant) return;
    const unsub = subscribeToTenantNotifications(currentTenant.id, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsub();
  }, [currentTenant]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 px-4 lg:px-6 py-2.5 flex items-center justify-between">
      {/* Brand & Tenant Switcher */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#111827] flex items-center justify-center text-[#C5A059] font-bold text-sm shadow-sm">
            G
          </div>
          <span className="text-base font-semibold tracking-tight text-[#111827] hidden sm:inline">
            Glowfy<span className="text-[#C5A059] font-bold ml-0.5">Hub</span>
          </span>
        </div>

        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

        {/* Tenant Scope Display: If Merchant, show locked badge; If Super Admin, show Switcher */}
        {isMerchant ? (
          <div className="flex items-center space-x-2 bg-gray-50 text-[#111827] px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#C5A059]" />
            <span className="font-semibold">{currentTenant ? currentTenant.name : 'Meu Estabelecimento'}</span>
            <span className="px-1.5 py-0.5 bg-gray-200/70 text-[#6B7280] text-[10px] rounded uppercase font-medium">
              Loja Oficial
            </span>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 text-[#111827] px-3 py-1.5 rounded-lg border border-gray-200 transition-colors text-xs font-medium"
            >
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#C5A059]"
              />
              <span className="max-w-[140px] sm:max-w-[180px] truncate font-semibold text-[#111827]">
                {currentTenant ? currentTenant.name : (allTenants.length === 0 ? 'Zero Comerciantes' : 'Selecionar Negócio')}
              </span>
              <span className="px-1.5 py-0.5 bg-gray-200/80 text-[#6B7280] text-[10px] rounded uppercase font-mono">
                {currentTenant ? businessMeta.label.split('/')[0].trim() : `${allTenants.length} lojas`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2 divide-y divide-gray-100">
                <div className="p-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center justify-between">
                  <span>Comércios ({allTenants.length})</span>
                  <span className="text-[10px] text-gray-400 font-mono">Multi-Tenant</span>
                </div>

                {allTenants.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#6B7280] space-y-2">
                    <p>Nenhum comerciante registado ainda.</p>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenOnboarding();
                      }}
                      className="w-full py-2 bg-[#C5A059] hover:bg-[#B38F46] text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      + Cadastrar Primeiro Comerciante
                    </button>
                  </div>
                ) : (
                  <div className="py-1 max-h-60 overflow-y-auto space-y-0.5">
                    {allTenants.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          switchTenant(t.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors ${
                          t.id === currentTenant?.id 
                            ? 'bg-[#C5A059]/10 text-[#8C6D23] font-semibold' 
                            : 'hover:bg-gray-50 text-[#111827]'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <div className="w-2 h-2 rounded-full bg-[#C5A059]" />
                          <div className="truncate">
                            <p className="font-medium text-[#111827]">{t.name}</p>
                            <p className="text-[10px] text-[#6B7280] capitalize">{t.businessType.replace('_', ' ')}</p>
                          </div>
                        </div>
                        {t.id === currentTenant?.id && <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />}
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenOnboarding();
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 bg-gray-50 hover:bg-gray-100 text-[#8C6D23] text-xs py-2 rounded-lg font-semibold border border-gray-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Novo Comerciante</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Super Admin status badge in navbar */}
        {isSuperAdmin && (
          <span className="hidden lg:inline-flex items-center space-x-1 px-2.5 py-1 bg-gray-100 text-[#111827] border border-gray-200 rounded-lg text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Super Admin Geral</span>
          </span>
        )}
      </div>

      {/* Right Actions & User Menu */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* New Booking Quick Action (Champagne Gold Primary) */}
        {currentTenant && (
          <button
            onClick={onOpenNewBooking}
            className="hidden sm:flex items-center space-x-1.5 bg-[#C5A059] hover:bg-[#B38F46] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Agendamento</span>
          </button>
        )}

        {/* View Public White Label Pages - Direct Mobile & PC buttons */}
        {currentTenant && (
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
            <button
              onClick={() => onOpenPublicPortal('mobile')}
              title="Abrir App Mobile no formato Smartphone"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#6B7280] hover:text-[#111827] hover:bg-white transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#8C6D23]" />
              <span className="hidden sm:inline">App Mobile</span>
            </button>

            <button
              onClick={() => onOpenPublicPortal('pc')}
              title="Abrir Website e Portal na Visão PC"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#6B7280] hover:text-[#111827] hover:bg-white transition-colors"
            >
              <Monitor className="w-3.5 h-3.5 text-[#8C6D23]" />
              <span className="hidden sm:inline">Visão PC</span>
            </button>
          </div>
        )}

        {/* Direct Login Page Button */}
        <button
          onClick={() => onOpenLogin()}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-[#111827] rounded-lg border border-gray-200 text-xs font-medium transition-colors shadow-sm"
          title="Página de Login (Super Admin / Comerciante)"
        >
          <LogIn className="w-3.5 h-3.5 text-[#6B7280]" />
          <span className="hidden sm:inline">Acesso & Login</span>
        </button>

        {/* Real-time Notifications Bell for Merchant */}
        {currentTenant && (
          <div className="relative">
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative p-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-[#111827] transition-colors shadow-sm"
              title="Notificações em Tempo Real"
            >
              <Bell className="w-4 h-4 text-[#8C6D23]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#C5A059] text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3 divide-y divide-gray-100 animate-in fade-in duration-150">
                <div className="pb-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-[#8C6D23]" />
                    <span className="font-bold text-xs text-[#111827]">Notificações do Estabelecimento</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C5A059]/10 text-[#8C6D23]">
                      {unreadCount} novas
                    </span>
                  )}
                </div>

                <div className="py-2 max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">Nenhuma notificação recebida ainda.</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationAsRead(currentTenant.id, n.id)}
                        className={`p-2.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                          n.read 
                            ? 'bg-gray-50/60 border-gray-100 text-gray-600' 
                            : 'bg-[#C5A059]/5 border-[#C5A059]/20 text-[#111827] font-medium'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-xs truncate text-[#111827]">{n.title}</p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">
                            {new Date(n.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Account / Auth Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-2 bg-white hover:bg-gray-50 p-1.5 rounded-lg transition-colors border border-gray-200 shadow-sm"
          >
            <div className="w-6 h-6 rounded-md bg-[#111827] flex items-center justify-center text-[#C5A059] font-bold text-xs">
              {isSuperAdmin ? 'S' : (user?.displayName ? user.displayName[0].toUpperCase() : 'M')}
            </div>
            <span className="text-xs text-[#111827] font-medium hidden md:inline">
              {isSuperAdmin ? 'Super Admin' : (activeMerchantSession?.name || 'Comerciante')}
            </span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2 text-xs divide-y divide-gray-100">
              <div className="p-2 mb-1">
                <p className="font-semibold text-[#111827] truncate">
                  {isSuperAdmin ? 'Super Admin Geral' : (user?.displayName || activeMerchantSession?.name || 'Comerciante Gestor')}
                </p>
                <p className="text-[11px] text-[#6B7280] truncate">
                  {isSuperAdmin ? 'interacaodigitall@gmail.com' : (user?.email || activeMerchantSession?.email || 'comerciante@glowfyhub.com')}
                </p>
                <div className="mt-1.5 flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 bg-[#C5A059]/10 text-[#8C6D23] text-[10px] rounded font-semibold">
                    {isSuperAdmin ? 'SUPER ADMIN' : 'COMERCIANTE'}
                  </span>
                  {currentTenant && (
                    <span className="text-[10px] text-[#6B7280] truncate font-medium">
                      {currentTenant.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenLogin('super_admin');
                  }}
                  className="w-full flex items-center space-x-2 p-2 hover:bg-gray-50 text-[#111827] rounded-lg transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#8C6D23]" />
                  <span>Aceder como Super Admin</span>
                </button>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenLogin('merchant');
                  }}
                  className="w-full flex items-center space-x-2 p-2 hover:bg-gray-50 text-[#111827] rounded-lg transition-colors"
                >
                  <Store className="w-3.5 h-3.5 text-[#8C6D23]" />
                  <span>Aceder Loja do Comerciante</span>
                </button>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    signOut();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Terminar Sessão</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
