import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AppNotification,
  AppSettings,
  Booking,
  ChannelMapping,
  Client,
  ICalConnection,
  InventoryCategory,
  OtaConfig,
  PropertyGroup,
  PropertyUnit,
  Staff,
  Tenant,
  Transaction,
} from './models';

// Re-export models for backward compatibility
export type {
  AppNotification,
  AppSettings,
  Booking,
  ChannelMapping,
  ChatMessage,
  Client,
  ICalConnection,
  InventoryCategory,
  InventoryItem,
  OtaConfig,
  PropertyGroup,
  PropertyUnit,
  Staff,
  Tenant,
  Transaction,
} from './models';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  // Exchange Rates (Base: USD)
  exchangeRates = signal<Record<string, number>>({
    USD: 1,
    UAH: 41.5,
    EUR: 0.95
  });

  // Tenant State
  tenant = signal<Tenant>({
    id: 't-001',
    name: 'My Properties',
    plan: 'Free',
    status: 'Active',
    maxUnits: 1,
    features: { staffBot: false, multiCalendar: true, reports: false }
  });

  // Auth State
  currentUser = signal<Staff | null>(null);

  // UI State for Upgrade Modal
  showUpgradeModal = signal(false);
  upgradeReason = signal<string>('');

  // Database Logs
  dbLogs = signal<{ time: string, event: string, table: string, detail: string }[]>([]);

  // --- Domain Data Signals ---
  portfolio = signal<PropertyGroup[]>([]);
  bookings = signal<Booking[]>([]);
  transactions = signal<Transaction[]>([]);
  clients = signal<Client[]>([]);
  staff = signal<Staff[]>([]);
  notifications = signal<AppNotification[]>([]);

  // --- Extended Modules Data ---
  inventory = signal<InventoryCategory[]>([]);

  channelMappings = signal<ChannelMapping[]>([]);
  otaConfigs = signal<Record<'airbnb' | 'booking' | 'expedia', OtaConfig>>({
    airbnb: { isEnabled: false },
    booking: { isEnabled: false },
    expedia: { isEnabled: false }
  });
  icalConnections = signal<ICalConnection[]>([]);

  appSettings = signal<AppSettings>({
    waStatus: 'disconnected',
    autoDraft: true,
    tgBotToken: '',
    tgAdminGroupId: '',
    aiApiKey: '',
    aiSystemPrompt: 'You are a helpful property manager.',
    ragSensitivity: 0.7
  });

  private http = inject(HttpClient);

  constructor() { }

  resetData() {
    return this.http.post<{ success: boolean, message: string }>(`${environment.apiUrl}/api/bootstrap/reset`, {}).pipe(
      tap(() => {
        // Reload page or re-fetch bootstrap data
        window.location.reload();
      })
    );
  }

  clearData() {
    return this.http.post<{ success: boolean, message: string }>(`${environment.apiUrl}/api/bootstrap/clear`, {}).pipe(
      tap(() => {
        window.location.reload();
      })
    );
  }

  logout() {
    const user = this.currentUser();
    if (user) {
      this.updateStaff({ ...user, online: false });
      this.logDbEvent('AUTH', 'auth.users', `User logout: ${user.email}`);
    }
    this.currentUser.set(null);
  }

  /** Apply bootstrap payload from API (user, tenant, portfolio, bookings, etc.). Revives date strings. */
  applyBootstrap(data: {
    user?: Staff | null;
    tenant?: Tenant | null;
    portfolio?: PropertyGroup[];
    bookings?: Booking[];
    clients?: Client[];
    staff?: Staff[];
    transactions?: Transaction[];
    inventory?: InventoryCategory[];
    channelMappings?: ChannelMapping[];
    icalConnections?: ICalConnection[];
    otaConfigs?: Record<string, OtaConfig>;
    appSettings?: AppSettings;
  }) {
    if (data.tenant != null) this.tenant.set(this.revive(data.tenant) as Tenant);
    if (data.user != null) this.currentUser.set(this.revive(data.user) as Staff);
    if (data.portfolio != null) this.portfolio.set(this.revive(data.portfolio) as PropertyGroup[]);
    if (data.bookings != null) this.bookings.set(this.revive(data.bookings) as Booking[]);
    if (data.clients != null) this.clients.set(this.revive(data.clients) as Client[]);
    if (data.staff != null) this.staff.set(this.revive(data.staff) as Staff[]);
    if (data.transactions != null) this.transactions.set(this.revive(data.transactions) as Transaction[]);
    if (data.inventory != null) this.inventory.set(this.revive(data.inventory) as InventoryCategory[]);
    if (data.channelMappings != null) this.channelMappings.set(this.revive(data.channelMappings) as ChannelMapping[]);
    if (data.icalConnections != null) this.icalConnections.set(this.revive(data.icalConnections) as ICalConnection[]);
    if (data.otaConfigs != null) {
      this.otaConfigs.update(current => ({
        ...current,
        ...(this.revive(data.otaConfigs) as Record<'airbnb' | 'booking' | 'expedia', OtaConfig>)
      }));
    }
    if (data.appSettings != null) this.appSettings.set(this.revive(data.appSettings) as AppSettings);
  }

  /** Recursively finds date-like strings and turns them into Date objects. */
  revive(obj: unknown): unknown {
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}/.test(obj)) {
      const d = new Date(obj);
      return isNaN(d.getTime()) ? obj : d;
    }
    if (Array.isArray(obj)) return obj.map(o => this.revive(o));
    if (obj && typeof obj === 'object') {
      const o = { ...obj } as Record<string, unknown>;
      for (const k of Object.keys(o)) o[k] = this.revive(o[k]);
      return o;
    }
    return obj;
  }

  // --- Core Actions ---

  logDbEvent(event: string, table: string, detail: string) {
    const newLog = { time: new Date().toLocaleTimeString(), event, table, detail };
    this.dbLogs.update(logs => [newLog, ...logs].slice(0, 50));
  }

  addNotification(notification: AppNotification) {
    this.notifications.update(n => [notification, ...n]);
  }

  dismissNotification(id: string) {
    this.notifications.update(n => n.filter(item => item.id !== id));
  }

  convertAmount(amount: number, from: string, to: string): number {
    const rates = this.exchangeRates();
    const rateSource = rates[from] || 1;
    const rateTarget = rates[to] || 1;
    return amount * (rateTarget / rateSource);
  }

  triggerUpgrade(reason: string) {
    this.upgradeReason.set(reason);
    this.showUpgradeModal.set(true);
  }

  activateProPlan() {
    this.tenant.update(t => ({
      ...t,
      plan: 'Pro',
      maxUnits: 100,
      features: { staffBot: true, multiCalendar: true, reports: true }
    }));
    this.showUpgradeModal.set(false);
    this.addNotification({
      id: `sub-upg-${Date.now()}`,
      title: 'Subscription Upgraded!',
      message: 'You are now on the PRO plan. All features unlocked.',
      type: 'success',
      timestamp: new Date()
    });
    this.logDbEvent('UPDATE', 'public.tenants', 'Plan upgraded to PRO');
  }

  // --- CRUD Operations ---

  createBooking(newBooking: Booking): { success: boolean; error?: string } {
    const start = new Date(newBooking.startDate);
    const end = new Date(newBooking.endDate);

    if (start >= end) {
      return { success: false, error: 'End date must be after check-in date.' };
    }

    const overlaps = this.bookings().some(b => {
      if (b.unitId !== newBooking.unitId) return false;
      if (b.status === 'cancelled') return false;
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return start < bEnd && end > bStart;
    });

    if (overlaps) {
      return { success: false, error: 'Selected dates are unavailable for this unit.' };
    }

    const bookingToSave = { ...newBooking, startDate: start, endDate: end };
    this.bookings.update(curr => [bookingToSave, ...curr]);
    this.logDbEvent('INSERT', 'public.bookings', `ID: ${newBooking.id}`);
    return { success: true };
  }

  updateBooking(updatedBooking: Booking): { success: boolean; error?: string } {
    const start = new Date(updatedBooking.startDate);
    const end = new Date(updatedBooking.endDate);

    if (start >= end) {
      return { success: false, error: 'End date must be after check-in date.' };
    }

    // Check for overlaps (excluding self)
    const overlaps = this.bookings().some(b => {
      if (b.id === updatedBooking.id) return false; // Skip self
      if (b.unitId !== updatedBooking.unitId) return false;
      if (b.status === 'cancelled') return false;
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return start < bEnd && end > bStart;
    });

    if (overlaps) {
      return { success: false, error: 'Selected dates are unavailable for this unit.' };
    }

    this.bookings.update(curr => curr.map(b => b.id === updatedBooking.id ? updatedBooking : b));
    this.logDbEvent('UPDATE', 'public.bookings', `ID: ${updatedBooking.id}`);
    return { success: true };
  }

  addClient(client: Client): boolean {
    if (this.clients().some(c => c.phoneNumber === client.phoneNumber)) return false;
    this.clients.update(l => [client, ...l]);
    this.logDbEvent('INSERT', 'public.clients', client.name);
    return true;
  }

  updateClient(client: Client, originalPhone?: string) {
    this.clients.update(l => l.map(c => c.phoneNumber === (originalPhone || client.phoneNumber) ? client : c));
  }

  deleteClient(phone: string) {
    this.clients.update(l => l.filter(c => c.phoneNumber !== phone));
    this.logDbEvent('DELETE', 'public.clients', phone);
  }

  addStaff(member: Staff) {
    this.staff.update(l => [...l, member]);
    this.logDbEvent('INSERT', 'auth.users', member.email);
  }

  updateStaff(member: Staff) {
    this.staff.update(l => l.map(m => m.id === member.id ? member : m));
  }

  deleteStaff(id: string) {
    this.staff.update(l => l.filter(m => m.id !== id));
    this.logDbEvent('DELETE', 'auth.users', id);
  }

  deleteUnit(unitId: string, tenantData?: Tenant) {
    if (tenantData) {
      this.tenant.set(tenantData);
    }
    this.portfolio.update(groups =>
      groups.map(g => ({
        ...g,
        units: g.units.filter(u => u.id !== unitId)
      })).filter(g => g.units.length > 0 || !g.isMerge)
    );

    // Sync other signals
    this.bookings.update(list => list.filter(b => b.unitId !== unitId));
    this.channelMappings.update(list => list.filter(m => m.unitId !== unitId));
    this.icalConnections.update(list => list.filter(i => i.unitId !== unitId));

    this.logDbEvent('DELETE', 'public.properties', unitId);
  }

  addTransaction(tx: Transaction) {
    this.transactions.update(prev => [tx, ...prev]);
    this.logDbEvent('INSERT', 'public.transactions', `${tx.amount} ${tx.currency}`);
  }

  // --- Synchronization ---

  syncChannels() {
    const currentMappings = this.channelMappings();
    const currentIcals = this.icalConnections();
    const groups = this.portfolio();
    const allUnits: { unit: PropertyUnit, groupName: string }[] = [];

    // Flatten properties
    groups.forEach(g => {
      g.units.forEach(u => allUnits.push({ unit: u, groupName: g.name }));
    });

    const updatedMappings: ChannelMapping[] = [];
    const updatedIcals: ICalConnection[] = [];

    // 1. Sync Loop: Ensure every unit has an entry in Mappings and iCal
    allUnits.forEach(({ unit, groupName }) => {

      // --- Channel Mappings ---
      const existingMap = currentMappings.find(m => m.unitId === unit.id);
      if (existingMap) {
        updatedMappings.push({
          ...existingMap,
          unitName: unit.name,
          groupName: groupName
        });
      } else {
        updatedMappings.push({
          id: `cm-${unit.id}`,
          unitId: unit.id,
          unitName: unit.name,
          groupName: groupName,
          airbnbId: '',
          bookingId: '',
          markup: 0,
          isMapped: false,
          status: 'Inactive'
        });
      }

      // --- iCal Connections ---
      const existingIcal = currentIcals.find(i => i.unitId === unit.id);
      if (existingIcal) {
        updatedIcals.push({
          ...existingIcal,
          unitName: unit.name
        });
      } else {
        updatedIcals.push({
          id: `ical-${unit.id}`,
          unitId: unit.id,
          unitName: unit.name,
          importUrl: '',
          // Generate a fake export URL for the unit
          exportUrl: `https://api.apartel.app/cal/${this.tenant().id}/${unit.id}.ics`,
          lastSync: 'Never'
        });
      }
    });

    // Save synced lists (automatically drops deleted units)
    this.channelMappings.set(updatedMappings);
    this.icalConnections.set(updatedIcals);
    this.logDbEvent('SYNC', 'channels', 'Synchronized properties, mappings, and iCal connections');
  }

  getMockSqlScript(): string {
    const today = new Date().toISOString().split('T')[0];
    return `
BEGIN;
-- Prisma Models mapping
TRUNCATE TABLE Booking CASCADE;
TRUNCATE TABLE Client CASCADE;
TRUNCATE TABLE Transaction CASCADE;
TRUNCATE TABLE Unit CASCADE;
TRUNCATE TABLE InventoryItem CASCADE;
TRUNCATE TABLE ChannelMapping CASCADE;
INSERT INTO Tenant (id, name, plan) VALUES ('t-demo', 'Demo Hospitality', 'Pro');
INSERT INTO Staff (email, role) VALUES ('alice@demo.com', 'Manager'), ('bob@demo.com', 'Cleaner');
INSERT INTO Unit (id, name, basePrice) VALUES ('u1', 'Loft 101', 150), ('u2', 'Loft 102', 160), ('u3', 'Penthouse', 350);
INSERT INTO Booking (unitId, guestName, status, price) VALUES ('u1', 'John Doe', 'confirmed', 450), ('u2', 'Current Guest', 'confirmed', 480);
INSERT INTO Transaction (date, amount, type) VALUES ('${today}', 450, 'income'), ('${today}', 50, 'expense');
INSERT INTO InventoryCategory (name) VALUES ('Toiletries'), ('Linens');
INSERT INTO InventoryItem (name, quantity) VALUES ('Shampoo', 45), ('Soap', 30), ('Towels', 20);
UPDATE Tenant SET waStatus = 'connected' WHERE id = 't-demo';
COMMIT;
`.trim();
  }
}
