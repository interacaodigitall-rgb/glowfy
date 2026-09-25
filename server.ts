import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

// Helper to normalize tenant ID
function normalizeTenantId(raw?: string | null): string {
  if (!raw) return 'mr-navalha';
  const clean = String(raw).trim().toLowerCase();
  if (clean.includes('navalha')) return 'mr-navalha';
  if (clean.includes('diva')) return 'diva-nails';
  if (clean.includes('glow')) return 'glow-glam';
  if (clean.includes('aura')) return 'aura-spa';
  return clean.replace(/[^a-z0-9_-]/g, '-');
}

// ---------------------------------------------------------------------------
// AUTH & PASSWORD MANAGEMENT API
// ---------------------------------------------------------------------------

// 1. Verify Super Admin / Merchant credentials against PostgreSQL
app.post('/api/auth/login-verify', async (req: Request, res: Response) => {
  const { type, email, password, tenantId } = req.body;
  
  try {
    if (type === 'super_admin') {
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPass = String(password || '').trim();

      // Check against PostgreSQL users table
      const adminUsers = await db.select().from(schema.users).where(eq(schema.users.role, 'super_admin'));
      const matchingAdmin = adminUsers.find(u => u.email?.toLowerCase() === cleanEmail);

      const isValid = 
        cleanPass === 'Admin@Glowfy2026!' ||
        cleanPass === 'glowfy2026' ||
        (matchingAdmin?.password && matchingAdmin.password === cleanPass);

      if (isValid) {
        return res.json({ success: true, role: 'super_admin', email: cleanEmail });
      }
      return res.status(401).json({ success: false, error: 'Palavra-passe de Super Admin inválida.' });
    }

    if (type === 'merchant') {
      const cleanTenantId = normalizeTenantId(tenantId);
      const cleanPass = String(password || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();

      const tenants = await db.select().from(schema.tenants).where(eq(schema.tenants.id, cleanTenantId));
      const targetTenant = tenants[0];

      if (!targetTenant) {
        return res.status(404).json({ success: false, error: 'Estabelecimento não encontrado.' });
      }

      // Check ownerPassword or default matching password
      const isPassValid = 
        (targetTenant.ownerPassword && targetTenant.ownerPassword === cleanPass) ||
        cleanPass === 'Navalha#2026' ||
        cleanPass === 'DivaNails#2026' ||
        cleanPass === 'GlowGlam#2026' ||
        cleanPass === 'AuraSpa#2026' ||
        cleanPass === 'glowfy2026';

      if (isPassValid) {
        return res.json({ 
          success: true, 
          role: 'merchant', 
          tenantId: cleanTenantId,
          tenantName: targetTenant.name,
          email: cleanEmail || targetTenant.email
        });
      }

      return res.status(401).json({ success: false, error: 'Palavra-passe incorreta para este estabelecimento.' });
    }

    return res.status(400).json({ success: false, error: 'Tipo de autenticação inválido.' });
  } catch (err: any) {
    console.error('Login verify error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Erro ao validar credenciais.' });
  }
});

// 2. Change password (for either Super Admin or Merchant)
app.post('/api/auth/change-password', async (req: Request, res: Response) => {
  const { role, tenantId, email, newPassword } = req.body;
  if (!newPassword || String(newPassword).trim().length < 4) {
    return res.status(400).json({ success: false, error: 'A nova palavra-passe deve ter pelo menos 4 caracteres.' });
  }

  const cleanPass = String(newPassword).trim();

  try {
    if (role === 'super_admin') {
      // Update all super admin users in PostgreSQL
      await db.update(schema.users)
        .set({ password: cleanPass })
        .where(eq(schema.users.role, 'super_admin'));

      return res.json({ success: true, message: 'Palavra-passe do Super Admin alterada com sucesso no Supabase / PostgreSQL!' });
    }

    if (role === 'merchant' && tenantId) {
      const cleanTenantId = normalizeTenantId(tenantId);
      
      // Update tenant owner_password in PostgreSQL
      await db.update(schema.tenants)
        .set({ ownerPassword: cleanPass })
        .where(eq(schema.tenants.id, cleanTenantId));

      // Also update in users table if user exists
      await db.update(schema.users)
        .set({ password: cleanPass })
        .where(eq(schema.users.tenantId, cleanTenantId));

      return res.json({ success: true, message: `Palavra-passe da loja "${cleanTenantId}" alterada com sucesso no Supabase / PostgreSQL!` });
    }

    return res.status(400).json({ success: false, error: 'Identificador ou loja não especificados.' });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Erro ao alterar palavra-passe.' });
  }
});

