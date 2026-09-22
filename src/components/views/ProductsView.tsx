import React, { useState, useEffect } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { useAuth } from '../../features/auth/AuthContext';
import { Product, StockMove } from '../../types';
import { fetchProducts, fetchStockMoves, saveProduct, recordStockMove, deleteProduct, subscribeProducts } from '../../features/products/productsService';
import { Package, Plus, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, Layers, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMoves, setStockMoves] = useState<StockMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'history'>('catalog');
  const [modalOpen, setModalOpen] = useState(false);
  const [stockMoveModalOpen, setStockMoveModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Partial<Product>>({});
  const [selectedProdForMove, setSelectedProdForMove] = useState<Product | null>(null);
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState('');
  const [moveType, setMoveType] = useState<'in' | 'out' | 'adjustment'>('in');

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [prods, moves] = await Promise.all([
        fetchProducts(currentTenant.id),
        fetchStockMoves(currentTenant.id)
      ]);
      setProducts(prods);
      setStockMoves(moves);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (!currentTenant) return;
    const unsubscribe = subscribeProducts(currentTenant.id, (realtimeProds) => {
      if (realtimeProds) {
        setProducts(realtimeProds);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [currentTenant?.id]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !editingProd.name) return;
    try {
      const saved = await saveProduct(currentTenant.id, editingProd, user?.email || 'admin@glowfyhub.com');
      if (saved) {
        setProducts(prev => {
          const idx = prev.findIndex(p => p.id === saved.id);
          return idx >= 0 ? prev.map(p => p.id === saved.id ? saved : p) : [...prev, saved];
        });
      }
      setModalOpen(false);
      setEditingProd({});
      loadData();
    } catch (e) {
      alert("Erro ao guardar produto.");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!currentTenant || !confirm(`Tem certeza que deseja remover o produto "${name}"?`)) return;
    try {
      await deleteProduct(currentTenant.id, id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert("Erro ao remover produto.");
    }
  };

  const handleRecordStockMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !selectedProdForMove) return;
    try {
      const prevStock = selectedProdForMove.stock;
      const newStock = moveType === 'in' 
        ? prevStock + moveQty 
        : Math.max(0, prevStock - moveQty);

      await recordStockMove(currentTenant.id, {
        productId: selectedProdForMove.id,
        productName: selectedProdForMove.name,
        type: moveType,
        quantity: moveQty,
        previousStock: prevStock,
        newStock,
        reason: moveReason || (moveType === 'in' ? 'Entrada Manual de Estoque' : 'Saída Manual / Ajuste'),
        performedBy: user?.email || 'Operador'
      });

      setStockMoveModalOpen(false);
      setSelectedProdForMove(null);
      loadData();
    } catch (e) {
      alert("Erro ao registar movimento de estoque.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
            <Package className="w-5 h-5 text-[#8C6D23]" />
            <span>Produtos & Controlo de Stock</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Gestão do catálogo de produtos com fotos, preços e registo obrigatório de auditoria em stockMoves.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-gray-100 p-1 rounded-lg border border-gray-200 flex text-xs">
            <button
              onClick={() => setActiveSubTab('catalog')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSubTab === 'catalog' ? 'bg-white text-[#111827] font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Catálogo
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSubTab === 'history' ? 'bg-white text-[#111827] font-semibold shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Histórico
            </button>
          </div>

          <button
            onClick={() => {
              setEditingProd({ stock: 10, minStock: 3, categoryName: 'Geral' });
              setModalOpen(true);
            }}
            className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'catalog' ? (
        loading ? (
          <div className="text-center py-12 text-[#6B7280] text-xs">Carregando inventário...</div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-[#6B7280] text-xs shadow-sm">
            Sem produtos registados no inventário. Clique em "Novo Produto" para cadastrar itens com fotos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => {
              const isLowStock = prod.stock <= prod.minStock;

              return (
                <div key={prod.id} className="bg-white border border-gray-200 hover:border-gray-300 p-4 rounded-xl space-y-3 transition-all flex flex-col justify-between shadow-sm">
                  <div>
                    {/* Image & Header */}
                    <div className="flex items-start space-x-3">
                      <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=400&q=80";
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-mono text-gray-400 uppercase">{prod.sku || 'SKU'}</span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setEditingProd(prod);
                                setModalOpen(true);
                              }}
                              className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded transition-colors"
                              title="Editar Produto e Foto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors"
                              title="Remover Produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h3 className="font-semibold text-[#111827] text-sm truncate">{prod.name}</h3>
                        {prod.categoryName && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded font-medium">
                            {prod.categoryName}
                          </span>
                        )}
                      </div>
                    </div>

                    {isLowStock && (
                      <div className="mt-2.5 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold rounded flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span>Alerta: Stock abaixo do mínimo ({prod.stock}/{prod.minStock} un.)</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg text-center border border-gray-200 text-xs">
                    <div>
                      <p className="text-[10px] text-[#6B7280]">Preço Venda</p>
                      <p className="font-bold text-[#8C6D23]">€{prod.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6B7280]">Custo</p>
                      <p className="font-semibold text-gray-600">€{prod.costPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6B7280]">Estoque</p>
                      <p className={`font-bold ${isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {prod.stock} un.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setEditingProd(prod);
                        setModalOpen(true);
                      }}
                      className="bg-white hover:bg-gray-50 border border-gray-200 text-[#111827] text-xs py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 shadow-sm"
                    >
                      <Edit2 className="w-3 h-3 text-[#C5A059]" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProdForMove(prod);
                        setMoveType('in');
                        setMoveQty(1);
                        setStockMoveModalOpen(true);
                      }}
                      className="bg-white hover:bg-gray-50 border border-gray-200 text-[#111827] text-xs py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 shadow-sm"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Movimento</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* History Subtab */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-xs shadow-sm">
          <div className="p-4 border-b border-gray-200 font-semibold text-[#111827]">
            Histórico de Movimentos de Inventário (Auditoria stockMoves)
          </div>
          <div className="divide-y divide-gray-100">
            {stockMoves.map((m) => (
              <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${m.type === 'in' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                    {m.type === 'in' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111827]">{m.productName}</p>
                    <p className="text-[10px] text-[#6B7280]">{m.reason} — por {m.performedBy}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-bold font-mono ${m.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.type === 'in' ? '+' : '-'}{m.quantity} un.
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {m.previousStock} → {m.newStock} | {new Date(m.createdAt).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Add/Edit Product */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-[#111827] flex items-center space-x-2">
                <Package className="w-5 h-5 text-[#C5A059]" />
                <span>{editingProd.id ? 'Editar Produto' : 'Novo Produto no Catálogo'}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={editingProd.name || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, name: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none text-xs"
                  placeholder="Ex: Óleo de Barba Mr. Navalha 50ml"
                />
              </div>

              {/* Photo Input with Recommended Dimensions */}
              <div className="space-y-2 bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="block text-[#111827] font-bold">
                    Foto do Produto (URL da Imagem)
                  </label>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                    Dimensão recomendada: 600 × 600 px (1:1 Quadrado)
                  </span>
                </div>
                <input
                  type="text"
                  value={editingProd.imageUrl || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, imageUrl: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none text-xs"
                  placeholder="https://exemplo.com/imagem-produto.jpg"
                />
                <p className="text-[11px] text-gray-600 leading-snug">
                  Suba uma imagem nítida com fundo limpo (branco, transparente ou estúdio). Formatos aceites: JPG, PNG, WebP.
                </p>

                {editingProd.imageUrl && (
                  <div className="flex items-center space-x-3 pt-1">
                    <div className="w-14 h-14 rounded-lg bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                      <img
                        src={editingProd.imageUrl}
                        alt="Pré-visualização"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=400&q=80";
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      ✓ Pré-visualização da imagem carregada
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Categoria</label>
                  <input
                    type="text"
                    value={editingProd.categoryName || ''}
                    onChange={(e) => setEditingProd({ ...editingProd, categoryName: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none text-xs"
                    placeholder="Ex: Barba, Cabelo, Acessórios"
                  />
                </div>
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Código SKU</label>
                  <input
                    type="text"
                    value={editingProd.sku || ''}
                    onChange={(e) => setEditingProd({ ...editingProd, sku: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none text-xs font-mono"
                    placeholder="Ex: OLEO-01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Preço de Venda (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProd.price ?? ''}
                    onChange={(e) => setEditingProd({ ...editingProd, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Preço de Custo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProd.costPrice ?? ''}
                    onChange={(e) => setEditingProd({ ...editingProd, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Estoque Atual *</label>
                  <input
                    type="number"
                    required
                    value={editingProd.stock ?? ''}
                    onChange={(e) => setEditingProd({ ...editingProd, stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#111827] mb-1 font-semibold">Alerta de Stock Mínimo</label>
                  <input
                    type="number"
                    value={editingProd.minStock ?? 3}
                    onChange={(e) => setEditingProd({ ...editingProd, minStock: parseInt(e.target.value) || 3 })}
                    className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Descrição do Produto</label>
                <textarea
                  rows={2}
                  value={editingProd.description || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, description: e.target.value })}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none text-xs"
                  placeholder="Descreva o produto, benefícios e modo de uso..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-[#111827] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Guardar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Move Modal */}
      {stockMoveModalOpen && selectedProdForMove && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#111827]">
              Registar Movimento: {selectedProdForMove.name}
            </h3>
            <p className="text-xs text-[#6B7280]">Estoque atual: <strong className="text-[#111827]">{selectedProdForMove.stock} un.</strong></p>

            <form onSubmit={handleRecordStockMove} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Tipo de Movimento</label>
                <select
                  value={moveType}
                  onChange={(e: any) => setMoveType(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                >
                  <option value="in">Entrada (+)</option>
                  <option value="out">Saída (-)</option>
                  <option value="adjustment">Ajuste de Quebra/Inventário</option>
                </select>
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Quantidade *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={moveQty}
                  onChange={(e) => setMoveQty(parseInt(e.target.value))}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 font-mono focus:border-[#C5A059] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Motivo / Justificação *</label>
                <input
                  type="text"
                  required
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="Ex: Compra fornecedor, Danificado, Contagem..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStockMoveModalOpen(false)}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-[#111827] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
