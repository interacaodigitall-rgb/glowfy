import { boolean, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (for Firebase Auth syncing & app users)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('owner'),
  tenantId: text('tenant_id'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tenants (Businesses / White-Label Salons / Barbershops)
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(), // tenantId / slug
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  businessType: text('business_type').default('barbershop'),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  heroImageUrl: text('hero_image_url'),
  storyImageUrl: text('story_image_url'),
  galleryImages: jsonb('gallery_images').$type<string[]>(),
  primaryColor: text('primary_color').default('#C5A059'),
  secondaryColor: text('secondary_color').default('#111827'),
  phone: text('phone'),
  email: text('email'),
  ownerPassword: text('owner_password'),
  address: text('address'),
  city: text('city'),
  zipCode: text('zip_code'),
  active: boolean('active').default(true),
  plan: text('plan').default('pro'),
  modulesEnabled: jsonb('modules_enabled').$type<Record<string, boolean>>(),
  workingHours: jsonb('working_hours').$type<Record<string, any>>(),
  blockedDates: jsonb('blocked_dates').$type<string[]>(),
  blockedTimes: jsonb('blocked_times').$type<any[]>(),
  businessHistory: text('business_history'),
  loyaltyProgram: jsonb('loyalty_program').$type<Record<string, any>>(),
  createdAt: text('created_at').default(''),
});

// Tenant Members / Staff Team
export const members = pgTable('members', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  role: text('role').default('receptionist'),
  permissions: jsonb('permissions').$type<string[]>(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  joinedAt: text('joined_at'),
  active: boolean('active').default(true),
});

// Service Categories
export const serviceCategories = pgTable('service_categories', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  order: integer('order').default(0),
  color: text('color'),
});

// Services
export const services = pgTable('services', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  categoryId: text('category_id'),
  categoryName: text('category_name'),
  name: text('name').notNull(),
  description: text('description'),
  price: doublePrecision('price').notNull().default(0),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  commissionPercentage: doublePrecision('commission_percentage').default(0),
  active: boolean('active').default(true),
  imageUrl: text('image_url'),
});

// Professionals / Specialists
export const professionals = pgTable('professionals', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  memberUid: text('member_uid'),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  specialties: jsonb('specialties').$type<string[]>(),
  commissionRate: doublePrecision('commission_rate').default(0),
  workingHours: jsonb('working_hours').$type<Record<string, any>>(),
  active: boolean('active').default(true),
  roleTitle: text('role_title'),
  rating: doublePrecision('rating').default(5.0),
  totalReviews: integer('total_reviews').default(0),
});

// Clients
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  notes: text('notes'),
  birthDate: text('birth_date'),
  totalSpent: doublePrecision('total_spent').default(0),
  appointmentsCount: integer('appointments_count').default(0),
  loyaltyPoints: integer('loyalty_points').default(0),
  createdAt: text('created_at').default(''),
});

// Appointments / Bookings
export const appointments = pgTable('appointments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  serviceId: text('service_id').notNull(),
  serviceName: text('service_name').notNull(),
  professionalId: text('professional_id').notNull(),
  professionalName: text('professional_name').notNull(),
  clientId: text('client_id').notNull(),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone').notNull(),
  clientEmail: text('client_email'),
  startAt: text('start_at').notNull(),
  endAt: text('end_at').notNull(),
  durationMinutes: integer('duration_minutes').default(30),
  price: doublePrecision('price').notNull().default(0),
  commissionAmount: doublePrecision('commission_amount').default(0),
  status: text('status').notNull().default('confirmed'),
  notes: text('notes'),
  createdAt: text('created_at').default(''),
});

// Product Categories
export const productCategories = pgTable('product_categories', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
});

// Products / Inventory
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  categoryId: text('category_id'),
  categoryName: text('category_name'),
  category: text('category'),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  sku: text('sku').default(''),
  price: doublePrecision('price').notNull().default(0),
  costPrice: doublePrecision('cost_price').default(0),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').default(5),
  barcode: text('barcode'),
});

// Stock Movements
export const stockMoves = pgTable('stock_moves', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  reason: text('reason'),
  performedBy: text('performed_by'),
  createdAt: text('created_at').default(''),
});

// Sales / POS Transactions
export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  cashRegisterId: text('cash_register_id'),
  clientId: text('client_id'),
  clientName: text('client_name'),
  items: jsonb('items').$type<any[]>(),
  subtotal: doublePrecision('subtotal').notNull().default(0),
  discount: doublePrecision('discount').default(0),
  total: doublePrecision('total').notNull().default(0),
  paymentMethod: text('payment_method').notNull().default('cash'),
  status: text('status').notNull().default('completed'),
  sellerId: text('seller_id'),
  sellerName: text('seller_name'),
  createdAt: text('created_at').default(''),
});

// Cash Registers
export const cashRegisters = pgTable('cash_registers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  openedBy: text('opened_by').notNull(),
  openedByName: text('opened_by_name').notNull(),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  closedBy: text('closed_by'),
  closedByName: text('closed_by_name'),
  initialAmount: doublePrecision('initial_amount').notNull().default(0),
  currentAmount: doublePrecision('current_amount').notNull().default(0),
  totalSalesCash: doublePrecision('total_sales_cash').default(0),
  totalSalesCard: doublePrecision('total_sales_card').default(0),
  totalSalesOther: doublePrecision('total_sales_other').default(0),
  totalIn: doublePrecision('total_in').default(0),
  totalOut: doublePrecision('total_out').default(0),
  expectedClosingAmount: doublePrecision('expected_closing_amount').default(0),
  actualClosingAmount: doublePrecision('actual_closing_amount'),
  closingNote: text('closing_note'),
  status: text('status').notNull().default('open'),
});

// Cash Transactions
export const cashTransactions = pgTable('cash_transactions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  cashRegisterId: text('cash_register_id').notNull(),
  type: text('type').notNull(),
  amount: doublePrecision('amount').notNull().default(0),
  description: text('description').notNull(),
  performedBy: text('performed_by'),
  performedByName: text('performed_by_name'),
  createdAt: text('created_at').default(''),
});

// Notifications
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  professionalId: text('professional_id'),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').default(false),
  appointmentId: text('appointment_id'),
  createdAt: text('created_at').default(''),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id'),
  userName: text('user_name'),
  action: text('action').notNull(),
  module: text('module').notNull(),
  details: text('details'),
  createdAt: text('created_at').default(''),
});
