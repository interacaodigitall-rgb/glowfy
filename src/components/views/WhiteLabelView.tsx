import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { updateTenantProfile } from '../../features/tenants/tenantService';
import { updateDynamicPWAManifest } from '../../features/tenants/pwaService';
import { compressImage } from '../../utils/imageUtils';
import { TenantProfile, BusinessType } from '../../types';
import { 
  Sliders, 
  Save, 
  Palette, 
  Globe, 
  ExternalLink, 
  Check, 
  Smartphone, 
  Monitor, 
  Clock, 
  Calendar, 
  X, 
  Lock, 
  Unlock,
  Trash2,
  Plus,
  Upload,
  Loader2
} from 'lucide-react';

interface ImageUploadFieldProps {
  label: string;
  badge: string;
  helperText: string;
  value: string;
  onChange: (val: string) => void;
  maxWidth?: number;
  maxHeight?: number;
  placeholder?: string;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  badge,
  helperText,
  value,
  onChange,
  maxWidth = 1200,
  maxHeight = 800,
  placeholder = "https://..."
}) => {
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCompressing(true);
      const compressed = await compressImage(file, maxWidth, maxHeight, 0.82);
      onChange(compressed);
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      alert("Não foi possível processar a imagem selecionada. Tente com outro ficheiro PNG/JPG/WebP.");
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2 bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
      <div className="flex items-center justify-between">
        <label className="block text-slate-300 font-semibold text-xs">{label}</label>
        <span className="text-[10px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
          {badge}
        </span>
      </div>

      {value ? (
        <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900/90 flex items-center justify-between p-2">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-12 h-12 rounded-lg bg-black/50 border border-slate-700/60 flex items-center justify-center overflow-hidden shrink-0">
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-emerald-400 truncate flex items-center gap-1">
                <Check className="w-3 h-3 shrink-0" /> Imagem ativa
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                {value.startsWith('data:') ? 'Ficheiro otimizado carregado' : value}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              Alterar
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Remover imagem"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          disabled={compressing}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs py-2 px-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
        >
          {compressing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin" />
              <span>A otimizar imagem...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 text-rose-500" />
              <span>Carregar Imagem do Computador / Telemóvel</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-1">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
          placeholder={placeholder}
        />
        <p className="text-[10px] text-slate-500">{helperText}</p>
      </div>
    </div>
  );
};

const defaultWorkingHours: Record<number, { active: boolean; start: string; end: string; breakStart?: string; breakEnd?: string }> = {
  1: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
  2: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
  3: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
  4: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
  5: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
  6: { active: true, start: '09:00', end: '20:30', breakStart: '', breakEnd: '' },
  0: { active: false, start: '09:00', end: '13:00', breakStart: '', breakEnd: '' }
};

export const WhiteLabelView: React.FC<{ onOpenPublicPortal: (mode?: 'mobile' | 'pc') => void }> = ({ onOpenPublicPortal }) => {
  const { currentTenant, setCurrentTenant, addTenantToContext, businessMeta } = useTenant();
  const [activeSettingsTab, setActiveSettingsTab] = useState<'branding' | 'schedule'>('branding');
  const [formData, setFormData] = useState<Partial<TenantProfile>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Block schedule form states
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('18:00');
  const [blockNotes, setBlockNotes] = useState('');
  const [blockIsFullDay, setBlockIsFullDay] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      setFormData({
        ...currentTenant,
        workingHours: currentTenant.workingHours || defaultWorkingHours,
        blockedDates: currentTenant.blockedDates || [],
        blockedTimes: currentTenant.blockedTimes || []
      });
    }
  }, [currentTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    try {
      setIsSaving(true);
      await updateTenantProfile(currentTenant.id, formData);
      const updatedTenant = { ...currentTenant, ...formData } as TenantProfile;
      setCurrentTenant(updatedTenant);
      addTenantToContext(updatedTenant);
      updateDynamicPWAManifest(updatedTenant);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (e) {
      console.error("Erro ao atualizar configurações:", e);
      alert("Erro ao atualizar configurações do comércio.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDayHourChange = (day: number, field: string, value: any) => {
    const currentHours = { ...(formData.workingHours || defaultWorkingHours) };
    const dayData = { ...currentHours[day] };

    if (field === 'active') dayData.active = value;
    else if (field === 'start') dayData.start = value;
    else if (field === 'end') dayData.end = value;
    else if (field === 'breakStart') dayData.breakStart = value;
    else if (field === 'breakEnd') dayData.breakEnd = value;

    currentHours[day] = dayData;
    setFormData({ ...formData, workingHours: currentHours });
  };

  const handleAddBlockedDate = () => {
    if (!blockDate) return;

    if (blockIsFullDay) {
      const currentBlocked = [...(formData.blockedDates || [])];
      if (!currentBlocked.includes(blockDate)) {
        currentBlocked.push(blockDate);
        setFormData({ ...formData, blockedDates: currentBlocked });
      }
    } else {
      const currentBlockedTimes = [...(formData.blockedTimes || [])];
      currentBlockedTimes.push({
        date: blockDate,
        start: blockStart,
        end: blockEnd,
        notes: blockNotes || 'Bloqueio Manual'
      });
      setFormData({ ...formData, blockedTimes: currentBlockedTimes });
    }

    // Reset inputs
    setBlockDate('');
    setBlockNotes('');
  };

  const handleRemoveBlockedDate = (date: string) => {
    const currentBlocked = (formData.blockedDates || []).filter(d => d !== date);
    setFormData({ ...formData, blockedDates: currentBlocked });
  };

  const handleRemoveBlockedTime = (idx: number) => {
    const currentBlockedTimes = (formData.blockedTimes || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, blockedTimes: currentBlockedTimes });
  };

  const weekDayNames: Record<number, string> = {
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado',
    0: 'Domingo'
  };

  return (
    <div className="space-y-6">
      {/* View Header with Preview Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-rose-500" />
            <span>Painel de Administração do Comércio</span>
          </h2>
          <p className="text-xs text-slate-400">
            Configure a sua identidade de marca, horários de funcionamento e regras da agenda.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onOpenPublicPortal('mobile')}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5"
          >
            <Smartphone className="w-4 h-4 text-[#e5a93b]" />
            <span>Ver App Mobile</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenPublicPortal('pc')}
            className="bg-[#e5a93b] hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-md shadow-[#e5a93b]/20"
          >
            <Monitor className="w-4 h-4 text-slate-950" />
            <span>Ver Visão PC</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Selection */}
      <div className="flex border-b border-slate-800 pb-px gap-6">
        <button
          onClick={() => setActiveSettingsTab('branding')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center space-x-2 ${
            activeSettingsTab === 'branding'
              ? 'border-rose-500 text-rose-500 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Branding & White-Label</span>
        </button>

        <button
          onClick={() => setActiveSettingsTab('schedule')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center space-x-2 ${
            activeSettingsTab === 'schedule'
              ? 'border-rose-500 text-rose-500 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Horário de Funcionamento & Bloqueios</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TAB CONTENT: BRANDING */}
        {activeSettingsTab === 'branding' && (
          <form onSubmit={handleSubmit} className="lg:col-span-8 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nome do Negócio *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Slug de Acesso URL (/b/slug) *</label>
                <div className="flex items-center">
                  <span className="bg-slate-950 border border-r-0 border-slate-800 text-slate-500 rounded-l-xl px-2.5 py-2.5 font-mono text-[10px]">
                    /b/
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-r-xl p-2.5 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Tipo de Negócio (Vertical)</label>
                <select
                  value={formData.businessType || 'barbershop'}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value as BusinessType })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-medium"
                >
                  <option value="barbershop">💈 Barbearia</option>
                  <option value="beauty_salon">✂️ Salão de Beleza</option>
                  <option value="aesthetic_clinic">💆 Clínica de Estética</option>
                  <option value="nail_salon">💅 Nail Studio / Designer de Unhas</option>
                  <option value="spa">🌿 SPA & Wellness</option>
                  <option value="other">✨ Outros Serviços de Estética</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Cor Primária do Brand (Hex)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.primaryColor || '#e11d48'}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer text-xs"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor || '#e11d48'}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="Logotipo da Marca (PNG/SVG)"
                badge="512 × 512 px (1:1 Transparente)"
                helperText="PNG com fundo transparente ou SVG para cabeçalho do portal, aplicativo e fatura."
                value={formData.logoUrl || ''}
                onChange={(val) => setFormData({ ...formData, logoUrl: val })}
                maxWidth={512}
                maxHeight={512}
                placeholder="https://exemplo.com/logo.png"
              />

              <ImageUploadField
                label="Favicon do Navegador"
                badge="64 × 64 px (.ico / .png)"
                helperText="Ícone quadrado exibido na aba do navegador e no ícone do PWA salvo no telemóvel."
                value={formData.faviconUrl || ''}
                onChange={(val) => setFormData({ ...formData, faviconUrl: val })}
                maxWidth={128}
                maxHeight={128}
                placeholder="https://exemplo.com/favicon.ico"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="Imagem Hero (Capa Principal)"
                badge="1920 × 1080 px (16:9 HD)"
                helperText="Banner principal de alta resolução que ilustra o topo do portal de clientes."
                value={formData.heroImageUrl || ''}
                onChange={(val) => setFormData({ ...formData, heroImageUrl: val })}
                maxWidth={1280}
                maxHeight={720}
                placeholder="https://images.unsplash.com/..."
              />

              <ImageUploadField
                label="Imagem História / Tradição"
                badge="1200 × 800 px (3:2) ou 800 × 1000 px"
                helperText="Fotografia do espaço ou equipa na secção 'Tradição & Excelência'."
                value={formData.storyImageUrl || ''}
                onChange={(val) => setFormData({ ...formData, storyImageUrl: val })}
                maxWidth={1200}
                maxHeight={800}
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email de Contacto</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Endereço Físico</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5"
                placeholder="Rua Exemplo 123, Lisboa"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">História do Comércio (Seção Tradição & Excelência)</label>
              <textarea
                rows={3}
                value={formData.businessHistory || ''}
                onChange={(e) => setFormData({ ...formData, businessHistory: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 leading-relaxed text-xs"
                placeholder="Escreva aqui a história do seu espaço, tradição, filosofia de atendimento e diferenciais para refletir no site público..."
              />
              <p className="text-[10px] text-slate-500 mt-1">Este texto é exibido no container 'Tradição & Excelência' do portal web do seu cliente.</p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-xs">Exibir Selos de Download da App Store e Google Play</p>
                  <p className="text-[10px] text-slate-400">Ative para exibir botões das lojas no site quando seu app estiver publicado nelas.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showNativeStoreBadges || false}
                  onChange={(e) => setFormData({ ...formData, showNativeStoreBadges: e.target.checked })}
                  className="rounded border-slate-800 text-rose-500 bg-slate-900 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </div>

              {formData.showNativeStoreBadges && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium text-[10px]">Link App Store (iOS)</label>
                    <input
                      type="text"
                      value={formData.appStoreUrl || ''}
                      onChange={(e) => setFormData({ ...formData, appStoreUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs font-mono"
                      placeholder="https://apps.apple.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium text-[10px]">Link Google Play (Android)</label>
                    <input
                      type="text"
                      value={formData.googlePlayUrl || ''}
                      onChange={(e) => setFormData({ ...formData, googlePlayUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs font-mono"
                      placeholder="https://play.google.com/..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A guardar na Nuvem e a Sincronizar...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Alterações do Tenant</span>
                  </>
                )}
              </button>
              {savedSuccess && (
                <p className="text-emerald-400 text-center font-bold mt-2 flex items-center justify-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Marca, imagens e perfil guardados e sincronizados com sucesso!</span>
                </p>
              )}
            </div>
          </form>
        )}

        {/* TAB CONTENT: SCHEDULES & BLOCKER */}
        {activeSettingsTab === 'schedule' && (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 text-xs">
            {/* Business Working Hours Weekly */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#e5a93b]" />
                  <span>Horários de Expediente do Espaço</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Configure as horas de funcionamento diárias e intervalos de almoço aplicados globalmente à sua agenda de reservas.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl divide-y divide-slate-850 space-y-3.5">
                {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                  const dayData = (formData.workingHours || defaultWorkingHours)[dayNum] || { active: false, start: '09:00', end: '19:00' };
                  return (
                    <div key={dayNum} className="pt-3.5 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      {/* Day Checkbox */}
                      <div className="flex items-center space-x-3 w-40">
                        <input
                          type="checkbox"
                          checked={dayData.active}
                          onChange={(e) => handleDayHourChange(dayNum, 'active', e.target.checked)}
                          className="rounded border-slate-800 text-rose-500 bg-slate-900 focus:ring-0 w-4 h-4"
                        />
                        <span className={`font-bold ${dayData.active ? 'text-white' : 'text-slate-500'}`}>
                          {weekDayNames[dayNum]}
                        </span>
                      </div>

                      {/* Time Range Selectors */}
                      {dayData.active ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] text-slate-500 uppercase">Abre</span>
                            <input
                              type="text"
                              value={dayData.start}
                              onChange={(e) => handleDayHourChange(dayNum, 'start', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-md p-1.5 text-center font-mono text-[11px] w-14 text-white"
                              placeholder="09:00"
                            />
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] text-slate-500 uppercase">Fecha</span>
                            <input
                              type="text"
                              value={dayData.end}
                              onChange={(e) => handleDayHourChange(dayNum, 'end', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-md p-1.5 text-center font-mono text-[11px] w-14 text-white"
                              placeholder="19:00"
                            />
                          </div>

                          <div className="flex items-center space-x-1.5 border-l border-slate-800 pl-3 ml-1">
                            <span className="text-[10px] text-slate-500 uppercase">Almoço</span>
                            <input
                              type="text"
                              value={dayData.breakStart || ''}
                              onChange={(e) => handleDayHourChange(dayNum, 'breakStart', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-md p-1.5 text-center font-mono text-[11px] w-14 text-slate-300"
                              placeholder="12:30"
                            />
                            <span className="text-slate-600">-</span>
                            <input
                              type="text"
                              value={dayData.breakEnd || ''}
                              onChange={(e) => handleDayHourChange(dayNum, 'breakEnd', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-md p-1.5 text-center font-mono text-[11px] w-14 text-slate-300"
                              placeholder="13:30"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">Encerrado / Folga Geral</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manual Agenda Blocking (Vacations, Holidays) */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Bloqueador de Datas e Períodos (Férias / Feriados)</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Bloqueie dias inteiros ou intervalos específicos para impedir agendamentos de clientes de forma temporária.
                </p>
              </div>

              {/* Block creation form */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Data do Bloqueio</label>
                    <input
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded-lg font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Tipo do Bloqueio</label>
                    <select
                      value={blockIsFullDay ? 'full' : 'hours'}
                      onChange={(e) => setBlockIsFullDay(e.target.value === 'full')}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded-lg"
                    >
                      <option value="full">📅 Dia Inteiro</option>
                      <option value="hours">⏰ Intervalo de Horas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Observações / Motivo</label>
                    <input
                      type="text"
                      placeholder="Ex: Férias, Feriado..."
                      value={blockNotes}
                      onChange={(e) => setBlockNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded-lg"
                    />
                  </div>
                </div>

                {!blockIsFullDay && (
                  <div className="grid grid-cols-2 gap-3 max-w-xs pt-1.5 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Início do Bloqueio</label>
                      <input
                        type="text"
                        value={blockStart}
                        onChange={(e) => setBlockStart(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded-lg font-mono text-center"
                        placeholder="14:00"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Fim do Bloqueio</label>
                      <input
                        type="text"
                        value={blockEnd}
                        onChange={(e) => setBlockEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded-lg font-mono text-center"
                        placeholder="17:00"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddBlockedDate}
                  disabled={!blockDate}
                  className={`w-full py-2.5 rounded-lg text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 ${
                    blockDate ? 'bg-rose-500 hover:bg-rose-400 text-slate-950' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Bloqueio de Horário</span>
                </button>
              </div>

              {/* Display active blocks lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full days locked */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2.5">
                  <p className="font-bold text-white text-[11px] uppercase tracking-wider text-rose-400">Dias Inteiros Bloqueados</p>
                  <div className="divide-y divide-slate-850 max-h-40 overflow-y-auto">
                    {(!formData.blockedDates || formData.blockedDates.length === 0) ? (
                      <p className="text-slate-600 italic py-4 text-[10px]">Nenhum dia bloqueado atualmente.</p>
                    ) : (
                      formData.blockedDates.map((date) => (
                        <div key={date} className="py-2 flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-300">{date}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlockedDate(date)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Specific hour locks */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2.5">
                  <p className="font-bold text-white text-[11px] uppercase tracking-wider text-rose-400">Intervalos de Horas Bloqueados</p>
                  <div className="divide-y divide-slate-850 max-h-40 overflow-y-auto">
                    {(!formData.blockedTimes || formData.blockedTimes.length === 0) ? (
                      <p className="text-slate-600 italic py-4 text-[10px]">Nenhum intervalo bloqueado atualmente.</p>
                    ) : (
                      formData.blockedTimes.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-[11px]">
                          <div>
                            <p className="font-mono text-slate-300">{item.date} • {item.start} - {item.end}</p>
                            <p className="text-[10px] text-slate-500 italic mt-0.5">{item.notes}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlockedTime(idx)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSubmit}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Agenda & Horários</span>
              </button>
              {savedSuccess && (
                <p className="text-emerald-400 text-center font-bold mt-2 flex items-center justify-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Agenda, Expedientes e Bloqueios salvos com sucesso!</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Live Card Preview & Info Sidebar (Right 4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 self-start">
          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-rose-500" />
            <span>Previsualização do App White-Label</span>
          </h3>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-md"
                style={{ backgroundColor: formData.primaryColor || '#e11d48' }}
              >
                {formData.name ? formData.name[0] : 'G'}
              </div>
              <div>
                <p className="font-bold text-slate-100 text-sm">{formData.name || 'Nome do Seu Negócio'}</p>
                <p className="text-[10px] text-slate-400 font-mono">/b/{formData.slug || 'seu-slug'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
              <p className="text-slate-400">Terminologia Adaptada:</p>
              <p className="font-bold text-rose-400 capitalize">{businessMeta.serviceTerm} / {businessMeta.professionalTerm}</p>
            </div>

            <button
              type="button"
              onClick={() => onOpenPublicPortal('mobile')}
              className="w-full text-center py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: formData.primaryColor || '#e11d48' }}
            >
              Agendar Online (Portal do Cliente)
            </button>
          </div>

          {/* Official Page Link & QR Code Section */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-4">
            <p className="text-[11px] text-slate-400">
              URL Oficial de Agendamento:
            </p>

            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/b/${formData.slug || 'glowfy'}` : `https://glowfy.hub/b/${formData.slug || 'glowfy'}`}
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-2 py-2 text-[10px] font-mono focus:outline-none"
                  id="public-portal-link-input"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('public-portal-link-input') as HTMLInputElement;
                    if (el) {
                      el.select();
                      navigator.clipboard.writeText(el.value);
                      alert('Link copiado!');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2 rounded-xl transition-all"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Dynamic QR Code */}
            <div className="border border-slate-800 bg-white p-2.5 rounded-2xl flex flex-col items-center justify-center space-y-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                  typeof window !== 'undefined' ? `${window.location.origin}/b/${formData.slug || 'glowfy'}` : `https://glowfy.hub/b/${formData.slug || 'glowfy'}`
                )}`}
                alt="QR Code Oficial"
                className="w-28 h-28 object-contain"
                crossOrigin="anonymous"
              />
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-sans">QR CODE GLOWFY HUB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
