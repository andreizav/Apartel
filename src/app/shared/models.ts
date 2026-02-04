/**
 * Shared domain models / DTOs for Apartel PMS.
 * Use these types for API contracts when connecting to a backend.
 */

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'alert';
  /** Optional payload for notification handlers (action, date, unitId, pendingClient, phone, etc.). */
  data?: Record<string, unknown>;
}

export interface Tenant {
  id: string;
  name: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  status: 'Active' | 'Past_Due';
  maxUnits: number;
  features: {
    staffBot: boolean;
    multiCalendar: boolean;
    reports: boolean;
  };
}

export interface PropertyUnit {
  id: string;
  name: string;
  internalName: string;
  officialAddress: string;
  basePrice: number;
  cleaningFee: number;
  wifiSsid: string;
  wifiPassword: string;
  accessCodes: string;
  status: 'Active' | 'Maintenance';
  assignedCleanerId?: string;
  photos: string[];
}

export interface PropertyGroup {
  id: string;
  name: string;
  units: PropertyUnit[];
  expanded: boolean;
  isMerge?: boolean;
}

export interface Booking {
  id: string;
  unitId: string;
  guestName: string;
  guestPhone: string;
  startDate: Date;
  endDate: Date;
  source: 'airbnb' | 'booking' | 'expedia' | 'direct' | 'blocked';
  status: 'confirmed' | 'pending' | 'cancelled';
  price?: number;
  createdAt: Date;
  assignedCleanerId?: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'client' | 'staff' | 'bot' | 'agent';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read' | 'sending' | 'failed';
  platform?: 'whatsapp' | 'telegram';
}

export interface Client {
  id: string;
  phoneNumber: string;
  name: string;
  email: string;
  address: string;
  country: string;
  avatar: string;
  platform: 'whatsapp' | 'telegram';
  platformId?: string;
  status: 'New' | 'Replied' | 'Archived';
  lastActive: Date;
  createdAt: Date;
  unreadCount: number;
  online: boolean;
  messages: ChatMessage[];
  previousBookings: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  status: 'Active' | 'Inactive';
  messages: ChatMessage[];
  unreadCount: number;
  online: boolean;
  lastActive: Date;
}

export interface Transaction {
  id: string;
  tenantId?: string;
  date: string;
  property: string;
  category: string;
  subCategory: string;
  description: string;
  amount: number;
  currency: 'UAH' | 'USD' | 'EUR';
  type: 'income' | 'expense';
  unitId?: string;
  bookingId?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  unitId?: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  items: InventoryItem[];
}

export interface ChannelMapping {
  id: string;
  unitId: string;
  unitName: string;
  groupName: string;
  airbnbId: string;
  bookingId: string;
  markup: number;
  isMapped: boolean;
  status: 'Active' | 'Inactive';
}

export interface ICalConnection {
  id: string;
  unitId: string;
  unitName: string;
  importUrl: string;
  exportUrl: string;
  lastSync: string;
}

export interface OtaConfig {
  isEnabled: boolean;
  clientId?: string;
  clientSecret?: string;
  hotelId?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  sharedSecret?: string;
}

export interface AppSettings {
  waStatus: 'connected' | 'disconnected' | 'qr_ready';
  autoDraft: boolean;
  tgBotToken: string;
  tgAdminGroupId: string;
  aiApiKey: string;
  aiSystemPrompt: string;
  ragSensitivity: number;
}
