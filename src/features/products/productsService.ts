import { Product, StockMove } from '../../types';
import { BUSINESS_TYPES } from '../../utils/businessTypes';
import { 
  cloudDbList, 
  cloudDbSet, 
  cloudDbDelete, 
  cloudDbSubscribe, 
  normalizeTenantId 
} from '../../services/cloudDb';

export async function fetchProducts(rawTenantId: string): Promise<Product[]> {
  const tenantId = normalizeTenantId(rawTenantId);

  // 1. Fetch deleted product IDs from cloud database
  const deletedCloudList = await cloudDbList<{ id: string }>(`tenants/${tenantId}/deletedProducts`);
  const deletedIds = deletedCloudList.map(d => d.id);

  // Also check local storage deleted list
  if (typeof window !== 'undefined') {
    try {
      const localDeleted: string[] = JSON.parse(localStorage.getItem(`glowfy_deleted_products_${tenantId}`) || '[]');
      localDeleted.forEach(id => {
        if (!deletedIds.includes(id)) deletedIds.push(id);
      });
    } catch {}
  }

  // 2. Fetch products from Cloud Database
  const cloudProducts = await cloudDbList<Product>(`tenants/${tenantId}/products`);
  
  if (cloudProducts && cloudProducts.length > 0) {
    const filtered = cloudProducts.filter(p => !deletedIds.includes(p.id));
    if (filtered.length > 0 || deletedIds.length > 0) {
      return filtered;
    }
  }

  // 3. Auto-seed initial default products to Cloud Database if never populated
  if (deletedIds.length === 0) {
    const meta = BUSINESS_TYPES['barbershop'];
    const defaults: Product[] = (meta.defaultProducts || []).map((prod, idx) => ({
      id: `prod_${idx + 1}`,
      tenantId,
      name: prod.name,
      sku: prod.sku,
      price: Number(prod.price) || 0,
      costPrice: Number(prod.costPrice) || 0,
      stock: Number(prod.stock) || 0,
      minStock: Number(prod.minStock) || 5,
      categoryName: prod.categoryName || 'Geral',
      description: prod.description || '',
      imageUrl: ''
    }));

    // Save defaults to Cloud Database so all browsers and devices immediately share them
    for (const item of defaults) {
      cloudDbSet(`tenants/${tenantId}/products/${item.id}`, item).catch(() => {});
    }

    return defaults;
  }

  return [];
}

export async function fetchStockMoves(rawTenantId: string): Promise<StockMove[]> {
  const tenantId = normalizeTenantId(rawTenantId);
  const moves = await cloudDbList<StockMove>(`tenants/${tenantId}/stockMoves`);
  return moves.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveProduct(
  rawTenantId: string, 
  product: Partial<Product>, 
  userEmail: string
): Promise<Product> {
  const tenantId = normalizeTenantId(rawTenantId);
  const isNew = !product.id;
  const id = product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const fullProduct: Product = {
    id,
    tenantId,
    name: product.name || 'Novo Produto',
    description: product.description || '',
    imageUrl: product.imageUrl || '',
    sku: product.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    price: Number(product.price) || 0,
    costPrice: Number(product.costPrice) || 0,
    stock: Number(product.stock) || 0,
    minStock: Number(product.minStock) || 5,
    categoryName: product.categoryName || 'Geral'
  };

  // Remove from deleted list if re-adding
  try {
    cloudDbDelete(`tenants/${tenantId}/deletedProducts/${id}`).catch(() => {});
    if (typeof window !== 'undefined') {
      const deletedKey = `glowfy_deleted_products_${tenantId}`;
      const deletedIds: string[] = JSON.parse(localStorage.getItem(deletedKey) || '[]');
      const filtered = deletedIds.filter(dId => dId !== id);
      localStorage.setItem(deletedKey, JSON.stringify(filtered));
    }
  } catch {}

  // Save to Cloud Database
  await cloudDbSet(`tenants/${tenantId}/products/${id}`, fullProduct);

  if (isNew && fullProduct.stock > 0) {
    recordStockMove(tenantId, {
      productId: id,
      productName: fullProduct.name,
      type: 'in',
      quantity: fullProduct.stock,
      previousStock: 0,
      newStock: fullProduct.stock,
      reason: 'Estoque Inicial Cadastro',
      performedBy: userEmail
    }).catch(() => {});
  }

  return fullProduct;
}

export async function recordStockMove(
  rawTenantId: string, 
  move: {
    productId: string;
    productName: string;
    type: 'in' | 'out' | 'adjustment' | 'sale';
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    performedBy: string;
  }
): Promise<StockMove> {
  const tenantId = normalizeTenantId(rawTenantId);
  const moveId = `move_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const stockMove: StockMove = {
    id: moveId,
    tenantId,
    ...move,
    createdAt: new Date().toISOString()
  };

  await cloudDbSet(`tenants/${tenantId}/stockMoves/${moveId}`, stockMove);

  // Update product stock in Cloud Database
  const products = await cloudDbList<Product>(`tenants/${tenantId}/products`);
  const existingProd = products.find(p => p.id === move.productId);
  if (existingProd) {
    existingProd.stock = move.newStock;
    await cloudDbSet(`tenants/${tenantId}/products/${move.productId}`, existingProd);
  }

  return stockMove;
}

export async function deleteProduct(rawTenantId: string, productId: string): Promise<boolean> {
  const tenantId = normalizeTenantId(rawTenantId);

  // 1. Delete from Cloud Database
  await cloudDbDelete(`tenants/${tenantId}/products/${productId}`);

  // 2. Add to deleted IDs in Cloud Database so other browsers know it was permanently removed
  await cloudDbSet(`tenants/${tenantId}/deletedProducts/${productId}`, { id: productId, deletedAt: new Date().toISOString() });

  if (typeof window !== 'undefined') {
    try {
      const deletedKey = `glowfy_deleted_products_${tenantId}`;
      const list: string[] = JSON.parse(localStorage.getItem(deletedKey) || '[]');
      if (!list.includes(productId)) {
        list.push(productId);
        localStorage.setItem(deletedKey, JSON.stringify(list));
      }
    } catch {}
  }

  return true;
}

export function subscribeProducts(rawTenantId: string, callback: (products: Product[]) => void): () => void {
  const tenantId = normalizeTenantId(rawTenantId);
  return cloudDbSubscribe<Product>(`tenants/${tenantId}/products`, (items) => {
    callback(items);
  });
}
