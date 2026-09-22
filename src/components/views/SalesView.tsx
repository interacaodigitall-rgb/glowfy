import React, { useState, useEffect } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { useAuth } from '../../features/auth/AuthContext';
import { 
  Sale, 
  SaleItem, 
  CashRegister, 
  Service, 
  Product, 
  Client, 
  Professional,
  Appointment
} from '../../types';
import { 
  fetchActiveCashRegister, 
  openCashRegister, 
  closeCashRegister, 
  addCashTransaction, 
  processSale,
  fetchSales 
} from '../../features/sales/salesService';
import { fetchServices } from '../../features/services/servicesService';
import { fetchProducts } from '../../features/products/productsService';
import { fetchClients } from '../../features/clients/clientsService';
import { fetchProfessionals } from '../../features/professionals/professionalsService';
import { 
  CreditCard, 
  DollarSign, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  Receipt, 
  CheckCircle2, 
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Printer
} from 'lucide-react';

interface SalesViewProps {
  initialAppointmentForCheckout?: Appointment | null;
  onClearInitialAppointment?: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  initialAppointmentForCheckout,
  onClearInitialAppointment
}) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mbway_pix' | 'loyalty_points'>('cash');

  // Modals
  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [closeRegisterModal, setCloseRegisterModal] = useState(false);
  const [cashTxModal, setCashTxModal] = useState(false);
  const [receiptModalSale, setReceiptModalSale] = useState<Sale | null>(null);

  // Forms
  const [initialAmount, setInitialAmount] = useState<number>(100);
  const [closingActualAmount, setClosingActualAmount] = useState<number>(0);
  const [closingNote, setClosingNote] = useState<string>('');
  const [txType, setTxType] = useState<'entry' | 'exit'>('entry');
  const [txAmount, setTxAmount] = useState<number>(10);
  const [txDescription, setTxDescription] = useState<string>('');

  const loadAllData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [reg, sList, pList, cList, proList, sales] = await Promise.all([
        fetchActiveCashRegister(currentTenant.id),
        fetchServices(currentTenant.id),
        fetchProducts(currentTenant.id),
        fetchClients(currentTenant.id),
        fetchProfessionals(currentTenant.id),
        fetchSales(currentTenant.id)
      ]);

      setActiveRegister(reg);
      setServices(sList);
      setProducts(pList);
      setClients(cList);
      setProfessionals(proList);
      setSalesHistory(sales);

      if (reg) {
        setClosingActualAmount(reg.currentAmount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [currentTenant]);

  // Pre-fill cart if launched from completed appointment
  useEffect(() => {
    if (initialAppointmentForCheckout) {
      const app = initialAppointmentForCheckout;
      const matchedClient = clients.find(c => c.name === app.clientName || c.phone === app.clientPhone);
      if (matchedClient) {
        setSelectedClientId(matchedClient.id);
      }

      setCartItems([{
        id: `cart-app-${Date.now()}`,
        type: 'service',
        itemId: app.serviceId,
        name: app.serviceName,
        price: app.price,
        quantity: 1,
        discount: 0,
        professionalId: app.professionalId,
        professionalName: app.professionalName,
        commissionAmount: app.commissionAmount
      }]);
    }
  }, [initialAppointmentForCheckout, clients]);

  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    try {
      const newReg = await openCashRegister(
        currentTenant.id,
        initialAmount,
        user?.uid || 'owner',
        user?.displayName || 'Operador'
      );
      setActiveRegister(newReg);
      setOpenRegisterModal(false);
    } catch (e) {
      alert("Erro ao abrir caixa.");
    }
  };

  const handleCloseCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !activeRegister) return;
    try {
      await closeCashRegister(
        currentTenant.id,
        activeRegister.id,
        closingActualAmount,
        user?.uid || 'owner',
        user?.displayName || 'Operador',
        closingNote
      );
      setActiveRegister(null);
      setCloseRegisterModal(false);
      loadAllData();
    } catch (e) {
      alert("Erro ao fechar caixa.");
    }
  };

  const handleCashTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !activeRegister) return;
    try {
      await addCashTransaction(
        currentTenant.id,
        activeRegister.id,
        txType,
        txAmount,
        txDescription,
        user?.uid || 'owner',
        user?.displayName || 'Operador'
      );
      setCashTxModal(false);
      loadAllData();
    } catch (e) {
      alert("Erro ao registar sangria/suprimento.");
    }
  };

  const handleAddItemToCart = (type: 'service' | 'product', item: Service | Product) => {
    const isService = type === 'service';
    const defaultPro = professionals[0];
    const commRate = isService ? ((item as Service).commissionPercentage || 30) : 10;
    const commAmount = ((item.price || 0) * commRate) / 100;

    const newItem: SaleItem = {
      id: `cart-${Date.now()}-${Math.random()}`,
      type,
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      discount: 0,
      professionalId: defaultPro?.id || '',
      professionalName: defaultPro?.name || 'Geral',
      commissionAmount: commAmount
    };

    setCartItems(prev => [...prev, newItem]);
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
  };

  const cartSubtotal = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const cartTotal = Math.max(0, cartSubtotal - discount);

  const handleCheckout = async () => {
    if (!currentTenant) return;
    if (cartItems.length === 0) {
      alert("Adicione pelo menos um item ao carrinho.");
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);

    try {
      const sale = await processSale(currentTenant.id, {
        cashRegisterId: activeRegister?.id,
        clientId: client?.id,
        clientName: client?.name || 'Cliente Geral',
        items: cartItems,
        paymentMethod,
        discount,
        sellerId: user?.uid || 'owner',
        sellerName: user?.displayName || 'Caixa'
      });

      setReceiptModalSale(sale);
      setCartItems([]);
      setDiscount(0);
      if (onClearInitialAppointment) onClearInitialAppointment();
      loadAllData();
    } catch (e) {
      alert("Erro ao finalizar venda.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cash Status Ribbon */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg border ${activeRegister ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            {activeRegister ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#111827]">
                Caixa do Dia: {activeRegister ? 'ABERTO' : 'FECHADO'}
              </h2>
              {activeRegister && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px] rounded uppercase">
                  Sessão Ativa
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {activeRegister 
                ? `Aberto por ${activeRegister.openedByName} às ${new Date(activeRegister.openedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` 
                : 'Abra a sessão de caixa para registar pagamentos em dinheiro e TPA.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeRegister ? (
            <>
              <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-right">
                <span className="text-[10px] text-[#6B7280] block font-medium">Fundo de Caixa em Mão</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">€{activeRegister.currentAmount.toFixed(2)}</span>
              </div>

              <button
                onClick={() => {
                  setTxType('entry');
                  setCashTxModal(true);
                }}
                className="bg-white hover:bg-gray-50 text-[#111827] text-xs px-3 py-2 rounded-lg border border-gray-300 font-medium transition-colors"
              >
                Suprimento / Sangria
              </button>

              <button
                onClick={() => {
                  setClosingActualAmount(activeRegister.currentAmount);
                  setCloseRegisterModal(true);
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs px-3 py-2 rounded-lg font-semibold transition-colors"
              >
                Fechar Caixa
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpenRegisterModal(true)}
              className="bg-[#C5A059] hover:bg-[#B38F46] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Caixa de Hoje</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Item Selection Panel (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
            <h3 className="font-bold text-[#111827] text-sm flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-[#8C6D23]" />
              <span>Adicionar Itens ao Carrinho</span>
            </h3>

            {/* Services List Quick Add */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Serviços</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleAddItemToCart('service', s)}
                    className="p-2.5 bg-gray-50 hover:bg-[#C5A059]/10 border border-gray-200 hover:border-[#C5A059]/40 rounded-lg text-left transition-all"
                  >
                    <p className="font-semibold text-[#111827] text-xs truncate">{s.name}</p>
                    <p className="text-[10px] text-[#8C6D23] font-bold mt-0.5">€{s.price.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Products List Quick Add */}
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Produtos de Venda</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAddItemToCart('product', p)}
                    className="p-2.5 bg-gray-50 hover:bg-[#C5A059]/10 border border-gray-200 hover:border-[#C5A059]/40 rounded-lg text-left transition-all"
                  >
                    <p className="font-semibold text-[#111827] text-xs truncate">{p.name}</p>
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                      €{p.price.toFixed(2)} <span className="text-gray-400 text-[9px]">({p.stock} un)</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* POS Cart & Checkout Panel (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between space-y-4 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-[#111827] text-sm flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-[#8C6D23]" />
                <span>Carrinho de Venda</span>
              </h3>
              <span className="text-xs text-[#6B7280]">{cartItems.length} itens</span>
            </div>

            {/* Client Select */}
            <div>
              <label className="block text-[11px] text-[#111827] mb-1 font-semibold">Associar Cliente</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-white border border-gray-300 text-[#111827] text-xs rounded-lg p-2 focus:border-[#C5A059] focus:outline-none"
              >
                <option value="">Cliente Geral (Não Registado)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {cartItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 italic">
                  O carrinho está vazio. Selecione serviços ou produtos à esquerda.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#111827]">{item.name}</p>
                      <p className="text-[10px] text-[#6B7280]">
                        {item.type === 'service' ? 'Serviço' : 'Produto'} • €{item.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#8C6D23]">€{(item.price * item.quantity).toFixed(2)}</span>
                      <button
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checkout Totals & Payment Method */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B7280] font-medium">Desconto (€):</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-20 bg-white border border-gray-300 text-[#111827] rounded-lg px-2 py-1 text-right font-mono focus:border-[#C5A059] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#111827] mb-1 font-semibold">Método de Pagamento</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'cash', label: 'Dinheiro / Numerário' },
                  { id: 'card', label: 'Cartão / TPA' },
                  { id: 'mbway_pix', label: 'MBWay / Pix' },
                  { id: 'loyalty_points', label: 'Pontos Fidelização' }
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`p-2 rounded-lg border text-[11px] font-semibold transition-all ${
                      paymentMethod === pm.id 
                        ? 'bg-[#C5A059] text-white border-[#C5A059] shadow-sm' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#111827] uppercase">Total a Cobrar</span>
              <span className="text-xl font-bold text-[#8C6D23] font-mono">€{cartTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
              className="w-full bg-[#C5A059] hover:bg-[#B38F46] disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalizar Venda & Gerar Recibo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Open Cash */}
      {openRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#111827] flex items-center space-x-2">
              <Unlock className="w-5 h-5 text-[#8C6D23]" />
              <span>Abertura de Caixa</span>
            </h3>
            <form onSubmit={handleOpenCash} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Fundo de Caixa Inicial (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(parseFloat(e.target.value))}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 font-mono text-sm font-bold focus:border-[#C5A059] focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenRegisterModal(false)}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-[#111827] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Abrir Sessão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Close Cash */}
      {closeRegisterModal && activeRegister && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#111827] flex items-center space-x-2">
              <Lock className="w-5 h-5 text-red-600" />
              <span>Fecho de Caixa & Balanço</span>
            </h3>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#6B7280]">
                <span>Fundo Inicial:</span>
                <span className="font-mono text-[#111827] font-semibold">€{activeRegister.initialAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Vendas em Dinheiro:</span>
                <span className="font-mono text-emerald-600 font-semibold">+€{activeRegister.totalSalesCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Vendas TPA / Cartão:</span>
                <span className="font-mono text-indigo-600 font-semibold">€{activeRegister.totalSalesCard.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#111827] pt-1.5 border-t border-gray-200">
                <span>Esperado em Gaveta:</span>
                <span className="font-mono text-[#8C6D23]">€{activeRegister.expectedClosingAmount.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseCash} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Contagem Real na Gaveta (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closingActualAmount}
                  onChange={(e) => setClosingActualAmount(parseFloat(e.target.value))}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 font-mono text-sm font-bold focus:border-[#C5A059] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Observações do Fecho</label>
                <textarea
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  rows={2}
                  placeholder="Ex: Diferença de troco..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCloseRegisterModal(false)}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-[#111827] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Confirmar Fecho de Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Tx Modal */}
      {cashTxModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#111827]">Suprimento / Sangria de Caixa</h3>
            <form onSubmit={handleCashTx} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Operação</label>
                <select
                  value={txType}
                  onChange={(e: any) => setTxType(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                >
                  <option value="entry">Suprimento (Entrada +)</option>
                  <option value="exit">Sangria (Saída -)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Valor (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value))}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 font-mono focus:border-[#C5A059] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#111827] mb-1 font-semibold">Descrição *</label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-[#111827] rounded-lg p-2.5 focus:border-[#C5A059] focus:outline-none"
                  placeholder="Ex: Troco inicial, Pagamento Fornecedor..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCashTxModal(false)}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-[#111827] font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#C5A059] hover:bg-[#B38F46] text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Registar Movimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptModalSale && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#111827]">Venda Concluída com Sucesso!</h3>
              <p className="text-xs text-[#6B7280]">Recibo #{receiptModalSale.id.slice(0, 8)}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between text-[#6B7280]">
                <span>Cliente:</span>
                <span className="font-semibold text-[#111827]">{receiptModalSale.clientName}</span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Pagamento:</span>
                <span className="font-semibold uppercase text-[#8C6D23]">{receiptModalSale.paymentMethod}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 space-y-1">
                {receiptModalSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[#111827] text-[11px]">
                    <span>{it.name} x{it.quantity}</span>
                    <span className="font-mono font-medium">€{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-[#111827]">
                <span>Total Pago:</span>
                <span className="font-mono text-[#8C6D23]">€{receiptModalSale.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setReceiptModalSale(null)}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-[#111827] font-semibold px-6 py-2 rounded-lg text-xs transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
