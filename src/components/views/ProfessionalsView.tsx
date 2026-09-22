import React, { useState, useEffect } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { Professional, DayWorkingHours } from '../../types';
import { fetchProfessionals, saveProfessional, deleteProfessional } from '../../features/professionals/professionalsService';
import { UserCheck, Plus, Mail, Phone, Percent, Calendar, Edit2, Trash2 } from 'lucide-react';
import { compressImage } from '../../utils/imageUtils';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const ProfessionalsView: React.FC = () => {
  const { currentTenant, businessMeta } = useTenant();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPro, setEditingPro] = useState<Partial<Professional>>({});

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const list = await fetchProfessionals(currentTenant.id);
      setProfessionals(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !editingPro.name) return;
    try {
      const saved = await saveProfessional(currentTenant.id, editingPro);
      if (saved) {
        setProfessionals(prev => {
          const exists = prev.some(p => p.id === saved.id);
          return exists ? prev.map(p => p.id === saved.id ? saved : p) : [...prev, saved];
        });
      }
      setModalOpen(false);
      setEditingPro({});
    } catch (e) {
      alert("Erro ao guardar profissional.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentTenant || !confirm("Tem a certeza que deseja remover este profissional?")) return;
    try {
      await deleteProfessional(currentTenant.id, id);
      setProfessionals(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert("Erro ao apagar profissional.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-[#8C6D23]" />
            <span>Equipa & {businessMeta.professionalTerm}s</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Escalas de horário de trabalho, especialidades e taxa de comissão padrão.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPro({
              commissionRate: 40,
              specialties: ['Geral'],
              active: true
            });
            setModalOpen(true);
          }}
          className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Novo {businessMeta.professionalTerm}</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#6B7280] text-xs">Carregando equipa...</div>
      ) : professionals.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-[#6B7280] text-xs shadow-sm">
          Nenhum profissional registado na equipa.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {professionals.map((pro) => (
            <div key={pro.id} className="bg-white border border-gray-200 hover:border-gray-300 p-4 rounded-xl space-y-3 transition-all flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {pro.avatarUrl ? (
                      <img
                        src={pro.avatarUrl}
                        alt={pro.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.name)}&background=1e293b&color=e5a93b`;
                        }}
                        className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-[#C5A059] text-sm flex-shrink-0 shadow-sm">
                        {pro.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-[#111827] text-sm">{pro.name}</h3>
                      <p className="text-[10px] text-[#8C6D23] font-semibold uppercase">
                        Comissão: {pro.commissionRate}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingPro(pro);
                        setModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(pro.id)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {pro.specialties?.map((spec, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-[#111827] text-[10px] rounded font-medium">
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Schedule Summary */}
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1.5 text-[11px]">
                  <p className="text-[#6B7280] font-semibold text-[10px] uppercase">Dias de Trabalho:</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                      const dayConfig = pro.workingHours?.[d];
                      const active = dayConfig?.active;
                      return (
                        <span
                          key={d}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {WEEKDAYS[d]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Professional Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#111827]">
              {editingPro.id ? 'Editar Profissional' : 'Novo Profissional'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Foto do Profissional / Avatar</label>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {editingPro.avatarUrl ? (
                      <img src={editingPro.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 font-bold text-sm">{editingPro.name ? editingPro.name[0]?.toUpperCase() : 'P'}</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressed = await compressImage(file, 400, 400, 0.82);
                            setEditingPro({ ...editingPro, avatarUrl: compressed });
                          } catch (err) {
                            console.error("Erro ao comprimir avatar:", err);
                          }
                        }
                      }}
                      className="text-[11px] text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-[#C5A059]/10 file:text-[#8C6D23] hover:file:bg-[#C5A059]/20"
                    />
                    <p className="text-[10px] text-gray-500">Ou cole a URL da imagem abaixo:</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={editingPro.avatarUrl || ''}
                  onChange={(e) => setEditingPro({ ...editingPro, avatarUrl: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2 focus:border-[#C5A059] focus:outline-none text-xs"
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editingPro.name || ''}
                  onChange={(e) => setEditingPro({ ...editingPro, name: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="Ex: Carlos Silva"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Email</label>
                  <input
                    type="email"
                    value={editingPro.email || ''}
                    onChange={(e) => setEditingPro({ ...editingPro, email: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Comissão (%) *</label>
                  <input
                    type="number"
                    required
                    value={editingPro.commissionRate ?? 40}
                    onChange={(e) => setEditingPro({ ...editingPro, commissionRate: parseFloat(e.target.value) })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Especialidades (separadas por vírgula)</label>
                <input
                  type="text"
                  value={editingPro.specialties?.join(', ') || ''}
                  onChange={(e) => setEditingPro({ ...editingPro, specialties: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="Ex: Cortes, Barba, Coloração, Estética"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-[#111827] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
