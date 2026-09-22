import React, { useState } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { BusinessType } from '../../types';
import { Building2, Sparkles, Check, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { addTenantToContext, switchTenant, createNewTenant } = useTenant();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('barbershop');
  const [primaryColor, setPrimaryColor] = useState('#e11d48');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    setSubmitting(true);
    try {
      const newTenant = await createNewTenant(name, slug, businessType);
      addTenantToContext(newTenant);
      switchTenant(newTenant.id);
      onClose();
    } catch (e) {
      alert("Erro ao criar novo negócio/tenant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-[#8C6D23]" />
            <span>Criar Novo Negócio White-Label</span>
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">Nome do Negócio *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
              }}
              className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 font-semibold focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
              placeholder="Ex: Barbearia Elegance"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">Slug de URL (/b/slug) *</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 font-mono focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">Tipo de Vertical</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:outline-none focus:border-[#C5A059]"
              >
                <option value="barbershop">💈 Barbearia</option>
                <option value="beauty_salon">✂️ Salão de Beleza</option>
                <option value="aesthetics_clinic">💆 Clínica Estética</option>
                <option value="nail_studio">💅 Nail Studio</option>
                <option value="spa_wellness">🌿 SPA & Wellness</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">Cor de Destaque</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full h-9 rounded-lg bg-white border border-gray-300 cursor-pointer p-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">Telefone / WhatsApp</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:outline-none focus:border-[#C5A059]"
              placeholder="+351 912 345 678"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold px-5 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'A Inicializar...' : 'Criar & Inicializar Dados'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
