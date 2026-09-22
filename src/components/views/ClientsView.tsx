import React, { useState, useEffect } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { Client } from '../../types';
import { fetchClients, saveClient, deleteClient } from '../../features/clients/clientsService';
import { Users, Plus, Search, Phone, Mail, Gift, Trash2, Edit2, UserCheck } from 'lucide-react';

export const ClientsView: React.FC = () => {
  const { currentTenant } = useTenant();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const list = await fetchClients(currentTenant.id);
      setClients(list);
    } catch (e) {
      console.error("Error fetching clients", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !editingClient.name) return;
    try {
      const saved = await saveClient(currentTenant.id, editingClient);
      setClients(prev => {
        const exists = prev.some(c => c.id === saved.id);
        return exists ? prev.map(c => c.id === saved.id ? saved : c) : [...prev, saved];
      });
      setModalOpen(false);
      setEditingClient({});
    } catch (e) {
      alert("Erro ao guardar cliente.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentTenant || !confirm("Tem a certeza que deseja apagar este cliente?")) return;
    try {
      await deleteClient(currentTenant.id, id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      alert("Erro ao apagar cliente.");
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#8C6D23]" />
            <span>Clientes & CRM</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Histórico de agendamentos, faturação acumulada e preferências do cliente.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Procurar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-gray-300 text-[#111827] text-xs rounded-lg pl-9 pr-3 py-2 w-48 sm:w-64 focus:border-[#C5A059] focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setEditingClient({});
              setModalOpen(true);
            }}
            className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#6B7280] text-xs">Carregando clientes...</div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-[#6B7280] text-xs shadow-sm">
          Nenhum cliente encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white border border-gray-200 hover:border-gray-300 p-4 rounded-xl space-y-3 transition-all shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-[#8C6D23] text-sm">
                    {client.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111827] text-sm">{client.name}</h3>
                    <p className="text-[11px] text-[#6B7280] flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>{client.phone || 'Sem telefone'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setEditingClient(client);
                      setModalOpen(true);
                    }}
                    className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {client.email && (
                <p className="text-[11px] text-[#6B7280] flex items-center space-x-1 truncate">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span>{client.email}</span>
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg text-center border border-gray-200 text-xs">
                <div>
                  <p className="text-[10px] text-[#6B7280]">Gasto Total</p>
                  <p className="font-bold text-[#8C6D23]">€{client.totalSpent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280]">Visitas</p>
                  <p className="font-bold text-[#111827]">{client.appointmentsCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280]">Pontos</p>
                  <p className="font-bold text-emerald-600 flex items-center justify-center space-x-0.5">
                    <Gift className="w-3 h-3" />
                    <span>{client.loyaltyPoints}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add/Edit Client */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#111827]">
              {editingClient.id ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editingClient.name || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="Ex: Maria Silva"
                />
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={editingClient.phone || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="+351 912 345 678"
                />
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Email</label>
                <input
                  type="email"
                  value={editingClient.email || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="maria@exemplo.pt"
                />
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Notas / Preferências</label>
                <textarea
                  value={editingClient.notes || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  rows={2}
                  placeholder="Ex: Alergia a certos produtos, café sem açúcar..."
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
