import React, { useState, useEffect } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { Service, ServiceCategory } from '../../types';
import { fetchServices, fetchServiceCategories, saveService, deleteService } from '../../features/services/servicesService';
import { Scissors, Plus, Clock, DollarSign, Percent, Trash2, Edit2 } from 'lucide-react';

export const ServicesView: React.FC = () => {
  const { currentTenant, businessMeta } = useTenant();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service>>({});

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [sList, cList] = await Promise.all([
        fetchServices(currentTenant.id),
        fetchServiceCategories(currentTenant.id)
      ]);
      setServices(sList);
      setCategories(cList);
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
    if (!currentTenant || !editingService.name) return;
    try {
      const saved = await saveService(currentTenant.id, editingService);
      if (saved) {
        setServices(prev => {
          const idx = prev.findIndex(s => s.id === saved.id);
          return idx >= 0 ? prev.map(s => s.id === saved.id ? saved : s) : [...prev, saved];
        });
      }
      setModalOpen(false);
      setEditingService({});
    } catch (e) {
      alert("Erro ao guardar serviço.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentTenant || !confirm("Tem a certeza que deseja eliminar este serviço?")) return;
    try {
      await deleteService(currentTenant.id, id);
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert("Erro ao eliminar serviço.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
            <Scissors className="w-5 h-5 text-[#8C6D23]" />
            <span>Catálogo de {businessMeta.serviceTerm}s</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Defina preços, duração e percentagem de comissão por profissional.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingService({ durationMinutes: 30, commissionPercentage: 40, active: true });
            setModalOpen(true);
          }}
          className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Novo {businessMeta.serviceTerm}</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#6B7280] text-xs">Carregando serviços...</div>
      ) : services.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-[#6B7280] text-xs shadow-sm">
          Sem serviços registados neste catálogo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className="bg-white border border-gray-200 hover:border-gray-300 p-4 rounded-xl space-y-3 transition-all flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 bg-gray-100 text-[#111827] text-[10px] font-semibold rounded uppercase border border-gray-200">
                      {service.categoryName || 'Geral'}
                    </span>
                    <h3 className="font-semibold text-[#111827] text-sm mt-1.5">{service.name}</h3>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingService(service);
                        setModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {service.description && (
                  <p className="text-[11px] text-[#6B7280] mt-2 line-clamp-2 leading-relaxed">{service.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-[10px] text-[#6B7280]">Preço</p>
                  <p className="font-bold text-[#8C6D23]">€{service.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280]">Duração</p>
                  <p className="font-semibold text-[#111827] flex items-center justify-center space-x-0.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{service.durationMinutes}m</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280]">Comissão</p>
                  <p className="font-semibold text-indigo-600">{service.commissionPercentage}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#111827]">
              {editingService.id ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  value={editingService.name || ''}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="Ex: Corte Degradê / Limpeza de Pele"
                />
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Categoria</label>
                <input
                  type="text"
                  value={editingService.categoryName || ''}
                  onChange={(e) => setEditingService({ ...editingService, categoryName: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="Ex: Cabelo, Barba, Estética Facial..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Preço (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingService.price ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Duração (min) *</label>
                  <input
                    type="number"
                    required
                    value={editingService.durationMinutes ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, durationMinutes: parseInt(e.target.value) })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Comissão (%)</label>
                  <input
                    type="number"
                    value={editingService.commissionPercentage ?? ''}
                    onChange={(e) => setEditingService({ ...editingService, commissionPercentage: parseFloat(e.target.value) })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[#111827] font-semibold">URL da Foto do Serviço</label>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    600 × 600 px (1:1 Quadrado) ou 800 × 600 px (4:3)
                  </span>
                </div>
                <input
                  type="text"
                  value={editingService.imageUrl || ''}
                  onChange={(e) => setEditingService({ ...editingService, imageUrl: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="https://exemplo.com/servico.jpg"
                />
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Descrição</label>
                <textarea
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  rows={2}
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