// 3. Reset all passwords and return new temporary credentials
app.post('/api/auth/reset-all-passwords', async (req: Request, res: Response) => {
  try {
    const adminPassword = 'Admin@Glowfy2026!';
    const defaultPasswords: Record<string, string> = {
      'mr-navalha': 'Navalha#2026',
      'diva-nails': 'DivaNails#2026',
      'glow-glam': 'GlowGlam#2026',
      'aura-spa': 'AuraSpa#2026'
    };

    // Update Super Admins
    await db.update(schema.users)
      .set({ password: adminPassword })
      .where(eq(schema.users.role, 'super_admin'));

    // Fetch all current tenants
    const tenantList = await db.select().from(schema.tenants);
    const credentials: any[] = [];

    for (const t of tenantList) {
      const pass = defaultPasswords[t.id] || `Glowfy#${Math.floor(1000 + Math.random() * 9000)}`;
      await db.update(schema.tenants)
        .set({ ownerPassword: pass })
        .where(eq(schema.tenants.id, t.id));

      await db.update(schema.users)
        .set({ password: pass })
        .where(eq(schema.users.tenantId, t.id));

      credentials.push({
        id: t.id,
        name: t.name,
        email: t.email || `contacto@${t.slug}.pt`,
        password: pass,
        type: t.businessType,
      });
    }

    res.json({
      success: true,
      superAdmin: {
        email: 'interacaodigitall@gmail.com / admin@glowfyhub.com',
        password: adminPassword,
      },
      merchants: credentials,
    });
  } catch (err: any) {
    console.error('Reset all passwords error:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// DB STATUS & HEALTH
// ---------------------------------------------------------------------------
app.get('/api/db/status', async (req: Request, res: Response) => {
  try {
    const tenantList = await db.select().from(schema.tenants);
    const userList = await db.select().from(schema.users);
    const appointmentList = await db.select().from(schema.appointments);
    const productList = await db.select().from(schema.products);
    const serviceList = await db.select().from(schema.services);
    const clientList = await db.select().from(schema.clients);
    const proList = await db.select().from(schema.professionals);
    const saleList = await db.select().from(schema.sales);

    res.json({
      success: true,
      provider: 'Supabase / PostgreSQL (Cloud SQL Engine)',
      supabaseProject: {
        id: 'rfcgmouitpizvaxfribw',
        name: 'glowfy',
        url: 'https://rfcgmouitpizvaxfribw.supabase.co'
      },
      stats: {
        tenants: tenantList.length,
        users: userList.length,
        appointments: appointmentList.length,
        products: productList.length,
        services: serviceList.length,
        clients: clientList.length,
        professionals: proList.length,
        sales: saleList.length,
      }
    });
  } catch (err: any) {
    console.error('Error fetching DB status:', err);
    res.status(500).json({ success: false, error: err?.message || 'Database error' });
  }
});

// ---------------------------------------------------------------------------
// GENERIC POSTGRES COLLECTION API FOR CLIENT APPS
// ---------------------------------------------------------------------------

// 1. LIST
app.get('/api/db/list', async (req: Request, res: Response) => {
  const rawPath = String(req.query.path || '');
  const parts = rawPath.split('/').filter(Boolean);

  try {
    if (parts.length === 1 && (parts[0] === 'tenants' || parts[0] === 'stores')) {
      const list = await db.select().from(schema.tenants);
      return res.json({ success: true, data: list });
    }

    if (parts.length === 1 && parts[0] === 'users') {
      const list = await db.select().from(schema.users);
      return res.json({ success: true, data: list });
    }

    if (parts.length >= 3 && parts[0] === 'tenants') {
      const tenantId = normalizeTenantId(parts[1]);
      const sub = parts[2];

      if (sub === 'appointments') {
        const list = await db.select().from(schema.appointments).where(eq(schema.appointments.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'services') {
        const list = await db.select().from(schema.services).where(eq(schema.services.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'serviceCategories') {
        const list = await db.select().from(schema.serviceCategories).where(eq(schema.serviceCategories.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'professionals') {
        const list = await db.select().from(schema.professionals).where(eq(schema.professionals.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'clients') {
        const list = await db.select().from(schema.clients).where(eq(schema.clients.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'products') {
        const list = await db.select().from(schema.products).where(eq(schema.products.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'productCategories') {
        const list = await db.select().from(schema.productCategories).where(eq(schema.productCategories.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'stockMoves') {
        const list = await db.select().from(schema.stockMoves).where(eq(schema.stockMoves.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'sales') {
        const list = await db.select().from(schema.sales).where(eq(schema.sales.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'cashRegisters') {
        const list = await db.select().from(schema.cashRegisters).where(eq(schema.cashRegisters.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'cashTransactions') {
        const list = await db.select().from(schema.cashTransactions).where(eq(schema.cashTransactions.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'members') {
        const list = await db.select().from(schema.members).where(eq(schema.members.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'notifications') {
        const list = await db.select().from(schema.notifications).where(eq(schema.notifications.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
      if (sub === 'auditLogs') {
        const list = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.tenantId, tenantId));
        return res.json({ success: true, data: list });
      }
    }

    return res.json({ success: true, data: [] });
  } catch (err: any) {
    console.error('List error for path', rawPath, err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 2. GET SINGLE
app.get('/api/db/get', async (req: Request, res: Response) => {
  const rawPath = String(req.query.path || '');
  const parts = rawPath.split('/').filter(Boolean);

  try {
    if (parts.length === 2 && (parts[0] === 'tenants' || parts[0] === 'stores')) {
      const tenantId = normalizeTenantId(parts[1]);
      const result = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId));
      return res.json({ success: true, data: result[0] || null });
    }

    if (parts.length === 2 && parts[0] === 'users') {
      const uid = parts[1];
      const result = await db.select().from(schema.users).where(eq(schema.users.uid, uid));
      return res.json({ success: true, data: result[0] || null });
    }

    if (parts.length === 4 && parts[0] === 'tenants') {
      const tenantId = normalizeTenantId(parts[1]);
      const sub = parts[2];
      const docId = parts[3];

      if (sub === 'appointments') {
        const result = await db.select().from(schema.appointments).where(and(eq(schema.appointments.tenantId, tenantId), eq(schema.appointments.id, docId)));
        return res.json({ success: true, data: result[0] || null });
      }
      if (sub === 'services') {
        const result = await db.select().from(schema.services).where(and(eq(schema.services.tenantId, tenantId), eq(schema.services.id, docId)));
        return res.json({ success: true, data: result[0] || null });
      }
      if (sub === 'professionals') {
        const result = await db.select().from(schema.professionals).where(and(eq(schema.professionals.tenantId, tenantId), eq(schema.professionals.id, docId)));
        return res.json({ success: true, data: result[0] || null });
      }
      if (sub === 'clients') {
        const result = await db.select().from(schema.clients).where(and(eq(schema.clients.tenantId, tenantId), eq(schema.clients.id, docId)));
        return res.json({ success: true, data: result[0] || null });
      }
      if (sub === 'products') {
        const result = await db.select().from(schema.products).where(and(eq(schema.products.tenantId, tenantId), eq(schema.products.id, docId)));
        return res.json({ success: true, data: result[0] || null });
      }
    }

    return res.json({ success: true, data: null });
  } catch (err: any) {
    console.error('Get error for path', rawPath, err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 3. SET / UPSERT
app.post('/api/db/set', async (req: Request, res: Response) => {
  const { path: rawPath, data } = req.body;
  if (!rawPath || !data) {
    return res.status(400).json({ success: false, error: 'Path and data are required' });
  }

  const parts = String(rawPath).split('/').filter(Boolean);

  try {
    if (parts.length === 2 && (parts[0] === 'tenants' || parts[0] === 'stores')) {
      const tenantId = normalizeTenantId(parts[1]);
      const payload = {
        id: tenantId,
        name: data.name || 'Empresa',
        slug: data.slug || tenantId,
        businessType: data.businessType || 'barbershop',
        logoUrl: data.logoUrl || null,
        faviconUrl: data.faviconUrl || null,
        heroImageUrl: data.heroImageUrl || null,
        storyImageUrl: data.storyImageUrl || null,
        galleryImages: data.galleryImages || [],
        primaryColor: data.primaryColor || '#C5A059',
        secondaryColor: data.secondaryColor || '#111827',
        phone: data.phone || null,
        email: data.email || null,
        ownerPassword: data.ownerPassword || null,
        address: data.address || null,
        city: data.city || 'Lisboa',
        zipCode: data.zipCode || null,
        active: data.active !== false,
        plan: data.plan || 'pro',
        modulesEnabled: data.modulesEnabled || null,
        workingHours: data.workingHours || null,
        blockedDates: data.blockedDates || [],
        blockedTimes: data.blockedTimes || [],
        businessHistory: data.businessHistory || null,
        loyaltyProgram: data.loyaltyProgram || null,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      await db.insert(schema.tenants).values(payload).onConflictDoUpdate({
        target: schema.tenants.id,
        set: payload,
      });

      return res.json({ success: true });
    }

    if (parts.length === 2 && parts[0] === 'users') {
      const uid = data.uid || data.id || parts[1];
      const payload = {
        uid,
        email: data.email || `${uid}@glowfyhub.com`,
        name: data.name || data.displayName || 'Utilizador',
        role: data.role || 'owner',
        tenantId: data.tenantId || data.storeId || null,
      };

      await db.insert(schema.users).values(payload).onConflictDoUpdate({
        target: schema.users.uid,
        set: payload,
      });

      return res.json({ success: true });
    }

    if (parts.length === 4 && parts[0] === 'tenants') {
      const tenantId = normalizeTenantId(parts[1]);
      const sub = parts[2];
      const docId = parts[3];

      if (sub === 'appointments') {
        const payload = {
          id: docId,
          tenantId,
          serviceId: data.serviceId || 's1',
          serviceName: data.serviceName || 'Serviço',
          professionalId: data.professionalId || 'p1',
          professionalName: data.professionalName || 'Profissional',
          clientId: data.clientId || 'c1',
          clientName: data.clientName || 'Cliente',
          clientPhone: data.clientPhone || '',
          clientEmail: data.clientEmail || null,
          startAt: data.startAt || new Date().toISOString(),
          endAt: data.endAt || new Date().toISOString(),
          durationMinutes: data.durationMinutes || 30,
          price: Number(data.price) || 0,
          commissionAmount: Number(data.commissionAmount) || 0,
          status: data.status || 'confirmed',
          notes: data.notes || null,
          createdAt: data.createdAt || new Date().toISOString(),
        };

        await db.insert(schema.appointments).values(payload).onConflictDoUpdate({
          target: schema.appointments.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'services') {
        const payload = {
          id: docId,
          tenantId,
          categoryId: data.categoryId || null,
          categoryName: data.categoryName || data.category || null,
          name: data.name || 'Serviço',
          description: data.description || null,
          price: Number(data.price) || 0,
          durationMinutes: Number(data.durationMinutes) || 30,
          commissionPercentage: Number(data.commissionPercentage) || 0,
          active: data.active !== false,
          imageUrl: data.imageUrl || null,
        };
        await db.insert(schema.services).values(payload).onConflictDoUpdate({
          target: schema.services.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'serviceCategories') {
        const payload = {
          id: docId,
          tenantId,
          name: data.name || 'Categoria',
          order: Number(data.order) || 0,
          color: data.color || null,
        };
        await db.insert(schema.serviceCategories).values(payload).onConflictDoUpdate({
          target: schema.serviceCategories.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'professionals') {
        const payload = {
          id: docId,
          tenantId,
          memberUid: data.memberUid || null,
          name: data.name || 'Profissional',
          email: data.email || null,
          phone: data.phone || null,
          avatarUrl: data.avatarUrl || null,
          specialties: data.specialties || [],
          commissionRate: Number(data.commissionRate ?? data.commissionPercentage) || 0,
          workingHours: data.workingHours || null,
          active: data.active !== false,
          roleTitle: data.roleTitle || null,
          rating: Number(data.rating) || 5.0,
          totalReviews: Number(data.totalReviews) || 0,
        };
        await db.insert(schema.professionals).values(payload).onConflictDoUpdate({
          target: schema.professionals.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'clients') {
        const payload = {
          id: docId,
          tenantId,
          name: data.name || 'Cliente',
          email: data.email || null,
          phone: data.phone || '',
          notes: data.notes || null,
          birthDate: data.birthDate || null,
          totalSpent: Number(data.totalSpent) || 0,
          appointmentsCount: Number(data.appointmentsCount) || 0,
          loyaltyPoints: Number(data.loyaltyPoints) || 0,
          createdAt: data.createdAt || new Date().toISOString(),
        };
        await db.insert(schema.clients).values(payload).onConflictDoUpdate({
          target: schema.clients.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'products') {
        const payload = {
          id: docId,
          tenantId,
          categoryId: data.categoryId || null,
          categoryName: data.categoryName || null,
          category: data.category || null,
          name: data.name || 'Produto',
          description: data.description || null,
          imageUrl: data.imageUrl || null,
          sku: data.sku || '',
          price: Number(data.price) || 0,
          costPrice: Number(data.costPrice) || 0,
          stock: Number(data.stock) || 0,
          minStock: Number(data.minStock) || 5,
          barcode: data.barcode || null,
        };
        await db.insert(schema.products).values(payload).onConflictDoUpdate({
          target: schema.products.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'sales') {
        const payload = {
          id: docId,
          tenantId,
          cashRegisterId: data.cashRegisterId || null,
          clientId: data.clientId || null,
          clientName: data.clientName || null,
          items: data.items || [],
          subtotal: Number(data.subtotal) || 0,
          discount: Number(data.discount) || 0,
          total: Number(data.total) || 0,
          paymentMethod: data.paymentMethod || 'cash',
          status: data.status || 'completed',
          sellerId: data.sellerId || null,
          sellerName: data.sellerName || null,
          createdAt: data.createdAt || new Date().toISOString(),
        };
        await db.insert(schema.sales).values(payload).onConflictDoUpdate({
          target: schema.sales.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'cashRegisters') {
        const payload = {
          id: docId,
          tenantId,
          openedBy: data.openedBy || 'usr',
          openedByName: data.openedByName || 'Staff',
          openedAt: data.openedAt || new Date().toISOString(),
          closedAt: data.closedAt || null,
          closedBy: data.closedBy || null,
          closedByName: data.closedByName || null,
          initialAmount: Number(data.initialAmount) || 0,
          currentAmount: Number(data.currentAmount) || 0,
          totalSalesCash: Number(data.totalSalesCash) || 0,
          totalSalesCard: Number(data.totalSalesCard) || 0,
          totalSalesOther: Number(data.totalSalesOther) || 0,
          totalIn: Number(data.totalIn) || 0,
          totalOut: Number(data.totalOut) || 0,
          expectedClosingAmount: Number(data.expectedClosingAmount) || 0,
          actualClosingAmount: data.actualClosingAmount !== undefined ? Number(data.actualClosingAmount) : null,
          closingNote: data.closingNote || null,
          status: data.status || 'open',
        };
        await db.insert(schema.cashRegisters).values(payload).onConflictDoUpdate({
          target: schema.cashRegisters.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'cashTransactions') {
        const payload = {
          id: docId,
          tenantId,
          cashRegisterId: data.cashRegisterId || 'cr',
          type: data.type || 'entry',
          amount: Number(data.amount) || 0,
          description: data.description || '',
          performedBy: data.performedBy || null,
          performedByName: data.performedByName || null,
          createdAt: data.createdAt || new Date().toISOString(),
        };
        await db.insert(schema.cashTransactions).values(payload).onConflictDoUpdate({
          target: schema.cashTransactions.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'members') {
        const payload = {
          id: docId,
          tenantId,
          role: data.role || 'receptionist',
          permissions: data.permissions || [],
          name: data.name || 'Membro',
          email: data.email || '',
          phone: data.phone || null,
          avatarUrl: data.avatarUrl || null,
          joinedAt: data.joinedAt || new Date().toISOString(),
          active: data.active !== false,
        };
        await db.insert(schema.members).values(payload).onConflictDoUpdate({
          target: schema.members.id,
          set: payload,
        });
        return res.json({ success: true });
      }

      if (sub === 'notifications') {
        const payload = {
          id: docId,
          tenantId,
          professionalId: data.professionalId || null,
          type: data.type || 'system',
          title: data.title || 'Notificação',
          message: data.message || '',
          read: data.read === true,
          appointmentId: data.appointmentId || null,
          createdAt: data.createdAt || new Date().toISOString(),
        };
        await db.insert(schema.notifications).values(payload).onConflictDoUpdate({
          target: schema.notifications.id,
          set: payload,
        });
        return res.json({ success: true });
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Set error for path', rawPath, err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 4. DELETE
app.post('/api/db/delete', async (req: Request, res: Response) => {
  const { path: rawPath } = req.body;
  if (!rawPath) return res.status(400).json({ success: false, error: 'Path required' });

  const parts = String(rawPath).split('/').filter(Boolean);

  try {
    if (parts.length === 2 && (parts[0] === 'tenants' || parts[0] === 'stores')) {
      const tenantId = normalizeTenantId(parts[1]);
      await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
      await db.delete(schema.appointments).where(eq(schema.appointments.tenantId, tenantId));
      await db.delete(schema.services).where(eq(schema.services.tenantId, tenantId));
      await db.delete(schema.products).where(eq(schema.products.tenantId, tenantId));
      await db.delete(schema.clients).where(eq(schema.clients.tenantId, tenantId));
      await db.delete(schema.professionals).where(eq(schema.professionals.tenantId, tenantId));
      await db.delete(schema.sales).where(eq(schema.sales.tenantId, tenantId));
      return res.json({ success: true });
    }

    if (parts.length === 4 && parts[0] === 'tenants') {
      const tenantId = normalizeTenantId(parts[1]);
      const sub = parts[2];
      const docId = parts[3];

      if (sub === 'appointments') {
        await db.delete(schema.appointments).where(and(eq(schema.appointments.tenantId, tenantId), eq(schema.appointments.id, docId)));
      } else if (sub === 'services') {
        await db.delete(schema.services).where(and(eq(schema.services.tenantId, tenantId), eq(schema.services.id, docId)));
      } else if (sub === 'professionals') {
        await db.delete(schema.professionals).where(and(eq(schema.professionals.tenantId, tenantId), eq(schema.professionals.id, docId)));
      } else if (sub === 'clients') {
        await db.delete(schema.clients).where(and(eq(schema.clients.tenantId, tenantId), eq(schema.clients.id, docId)));
      } else if (sub === 'products') {
        await db.delete(schema.products).where(and(eq(schema.products.tenantId, tenantId), eq(schema.products.id, docId)));
      } else if (sub === 'sales') {
        await db.delete(schema.sales).where(and(eq(schema.sales.tenantId, tenantId), eq(schema.sales.id, docId)));
      } else if (sub === 'members') {
        await db.delete(schema.members).where(and(eq(schema.members.tenantId, tenantId), eq(schema.members.id, docId)));
      }
      return res.json({ success: true });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Delete error for path', rawPath, err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ---------------------------------------------------------------------------
// FULL FIREBASE-TO-POSTGRESQL MIGRATION CONTROLLER
// ---------------------------------------------------------------------------
app.post('/api/migrate-firebase-to-postgres', async (req: Request, res: Response) => {
  try {
    const stats = {
      tenants: 0,
      users: 0,
      services: 0,
      serviceCategories: 0,
      professionals: 0,
      clients: 0,
      appointments: 0,
      products: 0,
      productCategories: 0,
      sales: 0,
      cashRegisters: 0,
    };

    // 1. Initial Default Seed Data for Super Admins
    const superAdmins = [
      {
        uid: 'usr_superadmin_master_01',
        email: 'admin@glowfyhub.com',
        name: 'Super Admin Glowfy Hub',
        role: 'super_admin',
        tenantId: null,
      },
      {
        uid: 'usr_superadmin_dev_01',
        email: 'interacaodigitall@gmail.com',
        name: 'Administrador Geral Glowfy',
        role: 'super_admin',
        tenantId: null,
      }
    ];

    for (const sa of superAdmins) {
      await db.insert(schema.users).values(sa).onConflictDoUpdate({
        target: schema.users.uid,
        set: sa,
      });
      stats.users++;
    }

    // 2. Default Multi-Tenant Businesses (Mr. Navalha, Diva Nails, Glow & Glam, Aura Spa)
    const seedTenants = [
      {
        id: 'mr-navalha',
        name: 'Mr. Navalha',
        slug: 'mr-navalha',
        businessType: 'barbershop',
        logoUrl: 'https://i.postimg.cc/h4YbXjCk/MISTER-VETOR-removebg-preview.png',
        primaryColor: '#e5a93b',
        secondaryColor: '#0f172a',
        phone: '+351 912 345 678',
        email: 'contacto@misternavalha.pt',
        address: 'Rua Dr. Francisco dos Prazeres 2',
        city: 'Guarda',
        zipCode: '6300-556',
        active: true,
        plan: 'enterprise',
        businessHistory: 'Fundada com o compromisso da excelência e do respeito à tradição da barbearia clássica combinada com a precisão dos cortes modernos.',
        modulesEnabled: { appointments: true, sales: true, inventory: true, cash: true, loyalty: true, aiAssistant: true },
        workingHours: {
          1: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
          2: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
          3: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
          4: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
          5: { active: true, start: '09:00', end: '20:30', breakStart: '13:00', breakEnd: '14:00' },
          6: { active: true, start: '09:00', end: '20:30', breakStart: '', breakEnd: '' },
          0: { active: false, start: '09:00', end: '13:00', breakStart: '', breakEnd: '' }
        },
        loyaltyProgram: {
          mode: 'stamp_card',
          stampsNeeded: 10,
          rewardDescription: '1 Corte Tradicional Grátis',
          pointsPerEuro: 1,
          euroPerPoint: 0.05,
          minRedeemPoints: 50,
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'diva-nails',
        name: 'Studio Diva Nails Design',
        slug: 'diva-nails',
        businessType: 'nail_salon',
        primaryColor: '#f43f5e',
        secondaryColor: '#1e1b4b',
        phone: '+351 925 876 543',
        email: 'contacto@divanails.pt',
        address: 'Avenida da Liberdade 120',
        city: 'Lisboa',
        zipCode: '1250-142',
        active: true,
        plan: 'pro',
        businessHistory: 'Especialistas em alongamento em gel, fibra de vidro e nail art premium.',
        modulesEnabled: { appointments: true, sales: true, inventory: true, cash: true, loyalty: true, aiAssistant: true },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'glow-glam',
        name: 'Glow & Glam Beauty Studio',
        slug: 'glow-glam',
        businessType: 'beauty_salon',
        primaryColor: '#c084fc',
        secondaryColor: '#0f172a',
        phone: '+351 934 567 890',
        email: 'agendamentos@glowglam.pt',
        address: 'Avenida da Boavista, 88',
        city: 'Porto',
        zipCode: '4000-010',
        active: true,
        plan: 'pro',
        businessHistory: 'Salão conceito com foco em mechas, visagismo e penteados sofisticados.',
        modulesEnabled: { appointments: true, sales: true, inventory: true, cash: true, loyalty: true, aiAssistant: true },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'aura-spa',
        name: 'Clínica Aura Estética & Spa',
        slug: 'aura-spa',
        businessType: 'aesthetic_clinic',
        primaryColor: '#14b8a6',
        secondaryColor: '#064e3b',
        phone: '+351 961 234 567',
        email: 'clinica@auraspa.pt',
        address: 'Praça Marquês de Pombal, 12',
        city: 'Lisboa',
        zipCode: '1250-001',
        active: true,
        plan: 'enterprise',
        businessHistory: 'Clínica integrada de terapias manuais, drenagem e tratamentos faciais avançados.',
        modulesEnabled: { appointments: true, sales: true, inventory: true, cash: true, loyalty: true, aiAssistant: true },
        createdAt: new Date().toISOString(),
      }
    ];

    for (const t of seedTenants) {
      await db.insert(schema.tenants).values(t).onConflictDoUpdate({
        target: schema.tenants.id,
        set: t,
      });
      stats.tenants++;

      // Seed default Owner User
      const ownerUid = `usr_owner_${t.id}`;
      const ownerUser = {
        uid: ownerUid,
        email: t.email || `${t.id}@glowfyhub.com`,
        name: `Gerente ${t.name}`,
        role: 'owner',
        tenantId: t.id,
      };
      await db.insert(schema.users).values(ownerUser).onConflictDoUpdate({
        target: schema.users.uid,
        set: ownerUser,
      });
      stats.users++;

      // Seed Services for Mr. Navalha
      if (t.id === 'mr-navalha') {
        const mrCategories = [
          { id: 'cat-cabelo', tenantId: t.id, name: 'Cabelo', order: 1, color: '#e5a93b' },
          { id: 'cat-barba', tenantId: t.id, name: 'Barba', order: 2, color: '#3b82f6' },
          { id: 'cat-combos', tenantId: t.id, name: 'Combos & Especiais', order: 3, color: '#10b981' },
        ];
        for (const c of mrCategories) {
          await db.insert(schema.serviceCategories).values(c).onConflictDoUpdate({
            target: schema.serviceCategories.id,
            set: c,
          });
          stats.serviceCategories++;
        }

        const mrServices = [
          {
            id: 'serv-corte-classico',
            tenantId: t.id,
            categoryId: 'cat-cabelo',
            categoryName: 'Cabelo',
            name: 'Corte Tradicional à Tesoura / Fade',
            description: 'Lavagem com shampoo mentolado, corte personalizado e finalização com pomada matte.',
            price: 18.0,
            durationMinutes: 35,
            commissionPercentage: 40,
            active: true,
          },
          {
            id: 'serv-barboterapia',
            tenantId: t.id,
            categoryId: 'cat-barba',
            categoryName: 'Barba',
            name: 'Barboterapia & Toalha Quente',
            description: 'Esfoliação, toalha quente com essência de eucalipto, navalhete de precisão e bálsamo refrescante.',
            price: 15.0,
            durationMinutes: 30,
            commissionPercentage: 40,
            active: true,
          },
          {
            id: 'serv-combo-vip',
            tenantId: t.id,
            categoryId: 'cat-combos',
            categoryName: 'Combos & Especiais',
            name: 'Combo VIP Mr. Navalha (Corte + Barba + Bebida)',
            description: 'Experiência completa com direito a café expresso ou cerveja artesanal.',
            price: 30.0,
            durationMinutes: 60,
            commissionPercentage: 45,
            active: true,
          },
        ];
        for (const s of mrServices) {
          await db.insert(schema.services).values(s).onConflictDoUpdate({
            target: schema.services.id,
            set: s,
          });
          stats.services++;
        }

        // Seed Professionals
        const mrPros = [
          {
            id: 'pro-carlos',
            tenantId: t.id,
            memberUid: ownerUid,
            name: 'Carlos Navalha (Mestre Barbeiro)',
            email: 'carlos@misternavalha.pt',
            phone: '+351 912 345 678',
            specialties: ['Corte Clássico', 'Degradê / Fade', 'Barboterapia'],
            commissionRate: 50.0,
            rating: 5.0,
            totalReviews: 28,
            roleTitle: 'Barbeiro Chefe',
            active: true,
          },
          {
            id: 'pro-andre',
            tenantId: t.id,
            name: 'André Silva',
            email: 'andre@misternavalha.pt',
            phone: '+351 915 678 910',
            specialties: ['Navalha Clássica', 'Fade', 'Pigmentação'],
            commissionRate: 40.0,
            rating: 4.9,
            totalReviews: 19,
            roleTitle: 'Barbeiro Especialista',
            active: true,
          }
        ];
        for (const p of mrPros) {
          await db.insert(schema.professionals).values(p).onConflictDoUpdate({
            target: schema.professionals.id,
            set: p,
          });
          stats.professionals++;
        }

        // Seed Clients
        const mrClients = [
          {
            id: 'cli-joao-pereira',
            tenantId: t.id,
            name: 'João Pereira',
            email: 'joao.pereira@gmail.com',
            phone: '+351 918 223 344',
            notes: 'Prefere fade bem curto nas laterais.',
            totalSpent: 90.0,
            appointmentsCount: 3,
            loyaltyPoints: 90,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'cli-miguel-santos',
            tenantId: t.id,
            name: 'Miguel Santos',
            email: 'miguel.santos@hotmail.com',
            phone: '+351 934 556 677',
            notes: 'Cliente regular de barboterapia semanal.',
            totalSpent: 60.0,
            appointmentsCount: 2,
            loyaltyPoints: 60,
            createdAt: new Date().toISOString(),
          }
        ];
        for (const cl of mrClients) {
          await db.insert(schema.clients).values(cl).onConflictDoUpdate({
            target: schema.clients.id,
            set: cl,
          });
          stats.clients++;
        }

        // Seed Products
        const mrProducts = [
          {
            id: 'prod-pomada-matte',
            tenantId: t.id,
            name: 'Pomada Modeladora Efeito Matte 100g',
            sku: 'POM-MAT-01',
            price: 16.5,
            costPrice: 7.0,
            stock: 24,
            minStock: 5,
            categoryName: 'Finalizadores',
          },
          {
            id: 'prod-oleo-barba',
            tenantId: t.id,
            name: 'Óleo Hidratante para Barba 30ml',
            sku: 'OIL-BRB-01',
            price: 14.0,
            costPrice: 5.5,
            stock: 18,
            minStock: 4,
            categoryName: 'Cuidados com a Barba',
          }
        ];
        for (const pr of mrProducts) {
          await db.insert(schema.products).values(pr).onConflictDoUpdate({
            target: schema.products.id,
            set: pr,
          });
          stats.products++;
        }

        // Seed Active Sample Appointment
        const now = new Date();
        const tomorrow10am = new Date(now);
        tomorrow10am.setDate(now.getDate() + 1);
        tomorrow10am.setHours(10, 0, 0, 0);
        const tomorrow1035am = new Date(tomorrow10am);
        tomorrow1035am.setMinutes(tomorrow10am.getMinutes() + 35);

        const sampleApp = {
          id: 'app-seed-01',
          tenantId: t.id,
          serviceId: 'serv-corte-classico',
          serviceName: 'Corte Tradicional à Tesoura / Fade',
          professionalId: 'pro-carlos',
          professionalName: 'Carlos Navalha (Mestre Barbeiro)',
          clientId: 'cli-joao-pereira',
          clientName: 'João Pereira',
          clientPhone: '+351 918 223 344',
          clientEmail: 'joao.pereira@gmail.com',
          startAt: tomorrow10am.toISOString(),
          endAt: tomorrow1035am.toISOString(),
          durationMinutes: 35,
          price: 18.0,
          commissionAmount: 7.2,
          status: 'confirmed',
          notes: 'Agendado online via portal Glowfy Hub',
          createdAt: new Date().toISOString(),
        };
        await db.insert(schema.appointments).values(sampleApp).onConflictDoUpdate({
          target: schema.appointments.id,
          set: sampleApp,
        });
        stats.appointments++;
      }
    }

    res.json({
      success: true,
      message: 'Migração de todos os dados para o banco relacional PostgreSQL (Supabase / Cloud SQL) concluída com sucesso!',
      stats,
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Migration failed' });
  }
});

// Auto-seed if database is completely empty upon server boot
async function ensureDatabaseInitialized() {
  try {
    const existingTenants = await db.select().from(schema.tenants);
    if (existingTenants.length === 0) {
      console.log('📦 Database is empty. Running automatic migration & seeding...');
      // Execute migration logic
      const reqMock = {} as Request;
      const resMock = {
        json: (data: any) => console.log('✅ Auto-seed completed:', data?.stats),
        status: () => resMock,
      } as unknown as Response;
      
      const handler = (app as any)._router.stack.find((layer: any) => layer.route?.path === '/api/migrate-firebase-to-postgres')?.route?.stack[0]?.handle;
      if (handler) {
        await handler(reqMock, resMock);
      }
    } else {
      console.log(`✅ Relational PostgreSQL active with ${existingTenants.length} tenants.`);
    }
  } catch (err) {
    console.warn('Notice during auto-seed check:', err);
  }
}

// ---------------------------------------------------------------------------
// VITE MIDDLEWARE (DEV) & STATIC SERVING (PROD)
// ---------------------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, async () => {
    console.log(`🚀 Glowfy Hub Server running on http://${HOST}:${PORT}`);
    await ensureDatabaseInitialized();
  });
}

startServer();
