import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { PortfolioService } from './portfolio.service';
import { AuthTokenService } from './auth-token.service';
import type { Booking, Client, Staff, Transaction, Tenant } from './models';
import type { InventoryCategory } from './models';
import type { AppSettings } from './models';
import type { PropertyGroup, PropertyUnit } from './models';

const base = () => environment.apiUrl.replace(/\/$/, '');

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly portfolio = inject(PortfolioService);
  private readonly tokenService = inject(AuthTokenService);
  private readonly apiUrl = base();

  login(email: string, password?: string): Observable<{ success: boolean; error?: string }> {
    return this.http
      .post<{ token: string; user: Staff; tenant: unknown }>(`${this.apiUrl}/api/auth/login`, { email, password })
      .pipe(
        switchMap((res) => {
          this.tokenService.setToken(res.token);
          return this.http.get<Record<string, unknown>>(`${this.apiUrl}/api/bootstrap`);
        }),
        map((bootstrap) => {
          this.portfolio.applyBootstrap(bootstrap as Parameters<PortfolioService['applyBootstrap']>[0]);
          return { success: true };
        }),
        catchError((err) => of({ success: false, error: err.error?.error || err.message || 'Login failed' }))
      );
  }

  register(orgName: string, email: string): Observable<{ success: boolean; error?: string }> {
    return this.http
      .post<{ token: string; user: Staff; tenant: unknown }>(`${this.apiUrl}/api/auth/register`, { orgName, email })
      .pipe(
        switchMap((res) => {
          this.tokenService.setToken(res.token);
          return this.http.get<Record<string, unknown>>(`${this.apiUrl}/api/bootstrap`);
        }),
        map((bootstrap) => {
          this.portfolio.applyBootstrap(bootstrap as Parameters<PortfolioService['applyBootstrap']>[0]);
          return { success: true };
        }),
        catchError((err) => of({ success: false, error: err.error?.error || err.message || 'Registration failed' }))
      );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/api/auth/logout`, {}).subscribe();
    this.tokenService.clear();
    this.portfolio.logout();
  }

  loadBootstrap(): Observable<void> {
    return this.http.get<Record<string, unknown>>(`${this.apiUrl}/api/bootstrap`).pipe(
      map((bootstrap) => {
        this.portfolio.applyBootstrap(bootstrap as Parameters<PortfolioService['applyBootstrap']>[0]);
      })
    );
  }

  getTenant() {
    return this.portfolio.tenant;
  }

  getPortfolio() {
    return this.portfolio.portfolio;
  }

  getBookings() {
    return this.portfolio.bookings;
  }

  getClients() {
    return this.portfolio.clients;
  }

  getStaff() {
    return this.portfolio.staff;
  }

  getTransactions() {
    return this.portfolio.transactions;
  }

  getInventory() {
    return this.portfolio.inventory;
  }

  getChannelMappings() {
    return this.portfolio.channelMappings;
  }

  getIcalConnections() {
    return this.portfolio.icalConnections;
  }

  getOtaConfigs() {
    return this.portfolio.otaConfigs;
  }

  getAppSettings() {
    return this.portfolio.appSettings;
  }

  createBooking(booking: Booking): Observable<{ success: boolean; error?: string }> {
    return this.http.post<{ success: boolean; booking: Booking }>(`${this.apiUrl}/api/bookings`, booking).pipe(
      map((res) => {
        this.portfolio.bookings.update((b) => [this.portfolio.revive(res.booking) as Booking, ...b]);
        return { success: true };
      }),
      catchError((err) => of({ success: false, error: err.error?.error || 'Failed to create booking' }))
    );
  }

  updateBooking(booking: Booking): Observable<{ success: boolean; error?: string }> {
    return this.http.patch<{ success: boolean; booking: Booking }>(`${this.apiUrl}/api/bookings/${booking.id}`, booking).pipe(
      map((res) => {
        const updated = this.portfolio.revive(res.booking) as Booking;
        this.portfolio.bookings.update((list) => list.map(b => b.id === booking.id ? updated : b));
        return { success: true };
      }),
      catchError((err) => of({ success: false, error: err.error?.error || 'Failed to update booking' }))
    );
  }

  addClient(client: Client): Observable<boolean> {
    return this.http.post<Client>(`${this.apiUrl}/api/clients`, client).pipe(
      map((c) => {
        this.portfolio.clients.update((list) => [this.portfolio.revive(c) as Client, ...list]);
        return true;
      }),
      catchError(() => of(false))
    );
  }

  updateClient(client: Client, originalPhone?: string): void {
    const phone = encodeURIComponent(originalPhone ?? client.phoneNumber);
    this.http.patch<Client>(`${this.apiUrl}/api/clients/${phone}`, client).subscribe((updated) => {
      const revived = this.portfolio.revive(updated) as Client;
      this.portfolio.clients.update((list) =>
        list.map((c) => (c.phoneNumber === (originalPhone ?? client.phoneNumber) ? revived : c))
      );
    });
  }

  deleteClient(phone: string): void {
    this.http.delete(`${this.apiUrl}/api/clients/${encodeURIComponent(phone)}`).subscribe(() => {
      this.portfolio.deleteClient(phone);
    });
  }

  addTransaction(tx: Transaction): void {
    this.http.post<Transaction>(`${this.apiUrl}/api/transactions`, tx).subscribe((created) => {
      this.portfolio.transactions.update((t) => [created, ...t]);
    });
  }

  updatePortfolio(portfolio: PropertyGroup[]): Observable<boolean> {
    return this.http.put<PropertyGroup[]>(`${this.apiUrl}/api/portfolio`, portfolio).pipe(
      map((data) => {
        this.portfolio.portfolio.set(data);
        return true;
      }),
      catchError(() => of(false))
    );
  }

  deleteUnit(unitId: string): void {
    this.http.delete<{ ok: boolean, tenant: Tenant }>(`${this.apiUrl}/api/portfolio/units/${unitId}`).subscribe((res) => {
      this.portfolio.deleteUnit(unitId, res.tenant);
    });
  }

  updateInventory(inventory: InventoryCategory[]): Observable<boolean> {
    return this.http.put<InventoryCategory[]>(`${this.apiUrl}/api/inventory`, inventory).pipe(
      map((data) => {
        this.portfolio.inventory.set(data);
        return true;
      }),
      catchError(() => of(false))
    );
  }

  updateSettings(settings: Partial<AppSettings>): void {
    this.http.put<AppSettings>(`${this.apiUrl}/api/settings`, settings).subscribe((data) => {
      this.portfolio.appSettings.set(data);
      this.portfolio.appSettings.set(data);
    });
  }

  testTelegramNotification(token: string, chatId: string): Observable<{ success: boolean; error?: string }> {
    return this.http.post<{ success: boolean; error?: string }>(`${this.apiUrl}/api/settings/telegram/test`, { token, chatId }).pipe(
      catchError((err) => of({ success: false, error: err.error?.error || 'Failed to test Telegram' }))
    );
  }

  syncTelegram(): Observable<{ success: boolean; count?: number }> {
    return this.http.post<{ success: boolean; count?: number; messages?: any[] }>(`${this.apiUrl}/api/settings/telegram/sync`, {}).pipe(
      map(res => {
        if (res.success && res.messages && res.messages.length > 0) {
          this.loadBootstrap().subscribe();
        }
        return res;
      }),
      catchError(() => of({ success: false }))
    );
  }

  sendMessage(recipientId: string, text: string, platform: string = 'telegram'): Observable<boolean> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/api/messages/send`, { recipientId, text, platform }).pipe(
      map(res => res.success),
      catchError(() => of(false))
    );
  }

  saveLocalMessage(clientPhone: string, text: string, sender: string, platform: string = 'whatsapp'): Observable<boolean> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/api/messages/save`, { clientPhone, text, sender, platform }).pipe(
      map(res => res.success),
      catchError(() => of(false))
    );
  }

  sendFile(recipientId: string, file: File, platform: string = 'telegram', caption: string = ''): Observable<boolean> {
    const formData = new FormData();
    formData.append('recipientId', recipientId);
    formData.append('file', file);
    formData.append('platform', platform);
    if (caption) formData.append('caption', caption);

    return this.http.post<{ success: boolean }>(`${this.apiUrl}/api/messages/send/attachment`, formData).pipe(
      map(res => res.success),
      catchError((err) => {
        console.error('File Upload Error:', err);
        return of(false);
      })
    );
  }

  addStaff(member: Omit<Staff, 'id' | 'tenantId'>): void {
    this.http.post<Staff>(`${this.apiUrl}/api/staff`, member).subscribe((created) => {
      this.portfolio.staff.update((l) => [created, ...l]);
    });
  }

  updateStaff(member: Staff): void {
    this.http.patch<Staff>(`${this.apiUrl}/api/staff/${member.id}`, member).subscribe((updated) => {
      const revived = this.portfolio.revive(updated) as Staff;
      this.portfolio.staff.update((l) => l.map((m) => (m.id === member.id ? revived : m)));
    });
  }

  deleteStaff(id: string): void {
    this.http.delete(`${this.apiUrl}/api/staff/${id}`).subscribe(() => {
      this.portfolio.deleteStaff(id);
    });
  }

  activateProPlan(): void {
    this.http
      .patch<unknown>(`${this.apiUrl}/api/tenants/me`, { plan: 'Pro', maxUnits: 100, features: { staffBot: true, multiCalendar: true, reports: true } })
      .subscribe(() => {
        this.portfolio.activateProPlan();
      });
  }

  syncChannels(): void {
    this.http
      .post<{ channelMappings: unknown[]; icalConnections: unknown[] }>(`${this.apiUrl}/api/channels/sync`, {})
      .subscribe((res) => {
        this.portfolio.channelMappings.set(res.channelMappings as Parameters<PortfolioService['channelMappings']['set']>[0]);
        this.portfolio.icalConnections.set(res.icalConnections as Parameters<PortfolioService['icalConnections']['set']>[0]);
      });
  }

  updateChannelMappings(mappings: Parameters<PortfolioService['channelMappings']['set']>[0]): void {
    this.http.put(`${this.apiUrl}/api/channels/mappings`, mappings).subscribe(() => { });
  }

  updateOtaConfigs(configs: Record<string, unknown>): void {
    this.http.put(`${this.apiUrl}/api/channels/ota`, configs).subscribe((data) => {
      this.portfolio.otaConfigs.set(data as Parameters<PortfolioService['otaConfigs']['set']>[0]);
    });
  }

  currentUser() {
    return this.portfolio.currentUser;
  }

  // P&L Categories
  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/transactions/categories`);
  }

  createCategory(name: string, type: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/transactions/categories`, { name, type });
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/transactions/categories/${id}/delete`, {});
  }

  createSubCategory(categoryId: string, name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/transactions/subcategories`, { categoryId, name });
  }

  deleteSubCategory(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/transactions/subcategories/${id}/delete`, {});
  }
}
