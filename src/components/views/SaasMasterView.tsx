import React, { useState } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { useAuth } from '../../features/auth/AuthContext';
import { 
  ShieldCheck, 
  Building2, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  Mail,
  Lock,
  Scissors,
  Sparkles,
  Hand,
  HeartPulse,
  Flower2,
  Eye,
  LogOut,
  UserCheck,
  Smartphone,
  Globe,
  Trash2,
  Edit3,
  RotateCcw,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { BusinessType, TenantProfile } from '../../types';
import { BUSINESS_TYPES } from '../../utils/businessTypes';
import { 
  createMerchantAccount, 
  MerchantCreationResult, 
  deleteTenant, 
  purgeTenantData, 
  deleteAllTenants, 
  updateTenantProfile,
  resetMerchantPassword,
  getSampleTenantsPreset,
  seedSampleTenants
} from '../../services/tenantService';
import { SUPER_ADMIN_EMAIL } from '../../config/firebase';

export const SaasMasterView: React.FC = () => {
  const { 
    allTenants, 
    switchTenant, 
    currentTenant, 
    addTenantToContext, 
    removeTenantFromContext, 
    resetAllTenants,
    refreshTenantData
  } = useTenant();
  
  const { isSuperAdmin, loginAsSuperAdmin, signOut, user, signInWithGoogle } = useAuth();

  // SaaS Master Login Form State
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Create Merchant Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessSlug, setBusinessSlug] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('barbershop');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('Pass@' + Math.floor(1000 + Math.random() * 9000));
  const [city, setCity] = useState('Lisboa');
  const [phone, setPhone] = useState('+351 912 345 678');
  const [plan, setPlan] = useState<'starter' | 'pro' | 'enterprise' | 'free_trial'>('pro');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<MerchantCreationResult | null>(null);

  // Edit Merchant State
  const [editingTenant, setEditingTenant] = useState<TenantProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editBusinessHistory, setEditBusinessHistory] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPlan, setEditPlan] = useState<'starter' | 'pro' | 'enterprise' | 'free_trial'>('pro');
  const [editBusinessType, setEditBusinessType] = useState<BusinessType>('barbershop');
  const [editActive, setEditActive] = useState(true);

  // Reset Merchant Password State
  const [tenantToResetPassword, setTenantToResetPassword] = useState<TenantProfile | null>(null);
  const [newMerchantPassword, setNewMerchantPassword] = useState('');
  const [resetSuccessData, setResetSuccessData] = useState<{ tenantName: string; email: string; password: string; slug: string } | null>(null);

  // Deletion modals state
  const [tenantToDelete, setTenantToDelete] = useState<TenantProfile | null>(null);
  const [tenantToPurge, setTenantToPurge] = useState<TenantProfile | null>(null);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Copy helpers
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const showToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBusinessName(val);
    if (!businessSlug || businessSlug === generateSlugFromName(businessName)) {
      setBusinessSlug(generateSlugFromName(val));
    }
  };

  const handleMasterLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = loginAsSuperAdmin(masterPasswordInput);
    if (!success) {
      setLoginError('Senha mestra incorreta. Tente "glowfy2026" ou aceda com Google.');
    } else {
      setLoginError('');
    }
  };

  // Submit Create Merchant
  const handleCreateMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !ownerEmail) return;

    setIsSubmitting(true);
    try {
      const result = await createMerchantAccount({
        name: businessName,
        slug: businessSlug || generateSlugFromName(businessName),
        businessType,
        ownerName: ownerName || 'Proprietário',
        ownerEmail,
        ownerPassword,
        plan,
        city,
        phone
      });

      addTenantToContext(result.tenant);
      setCreationSuccess(result);
      setShowCreateModal(false);
      showToast(`Comerciante "${result.tenant.name}" cadastrado com sucesso!`);
      
      // Reset form
      setBusinessName('');
      setBusinessSlug('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('Pass@' + Math.floor(1000 + Math.random() * 9000));
    } catch (err) {
      console.error("Error creating merchant account:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (tenant: TenantProfile) => {
    setEditingTenant(tenant);
    setEditName(tenant.name);
    setEditLogoUrl(tenant.logoUrl || '');
    setEditBusinessHistory(tenant.businessHistory || '');
    setEditCity(tenant.city || '');
    setEditPhone(tenant.phone || '');
    setEditEmail(tenant.email || '');
    setEditPlan(tenant.plan || 'pro');
    setEditBusinessType(tenant.businessType || 'barbershop');
    setEditActive(tenant.active !== false);
  };

  // Save Edit Tenant
  const handleSaveEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setIsActionLoading(true);
    try {
      const updatedData: Partial<TenantProfile> = {
        name: editName,
        logoUrl: editLogoUrl,
        businessHistory: editBusinessHistory,
        city: editCity,
        phone: editPhone,
        email: editEmail,
        plan: editPlan,
        businessType: editBusinessType,
        active: editActive
      };

      await updateTenantProfile(editingTenant.id, updatedData);
      
      // Update in context
      addTenantToContext({
        ...editingTenant,
        ...updatedData
      });

      setEditingTenant(null);
      showToast(`Dados de "${editName}" atualizados com sucesso!`);
    } catch (err) {
      console.error("Error updating tenant:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Confirm Delete Tenant
  const handleConfirmDeleteTenant = async () => {
    if (!tenantToDelete) return;
    setIsActionLoading(true);
    try {
      await deleteTenant(tenantToDelete.id);
      removeTenantFromContext(tenantToDelete.id);
      showToast(`Comerciante "${tenantToDelete.name}" foi excluído permanentemente.`);
      setTenantToDelete(null);
    } catch (err) {
      console.error("Error deleting tenant:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Confirm Purge Store Data
  const handleConfirmPurgeData = async () => {
    if (!tenantToPurge) return;
    setIsActionLoading(true);
    try {
      await purgeTenantData(tenantToPurge.id);
      showToast(`Dados de agendamentos e vendas de "${tenantToPurge.name}" foram limpos.`);
      setTenantToPurge(null);
    } catch (err) {
      console.error("Error purging tenant data:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Open Reset Password Modal
  const handleOpenResetPassword = (tenant: TenantProfile) => {
    setTenantToResetPassword(tenant);
    setNewMerchantPassword('Pass@' + Math.floor(1000 + Math.random() * 9000));
    setResetSuccessData(null);
  };

  // Handle Confirm Reset Password
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantToResetPassword || !newMerchantPassword.trim()) return;

    setIsActionLoading(true);
    try {
      await resetMerchantPassword(tenantToResetPassword.id, newMerchantPassword.trim());
      
      // Update tenant in context
      addTenantToContext({
        ...tenantToResetPassword,
        ownerPassword: newMerchantPassword.trim()
      });

      setResetSuccessData({
        tenantName: tenantToResetPassword.name,
        slug: tenantToResetPassword.slug,
        email: tenantToResetPassword.email || `contacto@${tenantToResetPassword.slug}.pt`,
        password: newMerchantPassword.trim()
      });

      showToast(`Palavra-passe de "${tenantToResetPassword.name}" redefinida com sucesso!`);
    } catch (err) {
      console.error("Error resetting merchant password:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Confirm Reset All (Zerar Sistema)
  const handleConfirmResetAll = async () => {
    setIsActionLoading(true);
    try {
      await deleteAllTenants();
      resetAllTenants();
      showToast("Todos os comerciantes foram excluídos. O sistema está agora em estado zero.");
      setShowResetAllModal(false);
    } catch (err) {
      console.error("Error resetting all tenants:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Optional: Load sample demo tenants
  const handleLoadSampleDemoTenants = async () => {
    setIsActionLoading(true);
    try {
      const samples = await seedSampleTenants();
      for (const s of samples) {
        addTenantToContext(s);
      }
      showToast("Comerciantes de demonstração carregados com sucesso!");
    } catch (err) {
      console.error("Error seeding sample tenants:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getBusinessIcon = (type: BusinessType) => {
    switch (type) {
      case 'barbershop': return <Scissors className="w-4 h-4 text-amber-400" />;
      case 'nail_salon': return <Hand className="w-4 h-4 text-rose-400" />;
      case 'beauty_salon': return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'aesthetic_clinic': return <HeartPulse className="w-4 h-4 text-teal-400" />;
      case 'spa': return <Flower2 className="w-4 h-4 text-emerald-400" />;
      case 'lash_brow': return <Eye className="w-4 h-4 text-pink-400" />;
      default: return <Building2 className="w-4 h-4 text-blue-400" />;
    }
  };

  const mrr = allTenants.reduce((acc, t) => {
    switch (t.plan) {
      case 'enterprise': return acc + 199;
      case 'pro': return acc + 79;
      case 'starter': return acc + 39;
      default: return acc + 49;
    }
  }, 0);

  // If NOT Super Admin, display authentic Master Admin Login
  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#8C6D23]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111827]">SaaS Master Super Admin</h2>
              <p className="text-xs text-[#6B7280]">Acesso Restrito à Gestão Global da Plataforma Glowfy Hub</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-semibold text-[#111827]">Administrador Registado no Sistema:</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#C5A059]/10 text-[#8C6D23] font-mono text-[11px] font-bold border border-[#C5A059]/30">
                {SUPER_ADMIN_EMAIL}
              </span>
            </div>
          </div>

          <form onSubmit={handleMasterLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                Chave de Acesso Master (ou Senha de Segurança)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={masterPasswordInput}
                  onChange={(e) => setMasterPasswordInput(e.target.value)}
                  placeholder="Insira a chave mestra (ex: glowfy2026)"
                  className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059] transition-colors"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-600 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center space-x-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Aceder ao Painel SaaS Master</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center space-y-3">
            <p className="text-[11px] text-[#6B7280]">Ou autentique-se diretamente com a sua Conta Google</p>
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full py-2.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-[#111827] transition-colors flex items-center justify-center space-x-2 shadow-sm"
            >
              <Mail className="w-4 h-4 text-[#8C6D23]" />
              <span>Entrar com Google ({SUPER_ADMIN_EMAIL})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUPER ADMIN DASHBOARD
  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#111827] text-white px-5 py-3 rounded-lg shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-3 duration-200 border border-gray-700">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="text-xs font-semibold">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Header with Admin Status & Master Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#8C6D23]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-[#111827]">SaaS Master Super Admin</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#C5A059]/10 text-[#8C6D23] font-bold text-[10px] border border-[#C5A059]/30 uppercase tracking-wider">
                Controlo Global Autorizado
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Gestão de todos os comerciantes, cadastro do zero, edição e exclusão de dados com isolamento por loja.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Comerciante</span>
          </button>

          {allTenants.length > 0 && (
            <button
              onClick={() => setShowResetAllModal(true)}
              className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 rounded-lg border border-red-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
              title="Excluir todos os comerciantes para começar do zero"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Zerar Sistema (0 Lojas)</span>
            </button>
          )}

          <button
            onClick={signOut}
            title="Terminar Sessão Super Admin"
            className="p-2 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 rounded-lg border border-gray-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global SaaS Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-1 shadow-sm">
          <p className="text-xs text-[#6B7280] font-medium">Receita Recorrente Mensal (MRR)</p>
          <p className="text-2xl font-bold text-[#8C6D23] font-mono">€{mrr.toFixed(2)}</p>
          <p className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
            <TrendingUp className="w-3 h-3 inline mr-1" /> Base de comissões ativa
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-1 shadow-sm">
          <p className="text-xs text-[#6B7280] font-medium">Comércios Registados</p>
          <p className="text-2xl font-bold text-[#111827]">{allTenants.length}</p>
          <p className="text-[10px] text-[#6B7280]">
            {allTenants.length === 0 ? 'Estado limpo (Zero lojas)' : '100% isolamento Firestore'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-1 shadow-sm">
          <p className="text-xs text-[#6B7280] font-medium">Segmentos Atendidos</p>
          <div className="flex items-center space-x-2 pt-1 text-gray-600">
            <span title="Barbearia" className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg">{getBusinessIcon('barbershop')}</span>
            <span title="Nails" className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg">{getBusinessIcon('nail_salon')}</span>
            <span title="Salão de Beleza" className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg">{getBusinessIcon('beauty_salon')}</span>
            <span title="Estética & Spa" className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg">{getBusinessIcon('aesthetic_clinic')}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-1 shadow-sm">
          <p className="text-xs text-[#6B7280] font-medium">Admin & Banco Firebase</p>
          <div className="flex items-center space-x-2 pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700">Autorizado: {SUPER_ADMIN_EMAIL.split('@')[0]}</span>
          </div>
          <p className="text-[10px] text-[#6B7280] font-mono truncate">{SUPER_ADMIN_EMAIL}</p>
        </div>
      </div>

      {/* Notification if new merchant was just created */}
      {creationSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm relative animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Novo Comerciante Provisionado e Salvo no Firestore!
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  O estabelecimento <strong>{creationSuccess.tenant.name}</strong> ({creationSuccess.tenant.businessType}) foi criado com o catálogo específico e credenciais de acesso para o proprietário.
                </p>

                {/* Credential summary box */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border border-emerald-200 p-4 rounded-lg">
                  <div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Email de Login do Comerciante:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-mono font-bold text-[#111827] select-all">{creationSuccess.credentials.email}</span>
                      <button 
                        onClick={() => handleCopy(creationSuccess.credentials.email, 'cred-email')}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-[#111827]"
                      >
                        {copiedKey === 'cred-email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Senha Inicial de Acesso:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-mono font-bold text-[#8C6D23] select-all">{creationSuccess.credentials.password}</span>
                      <button 
                        onClick={() => handleCopy(creationSuccess.credentials.password, 'cred-pass')}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-[#111827]"
                      >
                        {copiedKey === 'cred-pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        switchTenant(creationSuccess.tenant.id);
                        setCreationSuccess(null);
                      }}
                      className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Aceder ao Painel Deste Comerciante Imediatamente</span>
                    </button>
                    <button
                      onClick={() => setCreationSuccess(null)}
                      className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold text-xs rounded-lg transition-colors"
                    >
                      Fechar Aviso
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenants Management Table / Zero State */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#111827]">Comércios Registados no Glowfy Hub</h3>
            <p className="text-xs text-[#6B7280]">
              O Super Admin tem permissão total para criar, editar dados, aceder à loja e excluir comércios.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-gray-100 text-[#111827] text-xs font-mono font-bold border border-gray-200">
            Total: {allTenants.length}
          </span>
        </div>

        {/* Empty Zero State */}
        {allTenants.length === 0 ? (
          <div className="p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#8C6D23] flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#111827]">
                Nenhum Comerciante Registado (Zero Lojas)
              </h4>
              <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                O sistema está limpo, ativo e pronto para que o Super Admin cadastre os comerciantes do zero. Você escolhe o nome, segmento (barbearia, nails, salão, estética) e o sistema gera a ambiência isolada.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Comerciante</span>
              </button>
              <button
                onClick={handleLoadSampleDemoTenants}
                disabled={isActionLoading}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 text-[#8C6D23]" />
                <span>Carregar Amostras (Opcional)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {allTenants.map((tenant) => {
              const meta = BUSINESS_TYPES[tenant.businessType] || BUSINESS_TYPES.barbershop;
              const isCurrentlyActive = tenant.id === currentTenant?.id;

              return (
                <div 
                  key={tenant.id} 
                  className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    isCurrentlyActive ? 'bg-amber-50/40 border-l-4 border-l-[#C5A059]' : 'hover:bg-gray-50/60'
                  }`}
                >
                  {/* Info */}
                  <div className="flex items-start space-x-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0"
                      style={{ backgroundColor: tenant.primaryColor || '#C5A059' }}
                    >
                      {tenant.name[0]}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="font-bold text-[#111827] text-sm">{tenant.name}</h4>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-[10px] font-semibold flex items-center space-x-1">
                          {getBusinessIcon(tenant.businessType)}
                          <span>{meta.label}</span>
                        </span>
                        {isCurrentlyActive && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold">
                            Loja Selecionada no Painel
                          </span>
                        )}
                        {!tenant.active && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-md text-[10px] font-semibold">
                            Inativo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 mt-1.5 text-xs text-[#6B7280] font-mono">
                        <span>ID / Slug: {tenant.slug || tenant.id}</span>
                        <span>•</span>
                        <span>Cidade: {tenant.city || 'Portugal'}</span>
                        <span>•</span>
                        <span>Email: {tenant.email || 'Não informado'}</span>
                        {tenant.phone && (
                          <>
                            <span>•</span>
                            <span>Tel: {tenant.phone}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 mt-2">
                        <a 
                          href={`/b/${tenant.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            switchTenant(tenant.id);
                          }}
                          className="text-[11px] text-[#8C6D23] hover:underline flex items-center space-x-1 font-semibold"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Link Público: /b/{tenant.slug}</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Super Admin */}
                  <div className="flex items-center space-x-2.5 self-end lg:self-center flex-wrap">
                    <div className="text-right hidden sm:block mr-2">
                      <span className="px-2 py-0.5 bg-[#C5A059]/10 text-[#8C6D23] font-bold text-[10px] rounded uppercase border border-[#C5A059]/20">
                        Plano {tenant.plan?.toUpperCase() || 'PRO'}
                      </span>
                    </div>

                    <button
                      onClick={() => switchTenant(tenant.id)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center space-x-1.5 ${
                        isCurrentlyActive
                          ? 'bg-[#C5A059] text-white shadow-sm'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                      }`}
                      title="Entrar na loja para gerir os serviços e agendamentos"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isCurrentlyActive ? 'Gerindo Loja' : 'Aceder Loja'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(tenant)}
                      className="p-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-300 transition-colors"
                      title="Editar dados cadastrais do comerciante"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenResetPassword(tenant)}
                      className="p-1.5 bg-white hover:bg-[#C5A059]/15 text-[#8C6D23] rounded-lg border border-gray-300 hover:border-[#C5A059] transition-colors"
                      title="Restabelecer / Redefinir senha de acesso deste comerciante"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setTenantToPurge(tenant)}
                      className="p-1.5 bg-white hover:bg-amber-50 text-amber-700 rounded-lg border border-gray-300 hover:border-amber-300 transition-colors"
                      title="Limpar agendamentos e vendas de teste desta loja"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setTenantToDelete(tenant)}
                      className="p-1.5 bg-white hover:bg-red-50 text-red-600 rounded-lg border border-gray-300 hover:border-red-300 transition-colors"
                      title="Excluir comerciante e todos os seus dados permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE NEW MERCHANT */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-[#8C6D23]" />
                  <span>Cadastrar Novo Comerciante do Zero</span>
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Provisiona as credenciais de login, salva no banco Firestore e gera a estrutura visual e de catálogo adaptada ao segmento.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMerchantSubmit} className="space-y-4">
              {/* Business Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                  1. Tipo de Negócio (Define Ambiência, Fotos e Catálogo Inicial)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(BUSINESS_TYPES) as BusinessType[]).slice(0, 6).map((typeKey) => {
                    const item = BUSINESS_TYPES[typeKey];
                    const isSelected = businessType === typeKey;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setBusinessType(typeKey)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-[#C5A059]/10 border-[#C5A059] text-[#111827] shadow-sm'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          {getBusinessIcon(typeKey)}
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#8C6D23]" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#111827]">{item.label.split('/')[0]}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-1">{item.professionalTerm}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Business Name and Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Nome do Estabelecimento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Studio Bella Nails ou Barbearia Imperial"
                    value={businessName}
                    onChange={handleNameChange}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Subdomínio / Slug *
                  </label>
                  <div className="flex items-center">
                    <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-2.5 py-2.5 text-xs text-gray-500 font-mono">
                      /b/
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="bella-nails"
                      value={businessSlug}
                      onChange={(e) => setBusinessSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      className="w-full bg-white border border-gray-300 rounded-r-lg px-3 py-2.5 text-xs text-[#111827] font-mono focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>
                </div>
              </div>

              {/* Owner and Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Nome do Proprietário
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ana Silva"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Email de Acesso do Comerciante *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ana@bellanails.pt"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Senha Gerada de Login
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#8C6D23] font-mono font-bold focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>
                </div>
              </div>

              {/* City & Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Lisboa"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Telefone de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="+351 912 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Plano Glowfy
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="starter">Starter (€39/mês)</option>
                    <option value="pro">Pro (€79/mês)</option>
                    <option value="enterprise">Enterprise (€199/mês)</option>
                  </select>
                </div>
              </div>

              {/* Submission */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <span>A provisionar e salvar dados...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar e Ativar Comerciante</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT MERCHANT */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-[#8C6D23]" />
                  <span>Editar Dados do Comerciante</span>
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Atualize informações, segmento de atuação ou plano da loja.
                </p>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                  Nome do Estabelecimento
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Tipo de Negócio
                  </label>
                  <select
                    value={editBusinessType}
                    onChange={(e) => setEditBusinessType(e.target.value as BusinessType)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  >
                    {(Object.keys(BUSINESS_TYPES) as BusinessType[]).map((typeKey) => (
                      <option key={typeKey} value={typeKey}>
                        {BUSINESS_TYPES[typeKey].label.split('/')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Plano Glowfy
                  </label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="starter">Starter (€39/mês)</option>
                    <option value="pro">Pro (€79/mês)</option>
                    <option value="enterprise">Enterprise (€199/mês)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                    Status do Estabelecimento
                  </label>
                  <select
                    value={editActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditActive(e.target.value === 'active')}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="active">Ativo no Sistema</option>
                    <option value="inactive">Suspenso / Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                  Logo URL (PNG / Imagem)
                </label>
                <input
                  type="text"
                  value={editLogoUrl}
                  onChange={(e) => setEditLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
                  História & Tradição do Estabelecimento
                </label>
                <textarea
                  rows={3}
                  value={editBusinessHistory}
                  onChange={(e) => setEditBusinessHistory(e.target.value)}
                  placeholder="Conte a história e tradição do comércio para exibir no site público..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isActionLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM DELETE TENANT */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-[#111827]">
                Excluir Comerciante Permanentemente?
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Você está prestes a excluir o estabelecimento <strong className="text-[#111827]">{tenantToDelete.name}</strong> (ID: {tenantToDelete.id}).
                Esta ação removerá o cadastro do comerciante, serviços associados e registros.
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>Ação irreversível de Super Admin.</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setTenantToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteTenant}
                disabled={isActionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isActionLoading ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM PURGE DATA */}
      {tenantToPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-[#111827]">
                Limpar Agendamentos e Vendas?
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Deseja limpar os agendamentos, clientes e histórico de vendas de <strong className="text-[#111827]">{tenantToPurge.name}</strong>?
                O perfil da loja e os serviços cadastrados continuarão intactos.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setTenantToPurge(null)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmPurgeData}
                disabled={isActionLoading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isActionLoading ? 'Limpando...' : 'Limpar Dados'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM RESET ALL (ZERAR SISTEMA) */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-[#111827]">
                Zerar Todos os Comerciantes?
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Esta ação removerá todos os {allTenants.length} comerciantes registados na base de dados, permitindo que você inicie o SaaS do absoluto zero e realize novos cadastros limpos.
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>O sistema ficará sem comerciantes registrados.</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetAllModal(false)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmResetAll}
                disabled={isActionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isActionLoading ? 'Zerando...' : 'Zerar Sistema Agora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: RESTABELECER PALAVRA-PASSE DO COMERCIANTE */}
      {tenantToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            {resetSuccessData ? (
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="text-center space-y-1.5">
                  <h3 className="text-base font-bold text-[#111827]">
                    Palavra-passe Redefinida com Sucesso!
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    A nova credencial de acesso para <strong>{resetSuccessData.tenantName}</strong> foi gravada no sistema.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B7280]">Email de Login:</span>
                    <span className="font-semibold text-[#111827]">{resetSuccessData.email}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B7280]">Nova Senha:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#8C6D23] bg-[#C5A059]/15 px-2 py-0.5 rounded border border-[#C5A059]/30">
                        {resetSuccessData.password}
                      </span>
                      <button
                        onClick={() => handleCopy(resetSuccessData.password, 'pwd')}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                        title="Copiar Senha"
                      >
                        {copiedKey === 'pwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
                    <span className="text-[#6B7280]">Link de Acesso:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-[11px] text-[#111827]">/login</span>
                      <button
                        onClick={() => handleCopy(`${window.location.origin}/login`, 'link')}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                        title="Copiar Link"
                      >
                        {copiedKey === 'link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTenantToResetPassword(null);
                      setResetSuccessData(null);
                    }}
                    className="px-5 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    Concluído
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="space-y-5">
                <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 text-[#8C6D23] flex items-center justify-center border border-[#C5A059]/20">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">
                      Restabelecer Palavra-passe do Comerciante
                    </h3>
                    <p className="text-xs text-[#6B7280]">
                      Estabelecimento: <strong>{tenantToResetPassword.name}</strong>
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Email de Acesso Registado
                    </label>
                    <input
                      type="text"
                      disabled
                      value={tenantToResetPassword.email || `contacto@${tenantToResetPassword.slug}.pt`}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#111827]">
                        Nova Palavra-passe
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewMerchantPassword('Pass@' + Math.floor(1000 + Math.random() * 9000))}
                        className="text-[11px] text-[#8C6D23] hover:underline font-semibold"
                      >
                        Gerar Senha Aleatória
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={newMerchantPassword}
                        onChange={(e) => setNewMerchantPassword(e.target.value)}
                        placeholder="Insira a nova senha"
                        className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-3.5 py-2 text-xs text-[#111827] font-mono focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                      />
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-1">
                      Esta será a senha que o comerciante utilizará para aceder ao painel de gestão da loja.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTenantToResetPassword(null);
                      setResetSuccessData(null);
                    }}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isActionLoading || !newMerchantPassword.trim()}
                    className="px-5 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isActionLoading ? 'Gravando...' : 'Gravar e Restabelecer'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
