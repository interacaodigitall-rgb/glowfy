import React, { useState, useEffect } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { updateTenantProfile } from '../../features/tenants/tenantService';
import { fetchClients, saveClient } from '../../features/clients/clientsService';
import { Client } from '../../types';
import { 
  Gift, 
  Award, 
  Save, 
  Sparkles, 
  Check, 
  Search, 
  Plus, 
  Minus, 
  Phone, 
  User, 
  Grid, 
  RefreshCw,
  Trophy
} from 'lucide-react';

interface LoyaltyProgramConfig {
  mode: 'stamp_card' | 'points_cashback';
  stampsNeeded: number;
  rewardDescription: string;
  pointsPerEuro: number;
  euroPerPoint: number;
  minRedeemPoints: number;
}

export const LoyaltyView: React.FC = () => {
  const { currentTenant, setCurrentTenant, addTenantToContext } = useTenant();
  const [clients, setClients] = useState<Client[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'stamping' | 'config' | 'leaderboard'>('stamping');
  
  // Config States
  const [config, setConfig] = useState<LoyaltyProgramConfig>(() => {
    if (currentTenant?.loyaltyProgram) {
      return currentTenant.loyaltyProgram;
    }
    if (typeof window !== 'undefined' && currentTenant) {
      const saved = localStorage.getItem(`glowfy_loyalty_config_${currentTenant.id}`);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {
      mode: 'stamp_card',
      stampsNeeded: 10,
      rewardDescription: 'Corte de Cabelo Grátis',
      pointsPerEuro: 1,
      euroPerPoint: 0.05,
      minRedeemPoints: 50
    };
  });

  useEffect(() => {
    if (currentTenant?.loyaltyProgram) {
      setConfig(currentTenant.loyaltyProgram);
    }
  }, [currentTenant?.loyaltyProgram]);

  // Stamping Panel States
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [stampingSuccess, setStampingSuccess] = useState<string | null>(null);
  const [configSavedSuccess, setConfigSavedSuccess] = useState(false);

  useEffect(() => {
    if (!currentTenant) return;
    fetchClients(currentTenant.id).then(setClients);
  }, [currentTenant]);

  const loadAllClients = () => {
    if (!currentTenant) return;
    fetchClients(currentTenant.id).then(setClients);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    try {
      await updateTenantProfile(currentTenant.id, { loyaltyProgram: config });
      const updatedTenant = { ...currentTenant, loyaltyProgram: config };
      setCurrentTenant(updatedTenant);
      addTenantToContext(updatedTenant);

      if (typeof window !== 'undefined') {
        localStorage.setItem(`glowfy_loyalty_config_${currentTenant.id}`, JSON.stringify(config));
      }
      setConfigSavedSuccess(true);
      setTimeout(() => setConfigSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao guardar configurações de fidelização.');
    }
  };

  const handleSearchClient = () => {
    if (!phoneSearch.trim()) return;
    const cleaned = phoneSearch.replace(/\s+/g, '');
    const found = clients.find(c => 
      c.phone.replace(/\s+/g, '').includes(cleaned) || 
      c.name.toLowerCase().includes(phoneSearch.toLowerCase())
    );
    if (found) {
      setSelectedClient(found);
      setStampingSuccess(null);
    } else {
      setSelectedClient(null);
      alert('Cliente não encontrado. Verifique o número de telefone ou nome.');
    }
  };

  const handleAddStamp = async () => {
    if (!currentTenant || !selectedClient) return;
    
    // In stamp mode, loyaltyPoints represents current stamp count
    const currentStamps = selectedClient.loyaltyPoints || 0;
    const maxStamps = config.stampsNeeded;
    
    let updatedStamps = currentStamps + 1;
    let successMsg = `Carimbo adicionado com sucesso! (${updatedStamps}/${maxStamps})`;
    
    if (updatedStamps >= maxStamps) {
      successMsg = `Parabéns! O cliente completou os ${maxStamps} carimbos e ganhou: ${config.rewardDescription}!`;
    }

    try {
      const updated = await saveClient(currentTenant.id, {
        ...selectedClient,
        loyaltyPoints: updatedStamps
      });
      setSelectedClient(updated);
      setStampingSuccess(successMsg);
      loadAllClients();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveStamp = async () => {
    if (!currentTenant || !selectedClient) return;
    const currentStamps = selectedClient.loyaltyPoints || 0;
    if (currentStamps <= 0) return;

    const updatedStamps = currentStamps - 1;
    try {
      const updated = await saveClient(currentTenant.id, {
        ...selectedClient,
        loyaltyPoints: updatedStamps
      });
      setSelectedClient(updated);
      setStampingSuccess(`Carimbo removido. (${updatedStamps}/${config.stampsNeeded})`);
      loadAllClients();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRedeemReward = async () => {
    if (!currentTenant || !selectedClient) return;
    const currentStamps = selectedClient.loyaltyPoints || 0;
    if (currentStamps < config.stampsNeeded) {
      alert(`O cliente precisa de pelo menos ${config.stampsNeeded} carimbos para resgatar a recompensa.`);
      return;
    }

    const updatedStamps = currentStamps - config.stampsNeeded;
    try {
      const updated = await saveClient(currentTenant.id, {
        ...selectedClient,
        loyaltyPoints: updatedStamps
      });
      setSelectedClient(updated);
      setStampingSuccess(`Recompensa resgatada! Cartão reiniciado para o cliente (${updatedStamps} carimbos restantes).`);
      loadAllClients();
    } catch (e) {
      console.error(e);
    }
  };

  const sortedClients = [...clients].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Fidelização & Cashback Digital</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Recompense a lealdade dos seus clientes de forma totalmente personalizável.
            </p>
          </div>
        </div>

        {/* Sub-tabs menu */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('stamping')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'stamping'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Carimbador Digital
          </button>
          <button
            onClick={() => setActiveSubTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'config'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Configurar Programa
          </button>
          <button
            onClick={() => setActiveSubTab('leaderboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'leaderboard'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Clientes Fidelizados
          </button>
        </div>
      </div>

      {/* RENDER VIEW ACCORDING TO SUB-TAB */}
      {activeSubTab === 'stamping' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quick Stamping Board (Left 7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Grid className="w-4 h-4 text-amber-500" />
                <span>Registrar Carimbos / Adicionar Pontos</span>
              </h3>
              <p className="text-xs text-slate-400">
                Procure o cliente pelo telefone ou nome para carimbar o cartão digital.
              </p>
            </div>

            {/* Phone/Name search box */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Número de telefone (ex: 912345678) ou Nome do Cliente..."
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-amber-500 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchClient()}
                />
              </div>
              <button
                onClick={handleSearchClient}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-3 rounded-xl text-xs transition-all flex items-center space-x-1.5"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </div>

            {/* Search Helper: Quick List dropdown selector */}
            <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 items-center">
              <span>Clientes rápidos:</span>
              <div className="flex flex-wrap gap-1">
                {clients.slice(0, 4).map((cli) => (
                  <button
                    key={cli.id}
                    onClick={() => {
                      setSelectedClient(cli);
                      setPhoneSearch(cli.phone);
                    }}
                    className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-1 rounded-md transition-colors"
                  >
                    {cli.name} ({cli.phone.slice(-9)})
                  </button>
                ))}
              </div>
            </div>

            {/* Found Client Digital Loyalty Card Preview */}
            {selectedClient ? (
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 space-y-6 animate-in fade-in duration-250">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                      <User className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedClient.name}</h4>
                      <p className="text-[10px] font-mono text-slate-400">{selectedClient.phone}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {config.mode === 'stamp_card' ? 'Cartão de Carimbos' : 'Pontos de Cashback'}
                    </span>
                  </div>
                </div>

                {config.mode === 'stamp_card' ? (
                  <div className="space-y-5">
                    {/* Visual Stamp Card Grid */}
                    <div className="text-center">
                      <p className="text-xs text-slate-300 font-semibold mb-3">
                        Progresso do Cliente: <span className="text-amber-500 font-bold font-mono">{selectedClient.loyaltyPoints || 0}</span> / {config.stampsNeeded} carimbos
                      </p>

                      {/* STAMP CIRCLES GRID */}
                      <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto">
                        {Array.from({ length: config.stampsNeeded }).map((_, idx) => {
                          const isStamped = idx < (selectedClient.loyaltyPoints || 0);
                          return (
                            <div
                              key={idx}
                              className={`aspect-square rounded-full flex items-center justify-center transition-all ${
                                isStamped
                                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/10 border border-amber-300 scale-105'
                                  : 'bg-slate-900 border border-slate-800 text-slate-600 border-dashed'
                              }`}
                            >
                              {isStamped ? (
                                <Sparkles className="w-5 h-5 text-slate-950 animate-pulse" />
                              ) : (
                                <span className="text-[10px] font-bold font-mono text-slate-500">{idx + 1}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stamping Operations Panel */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={handleAddStamp}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Carimbar Cartão (+1)</span>
                      </button>

                      <button
                        onClick={handleRemoveStamp}
                        className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold text-xs px-4 py-3 rounded-xl transition-all"
                        title="Remover carimbo em caso de engano"
                      >
                        Remover Carimbo (-1)
                      </button>

                      <button
                        onClick={handleRedeemReward}
                        disabled={(selectedClient.loyaltyPoints || 0) < config.stampsNeeded}
                        className={`font-black text-xs px-5 py-3 rounded-xl uppercase tracking-wider transition-all ${
                          (selectedClient.loyaltyPoints || 0) >= config.stampsNeeded
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                            : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                        }`}
                      >
                        Resgatar Brinde
                      </button>
                    </div>

                    {stampingSuccess && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-400 text-center text-xs font-semibold">
                        {stampingSuccess}
                      </div>
                    )}
                  </div>
                ) : (
                  // Cashback point system view
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-slate-900/60 rounded-xl border border-slate-850">
                      <p className="text-slate-400 text-[10px]">PONTOS ACUMULADOS</p>
                      <h4 className="text-3xl font-black text-emerald-400 font-mono mt-1">
                        {selectedClient.loyaltyPoints || 0} <span className="text-xs font-bold text-slate-400">PTS</span>
                      </h4>
                      <p className="text-slate-300 text-[11px] mt-1">
                        Equivale a <span className="font-bold text-white">€{((selectedClient.loyaltyPoints || 0) * config.euroPerPoint).toFixed(2)}</span> em descontos
                      </p>
                    </div>

                     {/* Stamping/Points adding controller */}
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!currentTenant) return;
                          const pts = prompt('Quantos pontos deseja adicionar a este cliente?', '10');
                          if (!pts) return;
                          const parsed = parseInt(pts);
                          if (isNaN(parsed)) return;

                          const updated = await saveClient(currentTenant.id, {
                            ...selectedClient,
                            loyaltyPoints: (selectedClient.loyaltyPoints || 0) + parsed
                          });
                          setSelectedClient(updated);
                          setStampingSuccess(`Adicionados ${parsed} pontos com sucesso!`);
                          loadAllClients();
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-all"
                      >
                        Adicionar Pontos
                      </button>

                      <button
                        onClick={async () => {
                          if (!currentTenant) return;
                          const pts = prompt('Quantos pontos deseja deduzir deste cliente?', '50');
                          if (!pts) return;
                          const parsed = parseInt(pts);
                          if (isNaN(parsed)) return;

                          const current = selectedClient.loyaltyPoints || 0;
                          if (current < parsed) {
                            alert('Pontos insuficientes!');
                            return;
                          }

                          const updated = await saveClient(currentTenant.id, {
                            ...selectedClient,
                            loyaltyPoints: current - parsed
                          });
                          setSelectedClient(updated);
                          setStampingSuccess(`Deduzidos ${parsed} pontos.`);
                          loadAllClients();
                        }}
                        className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-semibold text-xs px-4 py-3 rounded-xl transition-all"
                      >
                        Deduzir Pontos
                      </button>
                    </div>

                    {stampingSuccess && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-400 text-center text-xs font-semibold">
                        {stampingSuccess}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 py-12 text-center rounded-2xl">
                <p className="text-slate-500 text-xs italic">Busque um cliente acima para operar o carimbador.</p>
              </div>
            )}
          </div>

          {/* Quick Stats Sidebar (Right 5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Clientes Ativos Recentes</span>
            </h3>

            <div className="divide-y divide-slate-800 text-xs">
              {clients.length === 0 ? (
                <p className="text-slate-500 italic py-8 text-center">Nenhum cliente cadastrado.</p>
              ) : (
                clients.slice(0, 5).map((cli) => (
                  <div key={cli.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">{cli.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{cli.phone}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClient(cli);
                        setPhoneSearch(cli.phone);
                        setStampingSuccess(null);
                      }}
                      className="text-[10px] font-bold text-amber-500 hover:underline bg-slate-950 px-2 py-1 rounded border border-slate-800"
                    >
                      Selecionar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'config' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-2xl">
          <h3 className="font-bold text-white text-sm flex items-center space-x-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Configurações do Programa de Fidelidade</span>
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Tipo do Programa</label>
              <select
                value={config.mode}
                onChange={(e) => setConfig({ ...config, mode: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-medium"
              >
                <option value="stamp_card">🎟️ Cartão de Fidelidade Digital (Selo/Carimbo)</option>
                <option value="points_cashback">💰 Sistema de Pontos & Cashback Acumulado</option>
              </select>
            </div>

            {config.mode === 'stamp_card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Carimbos necessários para brinde</label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={config.stampsNeeded}
                    onChange={(e) => setConfig({ ...config, stampsNeeded: parseInt(e.target.value) || 10 })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Descrição do Brinde / Recompensa</label>
                  <input
                    type="text"
                    value={config.rewardDescription}
                    onChange={(e) => setConfig({ ...config, rewardDescription: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-bold"
                    placeholder="Ex: Corte de Cabelo Grátis"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Pontos por €1 gasto</label>
                  <input
                    type="number"
                    value={config.pointsPerEuro}
                    onChange={(e) => setConfig({ ...config, pointsPerEuro: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Valor de 1 Ponto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.euroPerPoint}
                    onChange={(e) => setConfig({ ...config, euroPerPoint: parseFloat(e.target.value) || 0.05 })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Mínimo para resgate (pts)</label>
                  <input
                    type="number"
                    value={config.minRedeemPoints}
                    onChange={(e) => setConfig({ ...config, minRedeemPoints: parseInt(e.target.value) || 50 })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider transition-colors shadow-lg flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Regras do Programa</span>
            </button>

            {configSavedSuccess && (
              <p className="text-emerald-400 text-center font-bold text-xs flex items-center justify-center space-x-1 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Configurações guardadas com sucesso!</span>
              </p>
            )}
          </form>
        </div>
      )}

      {activeSubTab === 'leaderboard' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-3xl space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Ranking de Fidelidade e Engajamento</span>
          </h3>

          <div className="divide-y divide-slate-850 text-xs">
            {sortedClients.length === 0 ? (
              <p className="text-slate-500 italic py-8 text-center">Nenhum cliente com pontuação.</p>
            ) : (
              sortedClients.map((c, i) => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-950 text-amber-500 font-bold flex items-center justify-center text-[10px] border border-slate-800">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.appointmentsCount} visitas finalizadas</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-amber-500 font-mono text-sm">
                      {c.loyaltyPoints} {config.mode === 'stamp_card' ? 'carimbos' : 'pts'}
                    </p>
                    {config.mode === 'points_cashback' && (
                      <p className="text-[10px] text-slate-400">
                        = €{(c.loyaltyPoints * config.euroPerPoint).toFixed(2)} desconto
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
