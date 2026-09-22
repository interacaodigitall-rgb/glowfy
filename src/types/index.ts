export type BusinessType = 
  | 'barbershop' 
  | 'beauty_salon' 
  | 'nail_salon' 
  | 'aesthetic_clinic' 
  | 'spa' 
  | 'lash_brow' 
  | 'makeup' 
  | 'massage' 
  | 'beauty_professional' 
  | 'other';

export type Role = 'super_admin' | 'owner' | 'manager' | 'receptionist' | 'professional' | 'client';

export type Permission = 
  | 'appointments.read'
  | 'appointments.write'
  | 'appointments.delete'
  | 'sales.create'
  | 'sales.read'
  | 'cash.open'
  | 'cash.close'
  | 'inventory.manage'
  | 'services.manage'
  | 'members.manage'
  | 'reports.read'
  | 'settings.update';

export interface TenantModules {
  appointments: boolean;
  sales: boolean;
  inventory: boolean;
  cash: boolean;
  loyalty: boolean;
  aiAssistant: boolean;
}

export interface TenantProfile {
  id: string; // tenantId
  name: string;
  slug: string;
  businessType: BusinessType;
  logoUrl?: string;
  faviconUrl?: string;
  heroImageUrl?: string;
  storyImageUrl?: string;
  galleryImages?: string[];
  primaryColor: string;
  secondaryColor?: string;
  phone: string;
  email: string;
  ownerPassword?: string;
  address: string;
  city: string;
  zipCode?: string;
  active: boolean;
  createdAt: string;
  plan: 'free_trial' | 'starter' | 'pro' | 'enterprise';
  modulesEnabled: TenantModules;
  filiais?: any[];
  workingHours?: Record<string, { active: boolean; start: string; end: string; breakStart?: string; breakEnd?: string }>;
  blockedDates?: string[];
  blockedTimes?: Array<{ date: string; start: string; end: string; notes?: string }>;
  businessHistory?: string;
  showNativeStoreBadges?: boolean;
  appStoreUrl?: string;
  googlePlayUrl?: string;
  loyaltyProgram?: {
    mode: 'stamp_card' | 'points_cashback';
    stampsNeeded: number;
    rewardDescription: string;
    pointsPerEuro: number;
    euroPerPoint: number;
    minRedeemPoints: number;
  };
}

export interface TenantMember {
  id: string; // uid
  tenantId: string;
  role: Role;
  permissions: Permission[];
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  joinedAt: string;
  active: boolean;
}

export interface ServiceCategory {
  id: string;
  tenantId: string;
  name: string;
  order: number;
  color?: string;
}

export interface Service {
  id: string;
  tenantId: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  commissionPercentage: number;
  active: boolean;
  imageUrl?: string;
}

export interface DayWorkingHours {
  active: boolean;
  start: string; // "09:00"
  end: string;   // "19:00"
  breakStart?: string; // "12:30"
  breakEnd?: string;   // "13:30"
}

export interface Professional {
  id: string;
  tenantId: string;
  memberUid?: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  specialties: string[];
  commissionRate: number; // e.g. 30 = 30%
  workingHours: Record<number, DayWorkingHours>; // 0 = Sun, 1 = Mon ... 6 = Sat
  active: boolean;
  roleTitle?: string;
  rating?: number;
  totalReviews?: number;
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  birthDate?: string;
  totalSpent: number;
  appointmentsCount: number;
  loyaltyPoints: number;
  createdAt: string;
}

export type AppointmentStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'checked_in' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show';

export interface Appointment {
  id: string;
  tenantId: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  startAt: string; // ISO string
  endAt: string;   // ISO string
  durationMinutes?: number;
  price: number;
  commissionAmount: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
}

export interface Product {
  id: string;
  tenantId: string;
  categoryId?: string;
  categoryName?: string;
  category?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sku: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  barcode?: string;
}

export interface StockMove {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment' | 'sale';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  type: 'service' | 'product';
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  professionalId?: string;
  professionalName?: string;
  commissionAmount?: number;
}

export interface Sale {
  id: string;
  tenantId: string;
  cashRegisterId?: string;
  clientId?: string;
  clientName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mbway_pix' | 'loyalty_points';
  status: 'completed' | 'refunded';
  sellerId: string;
  sellerName: string;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  tenantId: string;
  openedBy: string;
  openedByName: string;
  openedAt: string;
  closedAt?: string;
  closedBy?: string;
  closedByName?: string;
  initialAmount: number;
  currentAmount: number;
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesOther: number;
  totalIn: number;
  totalOut: number;
  expectedClosingAmount: number;
  actualClosingAmount?: number;
  closingNote?: string;
  status: 'open' | 'closed';
}

export interface CashTransaction {
  id: string;
  tenantId: string;
  cashRegisterId: string;
  type: 'entry' | 'exit' | 'sale';
  amount: number;
  description: string;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

export interface LoyaltyConfig {
  tenantId: string;
  enabled: boolean;
  pointsPerCurrency: number; // e.g., 1 point per 1$ spent
  currencyPerPoint: number;  // e.g., 100 points = $5 value (0.05 per point)
  minRedeemPoints: number;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  createdAt: string;
}

export interface TenantNotification {
  id: string;
  tenantId: string;
  professionalId?: string;
  type: 'appointment_created' | 'appointment_cancelled' | 'appointment_rescheduled' | 'low_stock' | 'system';
  title: string;
  message: string;
  read: boolean;
  appointmentId?: string;
  createdAt: string;
}
