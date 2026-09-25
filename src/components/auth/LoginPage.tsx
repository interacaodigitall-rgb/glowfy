import React, { useState } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { useTenant } from '../../features/tenants/TenantContext';
import { SUPER_ADMIN_EMAIL } from '../../config/firebase';
import { BUSINESS_TYPES } from '../../utils/businessTypes';
import { 
  ShieldCheck, 
  Store, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Sparkles,
  Scissors,
  Hand,
  HeartPulse,
  LogOut,
  X
} from 'lucide-react';

interface LoginPageProps {
  onSuccessSuperAdmin?: () => void;
  onSuccessMerchant?: (tenantId: string) => void;
  onClose?: () => void;
  defaultTab?: 'super_admin' | 'merchant';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccessSuperAdmin,
  onSuccessMerchant,
  onClose,
  defaultTab = 'super_admin'
}) => {
  const { 
    loginAsSuperAdmin, 
    loginAsMerchant, 
    signInWithGoogle, 
    isSuperAdmin, 
    activeMerchantSession,
    signOut,
    user
  } = useAuth();
  
  const { allTenants, switchTenant, currentTenant } = useTenant();

  const [activeTab, setActiveTab] = useState<'super_admin' | 'merchant'>(defaultTab);

  // Super Admin state
  const [adminEmail, setAdminEmail] = useState(SUPER_ADMIN_EMAIL);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Merchant state
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    allTenants.length > 0 ? (currentTenant?.id || allTenants[0].id) : ''
  );
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantPassword, setMerchantPassword] = useState('');
  const [merchantError, setMerchantError] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Handle Super Admin submission
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const normalizedEmail = adminEmail.trim().toLowerCase();
    if (normalizedEmail !== SUPER_ADMIN_EMAIL.toLowerCase() && normalizedEmail !== 'admin@glowfyhub.com') {
      setAdminError(`O email de Super Admin deve ser ${SUPER_ADMIN_EMAIL} ou admin@glowfyhub.com.`);
      return;
    }

    const success = loginAsSuperAdmin(adminPassword);
    if (success) {
      if (onSuccessSuperAdmin) {
        onSuccessSuperAdmin();
      } else if (onClose) {
        onClose();
      }
    } else {
      setAdminError('Credenciais de Super Admin incorretas. Verifique a senha ou utilize o acesso com Google.');
    }
  };

  // Handle Google Login
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAdminError('');
    try {
      await signInWithGoogle();
      if (onSuccessSuperAdmin) {
        onSuccessSuperAdmin();
      } else if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setAdminError('Não foi possível autenticar com Google. Tente com a senha mestra.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle Merchant submission
  const handleMerchantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMerchantError('');

    if (!selectedTenantId) {
      setMerchantError('Por favor selecione ou informe o estabelecimento.');
      return;
    }

    const targetTenant = allTenants.find(t => t.id === selectedTenantId || t.slug === selectedTenantId);
    if (!targetTenant) {
      setMerchantError('Estabelecimento não encontrado.');
      return;
    }

    const emailToUse = merchantEmail.trim() || targetTenant.email || `gerente@${targetTenant.slug}.com`;
    const success = loginAsMerchant(emailToUse, merchantPassword, targetTenant.id);
    
    if (success) {
      switchTenant(targetTenant.id);
      if (onSuccessMerchant) {
        onSuccessMerchant(targetTenant.id);
      } else if (onClose) {
        onClose();
      }
    } else {
      setMerchantError('Palavra-passe de comerciante incorreta para este estabelecimento.');
    }
  };

  const getBusinessIcon = (type: string) => {
    switch (type) {
      case 'barbershop': return <Scissors className="w-4 h-4 text-amber-400" />;
      case 'nail_salon': return <Hand className="w-4 h-4 text-rose-400" />;
      case 'beauty_salon': return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'aesthetic_clinic': return <HeartPulse className="w-4 h-4 text-teal-400" />;
      default: return <Building2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className={onClose ? "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" : "min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 overflow-y-auto"}>
      <div className={`w-full max-w-lg bg-white border border-gray-200 rounded-xl p-6 sm:p-8 relative my-auto ${onClose ? 'shadow-2xl' : 'shadow-sm'}`}>
        {/* Top bar with Close button if dismissible */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#111827] text-[#C5A059] font-bold text-xl mb-3 shadow-sm border border-gray-800">
            G
          </div>
          <h1 className="text-2xl font-bold text-[#111827] tracking-tight">
            Glowfy<span className="text-[#C5A059] ml-0.5">Hub</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1.5 font-medium">
            Portal de Autenticação • Gestão Multi-Tenant & Painel Comercial
          </p>
        </div>

        {/* Current session info banner if user is already logged in */}
        {(isSuperAdmin || activeMerchantSession) && (
          <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="truncate">
                <p className="text-[#111827] font-semibold truncate">
                  {isSuperAdmin ? 'Sessão Ativa: Super Admin Geral' : `Sessão Ativa: ${activeMerchantSession?.email}`}
                </p>
                <p className="text-[11px] text-[#6B7280] font-mono">
                  {isSuperAdmin ? SUPER_ADMIN_EMAIL : `Loja: ${activeMerchantSession?.tenantId}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-gray-200 rounded-md font-medium text-[11px] transition-colors shrink-0 flex items-center space-x-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Sair</span>
            </button>
          </div>
        )}

        {/* Dual Tab Segmented Control */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-lg mb-5 border border-gray-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('super_admin')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'super_admin'
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeTab === 'super_admin' ? 'text-[#8C6D23]' : 'text-gray-400'}`} />
            <span>Super Admin Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('merchant')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'merchant'
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <Store className={`w-4 h-4 ${activeTab === 'merchant' ? 'text-[#8C6D23]' : 'text-gray-400'}`} />
            <span>Comerciante / Loja</span>
          </button>
        </div>

        {/* TAB 1: SUPER ADMIN LOGIN */}
        {activeTab === 'super_admin' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
              <div className="flex items-center space-x-1.5 text-[#111827] font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-[#8C6D23]" />
                <span>Gestão Global da Plataforma</span>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">
                Acesso irrestrito para criar comerciantes do zero, gerir bancos de dados no Firestore e supervisionar tenants.
              </p>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Email do Super Admin
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="interacaodigitall@gmail.com"
                    className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-3.5 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Chave Mestra / Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Insira a chave mestra confidencial"
                    className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-3.5 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                  />
                </div>
              </div>

              {adminError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center space-x-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Entrar como Super Admin</span>
              </button>
            </form>

            <div className="pt-3 border-t border-gray-200 flex flex-col items-center space-y-2">
              <span className="text-[11px] text-[#6B7280]">Ou autenticação rápida</span>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-[#111827] transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-sm"
              >
                <Mail className="w-4 h-4 text-[#8C6D23]" />
                <span>{isGoogleLoading ? 'Autenticando...' : `Aceder com Google (${SUPER_ADMIN_EMAIL})`}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MERCHANT STORE LOGIN */}
        {activeTab === 'merchant' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
              <div className="flex items-center space-x-1.5 text-[#111827] font-semibold text-xs">
                <Store className="w-4 h-4 text-[#8C6D23]" />
                <span>Acesso Exclusivo à Loja do Comerciante</span>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">
                Isolamento estrito: cada comerciante acede exclusivamente aos seus clientes, agenda e caixa.
              </p>
            </div>

            {/* If NO merchants registered yet */}
            {allTenants.length === 0 ? (
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center space-y-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#111827]">Nenhum Comerciante Cadastrado</h4>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
                    O sistema está limpo. O Super Admin Geral precisa de registar o primeiro estabelecimento no SaaS Master.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('super_admin')}
                  className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm inline-flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Aceder como Super Admin para Cadastrar</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleMerchantSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                    Selecione o seu Estabelecimento
                  </label>
                  <select
                    value={selectedTenantId}
                    onChange={(e) => {
                      setSelectedTenantId(e.target.value);
                      const t = allTenants.find(item => item.id === e.target.value);
                      if (t?.email) setMerchantEmail(t.email);
                    }}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                  >
                    {allTenants.map((t) => {
                      const meta = BUSINESS_TYPES[t.businessType] || BUSINESS_TYPES.barbershop;
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} ({meta.label.split('/')[0].trim()}) - {t.city || 'Portugal'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                    Email de Acesso do Comerciante
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={merchantEmail}
                      onChange={(e) => setMerchantEmail(e.target.value)}
                      placeholder="ex: contacto@meusalão.pt"
                      className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-3.5 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#111827]">
                      Senha da Loja
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(true)}
                      className="text-[11px] text-[#8C6D23] hover:underline font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={merchantPassword}
                      onChange={(e) => setMerchantPassword(e.target.value)}
                      placeholder="Insira a senha fornecida pelo Super Admin"
                      className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-3.5 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                    />
                  </div>
                </div>

                {merchantError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{merchantError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center space-x-2"
                >
                  <Store className="w-4 h-4" />
                  <span>Aceder ao Painel da Loja</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* FORGOT PASSWORD MODAL */}
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 relative">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-11 h-11 rounded-xl bg-[#C5A059]/10 text-[#8C6D23] flex items-center justify-center mx-auto border border-[#C5A059]/20">
                <KeyRound className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-[#111827]">
                  Recuperação de Palavra-passe
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Para garantir a segurança estrita e o isolamento dos dados comerciais da plataforma, a redefinição de palavra-passe do comerciante é realizada pelo <strong>Super Admin Geral da Glowfy Hub</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-xs">
                <p className="font-semibold text-[#111827]">Como restabelecer o seu acesso:</p>
                <ul className="list-disc list-inside space-y-1 text-[#6B7280] text-[11px]">
                  <li>O Super Admin pode gerar uma nova chave imediatamente através do painel <strong>SaaS Master &gt; Restabelecer Senha</strong>.</li>
                  <li>Ou entre em contacto direto com o administrador pelo email de suporte.</li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={`mailto:${SUPER_ADMIN_EMAIL}?subject=Glowfy%20Hub%20-%20Recuperação%20de%20Senha%20de%20Comerciante&body=Olá,%20solicito%20o%20restabelecimento%20da%20palavra-passe%20de%20acesso%20para%20o%20estabelecimento:%20${encodeURIComponent(selectedTenantId || 'Meu Estabelecimento')}.`}
                  className="w-full py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Solicitar ao Super Admin ({SUPER_ADMIN_EMAIL})</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 transition-colors"
                >
                  Voltar ao Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
