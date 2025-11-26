// PricingTier type for shared use
export interface PricingTier {
  id: string;
  merchantId?: string;
  serviceType: string;
  baseRate: number;
  negotiatedRate: number;
  discountPercent?: number;
  rateUnit: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  Business?: any;
}
// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MERCHANT' | 'MERCHANT_STAFF' | 'LOGISTICS';
  businessId?: string;
  isVerified: boolean;
  mfaEnabled: boolean;
  profileImage?: string;
  phone?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  businessId?: string;
  iat?: number;
  exp?: number;
}

// Business Types
export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  businessType: string;
  registrationNumber?: string;
  taxId?: string;
  logo?: string;
  website?: string;
  description?: string;
  isVerified: boolean;
  isActive: boolean;
  tier: string;
  createdAt: Date;
  updatedAt: Date;
}

// Product Types
export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  costPrice?: number;
  weight?: number;
  dimensions?: string;
  images: string[];
  tags: string[];
  isActive: boolean;
  stockLevel: number;
  lowStockThreshold: number;
  quantity?: number;
  createdAt: Date;
  updatedAt: Date;
  business?: Business;
}

// Order Types
export interface Order {
  id: string;
  businessId: string;
  customerId: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  billingAddress?: Address;
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
  business?: Business;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: Product;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  landmark?: string;
}

// Shipment Types
export interface Shipment {
  id: string;
  orderId: string;
  warehouseId: string;
  carrierId?: string;
  trackingNumber: string;
  status: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED';
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  shippingCost: number;
  weight?: number;
  dimensions?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  order?: Order;
  warehouse?: Warehouse;
}

// Warehouse Types
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone?: string;
  email?: string;
  managerId?: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Logistics Region Types
export interface LogisticsRegion {
  id: string;
  name: string;
  code: string;
  states: string[];
  shippingRate: number;
  estimatedDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Stock Transfer Types
export interface StockTransfer {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  requestedBy: string;
  approvedBy?: string;
  transferDate?: Date;
  completedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
  fromWarehouse?: Warehouse;
  toWarehouse?: Warehouse;
  requestedByUser?: User;
}

// Stock Allocation Types
export interface StockAllocation {
  id: string;
  warehouseId: string;
  productId: string;
  allocatedQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  lastUpdated: Date;
  warehouse?: Warehouse;
  product?: Product;
}

// Invoice Types
export interface Invoice {
  id: string;
  businessId: string;
  orderId?: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  business?: Business;
  order?: Order;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'ORDER' | 'PAYMENT' | 'SHIPMENT' | 'STOCK' | 'SYSTEM' | 'PROMOTION';
  title: string;
  message: string;
  data?: any;
  linkUrl?: string;
  isRead: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: Date;
  readAt?: Date;
  user?: User;
}

// Settings Types
export interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  user?: User;
}

// Merchant API Key Types
export interface MerchantApiKey {
  id: string;
  businessId: string;
  keyName: string;
  keyHash: string;
  permissions: string[];
  isActive: boolean;
  lastUsed?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  business?: Business;
}

// Dashboard Stats Types
export interface AdminStats {
  totalBusinesses: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyGrowth: number;
  pendingApprovals: number;
  systemAlerts: number;
  platformRevenue: number;
  activeBusinesses: number;
  newUsersThisMonth: number;
  charts?: {
    userGrowth?: any[];
    revenue?: any[];
    sales?: any[];
    systemHealth?: any[];
  };
}

export interface MerchantStats {
  totalProducts: number;
  totalOrders: number;
  monthlyRevenue: number;
  growthRate: number;
  lowStockItems: number;
  pendingShipments: number;
  activeCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
  customerSatisfaction: number;
  returnsRate: number;
  topSellingProducts: TopProduct[];
  charts?: {
    revenue?: any[];
    sales?: any[];
    categories?: any[];
    dailyRevenue?: any[];
    orders?: any[];
  };
}

export interface LogisticsStats {
  activeShipments: number;
  deliveredToday: number;
  pendingPickups: number;
  averageDeliveryTime: number;
  totalDrivers: number;
  regionsServed: number;
  onTimeDeliveryRate: number;
  totalDeliveries: number;
  failedDeliveries: number;
  regionPerformance: RegionPerformance[];
}

export interface StaffStats {
  assignedOrders: number;
  completedToday: number;
  pendingTasks: number;
  productsManaged: number;
  averageProcessingTime: number;
  performanceScore: number;
  tasksCompleted: number;
  errorRate: number;
  activeTasks: number;
  urgentTasks: number;
  completionRate: number;
  averageResponseTime: number;
  teamRating: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sales: number;
  revenue: number;
  growth: string;
  image?: string;
}

export interface RegionPerformance {
  region: string;
  deliveries: number;
  onTimeRate: number;
  avgDeliveryTime: string;
  status: 'excellent' | 'good' | 'needs_improvement';
}

// Chart Data Types
export interface ChartData {
  month?: string;
  week?: string;
  day?: string;
  date?: string;
  sales?: number;
  orders?: number;
  revenue?: number;
  users?: number;
  businesses?: number;
  deliveries?: number;
  onTime?: number;
  delayed?: number;
  [key: string]: any;
}

export interface CategoryData {
  name: string;
  value: number;
  amount: number;
  color: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Filter and Search Types
export interface OrderFilter {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  businessId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  businessId?: string;
}

export interface UserFilter {
  role?: string;
  isVerified?: boolean;
  businessId?: string;
  isActive?: boolean;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName?: string;
  businessType?: string;
}

export interface ProductForm {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  costPrice?: number;
  weight?: number;
  dimensions?: string;
  images: File[];
  tags: string[];
  stockLevel: number;
  lowStockThreshold: number;
}

export interface OrderForm {
  customerId: string;
  items: OrderItemForm[];
  shippingAddress: Address;
  billingAddress?: Address;
  notes?: string;
}

export interface OrderItemForm {
  productId: string;
  quantity: number;
  unitPrice: number;
}

// Component Props Types
export interface TableColumn<T> {
  key: keyof T;
  title: string;
  render?: (value: any, record: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
}

// Utility Types
export type Role = 'ADMIN' | 'MERCHANT' | 'MERCHANT_STAFF' | 'LOGISTICS';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type ShipmentStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED';
export type NotificationType = 'ORDER' | 'PAYMENT' | 'SHIPMENT' | 'STOCK' | 'SYSTEM' | 'PROMOTION';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

// Time Range Types
export type TimeRange = '7d' | '30d' | '90d' | '1y';

// Export utility functions type
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  filename?: string;
  fields?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}