
import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../shared/portfolio.service';

@Component({
  selector: 'app-superbase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superbase.component.html',
})
export class SuperbaseComponent {
  private portfolioService = inject(PortfolioService);

  // Module State
  activeModule = signal<'database' | 'auth'>('database');

  // --- Database Module State ---
  activeView = signal<'table' | 'sql'>('table');
  activeTable = signal<string>('tenants');
  sqlQuery = signal('SELECT * FROM users WHERE tenant_id = \'t-001\'');
  sqlResult = signal<any[] | null>(null);


  // --- Auth Module State ---
  activeAuthSection = signal<'users' | 'policies'>('users');
  searchUserQuery = signal('');

  // Tables Mapping (Multi-Tenant Architecture)
  tables = [
    { name: 'tenants', label: 'public.tenants', icon: 'domain' },
    { name: 'users', label: 'public.users', icon: 'shield_person' },
    { name: 'properties', label: 'public.properties', icon: 'apartment' },
    { name: 'bookings', label: 'public.bookings', icon: 'book_online' },
    { name: 'transactions', label: 'public.transactions', icon: 'payments' },
    { name: 'clients', label: 'public.clients', icon: 'groups' },
    { name: 'inventory', label: 'public.inventory_items', icon: 'inventory_2' },
    { name: 'channels', label: 'public.channel_mappings', icon: 'hub' },
    { name: 'settings', label: 'public.app_settings', icon: 'settings' },
  ];

  // Computed Table Data
  tableData = computed(() => {
    const tenantId = this.portfolioService.tenant().id;
    switch (this.activeTable()) {
      case 'tenants':
        const t = this.portfolioService.tenant();
        return [{ id: t.id, name: t.name, plan: t.plan, status: t.status, max_units: t.maxUnits, created_at: '2023-01-01T00:00:00Z' }];
      case 'bookings': return this.portfolioService.bookings().map(b => ({ ...b, tenant_id: tenantId }));
      case 'staff':
      case 'users':
        return this.portfolioService.staff().map(s => ({
          id: s.id,
          tenant_id: tenantId,
          email: s.email,
          role: s.role === 'Manager' ? 'Owner' : s.role,
          telegram_id: Math.floor(Math.random() * 100000000),
          created_at: new Date()
        }));
      case 'transactions': return this.portfolioService.transactions().map(t => ({ ...t, tenant_id: tenantId }));
      case 'clients': return this.portfolioService.clients().map(c => ({ ...c, tenant_id: tenantId }));
      case 'properties':
        const flat: any[] = [];
        this.portfolioService.portfolio().forEach(g => {
          g.units.forEach(u => flat.push({ ...u, group: g.name, tenant_id: tenantId }));
        });
        return flat;
      case 'inventory':
        const invItems: any[] = [];
        this.portfolioService.inventory().forEach(cat => {
          cat.items.forEach(i => invItems.push({ id: i.id, category: cat.name, name: i.name, quantity: i.quantity, tenant_id: tenantId }));
        });
        return invItems;
      case 'channels': return this.portfolioService.channelMappings().map(m => ({ ...m, tenant_id: tenantId }));
      case 'settings':
        // Single row table
        return [{ ...this.portfolioService.appSettings(), tenant_id: tenantId }];
      default: return [];
    }
  });

  // Computed Auth Users (Simulated)
  authUsers = computed(() => {
    const staffUsers = this.portfolioService.staff().map(s => ({
      uid: s.id,
      email: s.email,
      phone: s.phone,
      provider: 'email',
      created_at: new Date('2023-01-15T09:00:00'),
      last_sign_in: s.lastActive,
      role: 'authenticated',
      app_metadata: { tenant_id: this.portfolioService.tenant().id, role: s.role === 'Manager' ? 'owner' : 'staff' }, // Multi-tenant metadata
      metadata: { name: s.name, avatar: s.avatar }
    }));

    const all = [...staffUsers];

    const q = this.searchUserQuery().toLowerCase();
    if (!q) return all;
    return all.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.metadata.name as string).toLowerCase().includes(q)
    );
  });

  // Get headers from first item
  tableHeaders = computed(() => {
    const data = this.tableData();
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter(k => typeof (data[0] as any)[k] !== 'object' || (data[0] as any)[k] instanceof Date);
  });

  constructor() {

  }

  // --- Actions ---

  setActiveTable(name: string) {
    this.activeTable.set(name);
    this.activeView.set('table');

  }

  runSql() {
    const query = this.sqlQuery().toLowerCase();

    // Destructive Commands Check
    if (query.includes('drop database') || query.includes('truncate')) {
      this.portfolioService.clearData().subscribe(() => {

        this.sqlResult.set([{ status: 'SUCCESS', message: 'Data cleared successfully.' }]);
      });
      return;
    }

    // Handle Selects
    let data: any[] = [];
    if (query.includes('inventory')) {
      this.portfolioService.inventory().forEach(cat => cat.items.forEach(i => data.push({ ...i, category: cat.name })));
    } else if (query.includes('settings')) {
      data = [this.portfolioService.appSettings()];
    } else {
      // Default fallback to current table data if parsing fails
      data = this.tableData();
    }

    if (query.includes('where')) data = data.slice(0, 1);

    this.sqlResult.set(data);

  }

  saveToDisk() {

    alert('Data is synced with the server.');
  }

  createMockData() {
    if (confirm('This will RESET all data to default demo values. Continue?')) {
      this.portfolioService.resetData().subscribe(() => {

      });
    }
  }

  deleteAllData() {
    if (confirm('This will DELETE ALL data. Continue?')) {
      this.portfolioService.clearData().subscribe(() => {

      });
    }
  }

  // --- Auth Actions ---

  inviteUser() {
    const email = prompt('Enter email address to invite:');
    if (email) {
      alert(`Invitation sent to ${email} (Simulated)`);

    }
  }

  sendMagicLink(email: string) {
    if (email === '-' || !email) return;
    alert(`Magic Link sent to ${email}`);

  }

  deleteUser(uid: string) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {

      alert('User deleted (Simulated)');
    }
  }

  // --- Helpers ---



  formatValue(val: any): string {
    if (val instanceof Date) return val.toLocaleDateString();
    return String(val);
  }
}
