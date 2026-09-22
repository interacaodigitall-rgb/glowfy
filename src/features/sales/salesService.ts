import { Sale, SaleItem, CashRegister, CashTransaction } from '../../types';
import { recordStockMove, fetchProducts } from '../products/productsService';
import { 
  cloudDbList, 
  cloudDbSet, 
  cloudDbDelete, 
  cloudDbSubscribe, 
  normalizeTenantId 
} from '../../services/cloudDb';

export async function fetchSales(rawTenantId: string): Promise<Sale[]> {
  const tenantId = normalizeTenantId(rawTenantId);
  const list = await cloudDbList<Sale>(`tenants/${tenantId}/sales`);
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function fetchCashRegisters(rawTenantId: string): Promise<CashRegister[]> {
  const tenantId = normalizeTenantId(rawTenantId);
  const list = await cloudDbList<CashRegister>(`tenants/${tenantId}/cashRegisters`);
  return list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
}

export async function fetchActiveCashRegister(rawTenantId: string): Promise<CashRegister | null> {
  const tenantId = normalizeTenantId(rawTenantId);
  const registers = await fetchCashRegisters(tenantId);
  const active = registers.find(r => r.status === 'open');
  if (active && typeof window !== 'undefined') {
    localStorage.setItem(`glowfy_active_register_${tenantId}`, JSON.stringify(active));
  }
  return active || null;
}

export async function openCashRegister(
  rawTenantId: string, 
  initialAmount: number, 
  openedBy: string, 
  openedByName: string
): Promise<CashRegister> {
  const tenantId = normalizeTenantId(rawTenantId);
  const id = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const register: CashRegister = {
    id,
    tenantId,
    openedBy,
    openedByName,
    openedAt: new Date().toISOString(),
    initialAmount,
    currentAmount: initialAmount,
    totalSalesCash: 0,
    totalSalesCard: 0,
    totalSalesOther: 0,
    totalIn: 0,
    totalOut: 0,
    expectedClosingAmount: initialAmount,
    status: 'open'
  };

  await cloudDbSet(`tenants/${tenantId}/cashRegisters/${id}`, register);
  if (typeof window !== 'undefined') {
    localStorage.setItem(`glowfy_active_register_${tenantId}`, JSON.stringify(register));
  }
  return register;
}

export async function closeCashRegister(
  rawTenantId: string, 
  registerId: string, 
  actualClosingAmount: number, 
  closedBy: string, 
  closedByName: string,
  note?: string
): Promise<void> {
  const tenantId = normalizeTenantId(rawTenantId);
  const registers = await cloudDbList<CashRegister>(`tenants/${tenantId}/cashRegisters`);
  const reg = registers.find(r => r.id === registerId);
  if (reg) {
    reg.status = 'closed';
    reg.closedAt = new Date().toISOString();
    reg.closedBy = closedBy;
    reg.closedByName = closedByName;
    reg.actualClosingAmount = actualClosingAmount;
    reg.closingNote = note || '';
    await cloudDbSet(`tenants/${tenantId}/cashRegisters/${registerId}`, reg);
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`glowfy_active_register_${tenantId}`);
  }
}

export async function addCashTransaction(
  rawTenantId: string, 
  cashRegisterId: string, 
  type: 'entry' | 'exit', 
  amount: number, 
  description: string, 
  performedBy: string, 
  performedByName: string
): Promise<CashTransaction> {
  const tenantId = normalizeTenantId(rawTenantId);
  const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tx: CashTransaction = {
    id,
    tenantId,
    cashRegisterId,
    type,
    amount,
    description,
    performedBy,
    performedByName,
    createdAt: new Date().toISOString()
  };

  await cloudDbSet(`tenants/${tenantId}/cashTransactions/${id}`, tx);

  // Update register
  const registers = await cloudDbList<CashRegister>(`tenants/${tenantId}/cashRegisters`);
  const reg = registers.find(r => r.id === cashRegisterId);
  if (reg) {
    const newCurrent = type === 'entry' ? reg.currentAmount + amount : reg.currentAmount - amount;
    const newIn = type === 'entry' ? reg.totalIn + amount : reg.totalIn;
    const newOut = type === 'exit' ? reg.totalOut + amount : reg.totalOut;
    reg.currentAmount = newCurrent;
    reg.totalIn = newIn;
    reg.totalOut = newOut;
    reg.expectedClosingAmount = newCurrent;
    await cloudDbSet(`tenants/${tenantId}/cashRegisters/${cashRegisterId}`, reg);
  }

  return tx;
}

export async function processSale(
  rawTenantId: string, 
  saleData: {
    cashRegisterId?: string;
    clientId?: string;
    clientName?: string;
    items: SaleItem[];
    paymentMethod: 'cash' | 'card' | 'mbway_pix' | 'loyalty_points';
    discount: number;
    sellerId: string;
    sellerName: string;
  }
): Promise<Sale> {
  const tenantId = normalizeTenantId(rawTenantId);
  const id = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const subtotal = saleData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - saleData.discount);

  const sale: Sale = {
    id,
    tenantId,
    cashRegisterId: saleData.cashRegisterId,
    clientId: saleData.clientId,
    clientName: saleData.clientName || 'Cliente Geral',
    items: saleData.items,
    subtotal,
    discount: saleData.discount,
    total,
    paymentMethod: saleData.paymentMethod,
    status: 'completed',
    sellerId: saleData.sellerId,
    sellerName: saleData.sellerName,
    createdAt: new Date().toISOString()
  };

  await cloudDbSet(`tenants/${tenantId}/sales/${id}`, sale);

  // Update register totals if attached to a register
  if (saleData.cashRegisterId) {
    const registers = await cloudDbList<CashRegister>(`tenants/${tenantId}/cashRegisters`);
    const reg = registers.find(r => r.id === saleData.cashRegisterId);
    if (reg) {
      if (saleData.paymentMethod === 'cash') {
        reg.totalSalesCash += total;
        reg.currentAmount += total;
      } else if (saleData.paymentMethod === 'card') {
        reg.totalSalesCard += total;
      } else {
        reg.totalSalesOther += total;
      }
      reg.expectedClosingAmount = reg.currentAmount;
      await cloudDbSet(`tenants/${tenantId}/cashRegisters/${saleData.cashRegisterId}`, reg);
    }
  }

  // Deduct stock for product items
  for (const item of saleData.items) {
    if (item.type === 'product') {
      try {
        const products = await fetchProducts(tenantId);
        const currentProd = products.find(p => p.id === item.itemId);
        if (currentProd) {
          const currentStock = currentProd.stock || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          await recordStockMove(tenantId, {
            productId: item.itemId,
            productName: item.name,
            type: 'sale',
            quantity: item.quantity,
            previousStock: currentStock,
            newStock,
            reason: `Venda #${id.slice(0, 8)}`,
            performedBy: saleData.sellerName
          });
        }
      } catch (stkErr) {
        console.warn("Could not update product stock during sale:", stkErr);
      }
    }
  }

  return sale;
}

export function subscribeSales(rawTenantId: string, callback: (sales: Sale[]) => void): () => void {
  const tenantId = normalizeTenantId(rawTenantId);
  return cloudDbSubscribe<Sale>(`tenants/${tenantId}/sales`, (items) => {
    callback(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });
}
