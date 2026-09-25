import React, { useState } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { useTenant } from '../../features/tenants/TenantContext';
import { Lock, KeyRound, CheckCircle2, AlertCircle, X, Eye, EyeOff, ShieldCheck, Store } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { isSuperAdmin, isMerchant, activeMerchantSession, user, changePassword } = useAuth();
  const { currentTenant } = useTenant();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.trim().length < 4) {
      setErrorMessage('A nova palavra-passe deve ter pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As palavras-passe não coincidem. Confirme a digitação.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePassword(newPassword.trim());
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => {
          onClose();
          setSuccessMessage('');
          setNewPassword('');
          setConfirmPassword('');
        }, 2200);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao alterar palavra-passe.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 text-[#8C6D23] flex items-center justify-center mx-auto border border-[#C5A059]/20">
          <KeyRound className="w-6 h-6" />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-[#111827]">
            Alterar Palavra-passe
          </h3>
          <p className="text-xs text-[#6B7280]">
            Defina uma nova palavra-passe personalizada para a sua conta.
          </p>
        </div>

        {/* User Scope Indicator */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center space-x-3 text-xs">
          {isSuperAdmin ? (
            <>
              <ShieldCheck className="w-5 h-5 text-[#8C6D23] shrink-0" />
              <div className="truncate">
                <p className="font-bold text-[#111827]">Super Admin Geral</p>
                <p className="text-[11px] text-gray-500 font-mono">Chave de Acesso Global Master</p>
              </div>
            </>
          ) : (
            <>
              <Store className="w-5 h-5 text-[#8C6D23] shrink-0" />
              <div className="truncate">
                <p className="font-bold text-[#111827]">{currentTenant?.name || activeMerchantSession?.tenantId}</p>
                <p className="text-[11px] text-gray-500 font-mono">{activeMerchantSession?.email || user?.email}</p>
              </div>
            </>
          )}
        </div>

        {successMessage ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-emerald-800">{successMessage}</p>
            <p className="text-[11px] text-emerald-600">A sua nova senha já está ativa no banco relacional Supabase / PostgreSQL.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Nova Palavra-passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres (ex: MinhaLoja#2026)"
                  className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Confirmar Nova Palavra-passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova palavra-passe"
                  className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="w-1/2 py-2.5 bg-[#C5A059] hover:bg-[#B38F46] disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center space-x-1.5"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Salvando...' : 'Salvar Senha'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
