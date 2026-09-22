import React from 'react';
import { 
  Calendar, 
  Users, 
  Scissors, 
  UserCheck, 
  Package, 
  CreditCard, 
  Gift, 
  BarChart3, 
  Sliders, 
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useTenant } from '../features/tenants/TenantContext';
import { useAuth } from '../features/auth/AuthContext';

export type TabType = 
  | 'appointments' 
  | 'clients' 
  | 'services' 
  | 'professionals' 
  | 'products' 
  | 'sales' 
  | 'loyalty' 
  | 'reports' 
  | 'whiteLabel' 
  | 'saasMaster';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentTenant, businessMeta } = useTenant();
  const { isSuperAdmin } = useAuth();

  const baseNavItems = [
    { id: 'appointments' as TabType, label: 'Agenda & Reservas', icon: Calendar },
    { id: 'clients' as TabType, label: 'Clientes & CRM', icon: Users },
    { id: 'services' as TabType, label: businessMeta.serviceTerm + 's', icon: Scissors },
    { id: 'professionals' as TabType, label: businessMeta.professionalTerm + 's', icon: UserCheck },
    { id: 'products' as TabType, label: 'Produtos & Stock', icon: Package },
    { id: 'sales' as TabType, label: 'Caixa & Vendas (POS)', icon: CreditCard },
    { id: 'loyalty' as TabType, label: 'Fidelização & Posição', icon: Gift },
    { id: 'reports' as TabType, label: 'Relatórios & Comissões', icon: BarChart3 },
    { id: 'whiteLabel' as TabType, label: 'Perfil & Marca (White-Label)', icon: Sliders },
  ];

  // Strictly isolate SaaS Master Admin: ONLY available to Super Admin (interacaodigitall@gmail.com / superadmin)
  const navItems = isSuperAdmin
    ? [...baseNavItems, { id: 'saasMaster' as TabType, label: 'SaaS Master Admin', icon: ShieldCheck }]
    : baseNavItems;

  return (
    <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-3 flex flex-col justify-between space-y-4 flex-shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
          Módulos de Gestão
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'bg-[#C5A059]/10 text-[#8C6D23] font-semibold border-r-2 border-[#C5A059]'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-50 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#8C6D23]' : 'text-[#9CA3AF]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tenant Branding Card - Corporate Clean */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
          <p className="font-semibold text-[#111827] truncate">
            {currentTenant ? currentTenant.name : 'Glowfy Hub Central'}
          </p>
        </div>
        <p className="text-[11px] text-[#6B7280]">
          Segmento: <span className="text-[#111827] font-medium capitalize">{currentTenant ? currentTenant.businessType.replace('_', ' ') : 'Plataforma SaaS'}</span>
        </p>
        <div className="pt-1.5 flex items-center justify-between text-[11px] border-t border-gray-200/80">
          <span className="text-[#6B7280]">Plano: <strong className="text-[#8C6D23] uppercase font-semibold">{currentTenant?.plan || 'ENTERPRISE'}</strong></span>
          <span className="text-emerald-700 font-medium flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Ativo</span>
          </span>
        </div>
      </div>
    </aside>
  );
};
