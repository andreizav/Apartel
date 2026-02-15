import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute } from '@angular/router';
import * as XLSX from 'xlsx';
import { ApiService } from '../shared/api.service';
import { PortfolioService, PropertyGroup, PropertyUnit, Booking, InventoryCategory, InventoryItem, Transaction } from '../shared/portfolio.service';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './properties.component.html',
})
export class PropertiesComponent implements OnInit {
  private apiService = inject(ApiService);
  private portfolioService = inject(PortfolioService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  portfolio = this.portfolioService.portfolio;
  allBookings = this.portfolioService.bookings;
  tenant = this.portfolioService.tenant;
  transactions = this.portfolioService.transactions;

  importPreview = signal<PropertyGroup[] | null>(null);
  selectedUnitId = signal<string | null>('u1');
  activeTab = signal<string>('Overview');

  constructor() {
    effect(() => {
      const tab = this.activeTab();
      const uid = this.selectedUnitId();
      if (tab === 'Finance / P&L' && uid) {
        // Debounce slightly or just call
        // Using untracked if we wanted to avoid dependencies but here we want to react to them
        this.syncBookingIncome(true);
      }
    });
  }

  isNewModalOpen = signal(false);
  newEntryType = signal<'group' | 'unit' | 'import_url'>('unit');
  newEntryName = signal('');
  newEntryGroupId = signal('');
  newEntryUrl = signal('');
  newEntryAirbnbId = signal('');
  newEntryBookingId = signal('');
  newEntryPhoto = signal('');

  editForm = signal<PropertyUnit | null>(null);
  snapshot = signal<PropertyUnit | null>(null);
  isSaving = signal(false);

  // Finance State
  isTransactionModalOpen = signal(false);
  transactionCategories = signal<any[]>([]); // {id, name, type, subCategories: []}
  txType = signal<'income' | 'expense'>('expense');
  txAmount = signal<number>(0);
  txDate = signal<string>(new Date().toISOString().split('T')[0]);
  txCategory = signal<string>('');
  txSubCategory = signal<string>('');
  txDescription = signal<string>('');
  txQuantity = signal<number | null>(null);
  txCurrency = signal<'USD' | 'UAH' | 'EUR'>('USD');

  calculatedAmount = computed(() => {
    if (!this.isInventoryCategorySelected()) return null;
    const qty = this.txQuantity();
    const subName = this.txSubCategory();
    if (!qty || !subName) return 0;

    const item = this.availableSubCategories().find((s: any) => s.name === subName);
    if (!item || !item.price) return 0;

    const usdTotal = qty * item.price;
    const rates = this.portfolioService.exchangeRates();
    const rate = rates[this.txCurrency()] || 1;
    return usdTotal * rate;
  });

  canSaveTransaction = computed(() => {
    const amount = this.txAmount();
    const category = this.txCategory();
    const subCategory = this.txSubCategory();
    const isInventory = this.isInventoryCategorySelected();
    const qty = this.txQuantity();
    const hasSubs = this.availableSubCategories().length > 0;

    const calculated = this.calculatedAmount();

    // Basic validation: Amount > 0 (or calculated amount > 0) and Category set. SubCategory set ONLY if has options.
    const validAmount = isInventory ? (calculated !== null && calculated > 0) : (amount && amount > 0);

    if (!validAmount || !category || (hasSubs && !subCategory)) return false;

    // If inventory item, quantity is mandatory
    if (isInventory && (!qty || qty <= 0)) return false;

    return true;
  });
  // New quantity signal

  // P&L Date Navigation
  pnlViewMode = signal<'month' | 'year' | 'all'>('month');
  pnlCurrency = signal<'USD' | 'UAH' | 'EUR'>('USD');
  pnlDate = signal<Date>(new Date());

  // Finance Computed
  unitTransactions = computed(() => {
    const uid = this.selectedUnitId();
    if (!uid) return [];

    let txs = this.transactions()
      .filter(t => t.unitId === uid)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const mode = this.pnlViewMode();
    const refDate = this.pnlDate();

    if (mode === 'all') return txs;

    return txs.filter(t => {
      const tDate = new Date(t.date);
      if (mode === 'year') {
        return tDate.getFullYear() === refDate.getFullYear();
      } else { // month
        return tDate.getFullYear() === refDate.getFullYear() && tDate.getMonth() === refDate.getMonth();
      }
    });
  });

  pnlPeriodLabel = computed(() => {
    const mode = this.pnlViewMode();
    const date = this.pnlDate();
    if (mode === 'all') return 'All Time';
    if (mode === 'year') return date.getFullYear().toString();
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  processedUnitTransactions = computed(() => {
    const txs = this.unitTransactions();
    const rates = this.portfolioService.exchangeRates();
    const targetCur = this.pnlCurrency();
    const rateTarget = rates[targetCur] || 1;

    return txs.map(t => {
      const rateSource = rates[t.currency] || 1;
      // Convert: Amount / SourceRate * TargetRate
      // Example: 100 UAH (Rate 41) -> USD (Rate 1) = 100 / 41 * 1 = 2.43
      const converted = t.amount * (rateTarget / rateSource);
      return { ...t, convertedAmount: converted };
    });
  });

  unitPnLSummary = computed(() => {
    const txs = this.processedUnitTransactions();
    // Amounts are already converted to target currency
    const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.convertedAmount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.convertedAmount, 0);
    return { income, expense, net: income - expense };
  });

  getCurrencySymbol(cur: string) {
    switch (cur) { case 'EUR': return '€'; case 'UAH': return '₴'; default: return '$'; }
  }

  filteredCategories = computed(() => {
    const baseCats = this.transactionCategories().filter(c => c.type === this.txType());

    // If expense, append Inventory categories
    if (this.txType() === 'expense') {
      const invCats = this.portfolioService.inventory().map(c => ({
        id: c.id,
        name: c.name,
        type: 'expense',
        isInventory: true, // Marker
        subCategories: c.items.map(i => ({ id: i.id, name: i.name, price: i.price }))
      }));
      return [...baseCats, ...invCats];
    }

    return baseCats;
  });

  availableSubCategories = computed(() => {
    const catName = this.txCategory();
    const cats = this.filteredCategories();
    const cat = cats.find(c => c.name === catName);

    if (!cat) return [];

    // Check if subCategories are strings or objects and normalize
    return cat.subCategories.map((s: any) => {
      if (typeof s === 'string') {
        return { id: s, name: s };
      }
      return s; // Assume it has id and name
    });
  });

  // Helper to check if current category is inventory
  isInventoryCategorySelected = computed(() => {
    const catName = this.txCategory();
    const cat = this.filteredCategories().find(c => c.name === catName);
    return (cat as any)?.isInventory === true;
  });

  // P&L Navigation Helpers
  setViewMode(mode: 'month' | 'year' | 'all') {
    this.pnlViewMode.set(mode);
  }

  setPnlCurrency(cur: 'USD' | 'UAH' | 'EUR') {
    this.pnlCurrency.set(cur);
  }

  prevPeriod() {
    const mode = this.pnlViewMode();
    if (mode === 'all') return;

    const date = new Date(this.pnlDate());
    if (mode === 'year') {
      date.setFullYear(date.getFullYear() - 1);
    } else {
      date.setMonth(date.getMonth() - 1);
    }
    this.pnlDate.set(date);
    // Trigger sync for the new period? The current sync is "all bookings", so we might need to be careful.
    // Actually syncBookingIncome checks all bookings. Filtering happens on view. That's fine.
  }

  nextPeriod() {
    const mode = this.pnlViewMode();
    if (mode === 'all') return;

    const date = new Date(this.pnlDate());
    if (mode === 'year') {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    this.pnlDate.set(date);
  }


  isDirty = computed(() => {
    const form = this.editForm();
    const original = this.snapshot();
    if (!form || !original) return false;

    // Deep compare fields to detect changes
    return form.name !== original.name ||
      form.internalName !== original.internalName ||
      form.officialAddress !== original.officialAddress ||
      form.basePrice !== original.basePrice ||
      form.cleaningFee !== original.cleaningFee ||
      form.wifiSsid !== original.wifiSsid ||
      form.wifiPassword !== original.wifiPassword ||
      form.status !== original.status ||
      form.airbnbListingId !== original.airbnbListingId ||
      form.bookingListingId !== original.bookingListingId ||
      JSON.stringify(form.photos) !== JSON.stringify(original.photos);
  });

  onFormChange() {
    this.editForm.update(f => f ? { ...f } : null);
  }

  handlePhotoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64 = e.target.result;
        this.editForm.update(u => {
          if (!u) return null;
          return { ...u, photos: [...(u.photos || []), base64] };
        });
      };
      reader.readAsDataURL(file);
    }
    input.value = ''; // Reset input
  }

  removePhoto(index: number) {
    this.editForm.update(u => {
      if (!u) return null;
      const newPhotos = [...(u.photos || [])];
      newPhotos.splice(index, 1);
      return { ...u, photos: newPhotos };
    });
  }

  arrivalMessageModalOpen = signal(false);
  generatedMessage = signal('');

  // Inventory State
  isInventoryModalOpen = signal(false);
  inventoryItemName = signal('');
  inventoryMsg = signal('');
  inventoryItemQuantity = signal<number>(0);
  inventoryItemCategory = signal<string>('');
  showCustomNameInput = signal<boolean>(false);
  editingItemId = signal<string | null>(null);

  tabs = ['Overview', 'Guest History', 'Photos', 'Inventory', 'Finance / P&L', 'Settings'];

  airbnbEmbedUrl = computed(() => {
    const id = this.editForm()?.airbnbListingId;
    if (!id) return null;
    const url = `https://www.airbnb.com/embeddable/home?id=${id}&view=home&hide_price=true`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const unitId = params['unitId'] || this.selectedUnitId();
      if (unitId) {
        const exists = this.portfolio().some(g => g.units.some(u => u.id === unitId));
        if (exists) {
          this.selectUnit(unitId);
          this.portfolio.update(groups =>
            groups.map(g => {
              if (g.units.some(u => u.id === unitId)) {
                return { ...g, expanded: true };
              }
              return g;
            })
          );
        } else if (this.selectedUnitId()) {
          this.selectUnit(this.selectedUnitId()!);
        }
      } else if (this.selectedUnitId()) {
        this.selectUnit(this.selectedUnitId()!);
      }
    });
  }

  selectedUnit = computed(() => {
    const id = this.selectedUnitId();
    if (!id) return null;
    for (const group of this.portfolio()) {
      const unit = group.units.find(u => u.id === id);
      if (unit) return unit;
    }
    return null;
  });

  unitBookings = computed(() => {
    const uid = this.selectedUnitId();
    if (!uid) return [];
    return this.allBookings()
      .filter(b => b.unitId === uid)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  });

  nextCheckIn = computed(() => {
    const bookings = this.unitBookings();
    const now = new Date();
    const upcoming = bookings
      .filter(b => b.startDate >= now && b.status === 'confirmed')
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    if (upcoming.length === 0) return null;
    const diffTime = upcoming[0].startDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  });

  upcomingBookingsCount = computed(() => {
    const bookings = this.unitBookings();
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return bookings.filter(b =>
      b.startDate >= now &&
      b.startDate <= thirtyDaysFromNow &&
      b.status === 'confirmed'
    ).length;
  });

  totalUnitRevenue = computed(() => {
    return this.unitBookings()
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.price, 0);
  });

  averageDailyRate = computed(() => {
    const bookings = this.unitBookings().filter(b => b.status === 'confirmed' && b.price > 0);
    if (bookings.length === 0) return 0;

    let totalNights = 0;
    let totalRev = 0;

    bookings.forEach(b => {
      const nights = this.getNightCount(b.startDate, b.endDate);
      if (nights > 0) {
        totalNights += nights;
        totalRev += (b.price || 0);
      }
    });

    return totalNights > 0 ? totalRev / totalNights : 0;
  });

  occupancyRate = computed(() => {
    const bookings = this.unitBookings().filter(b => b.status === 'confirmed' || b.source === 'blocked');
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    let bookedNights = 0;
    bookings.forEach(b => {
      const start = b.startDate > thirtyDaysAgo ? b.startDate : thirtyDaysAgo;
      const end = b.endDate < now ? b.endDate : now;

      if (start < end) {
        const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        bookedNights += nights;
      }
    });

    return (bookedNights / 30) * 100;
  });

  averageLengthOfStay = computed(() => {
    const bookings = this.unitBookings().filter(b => b.status === 'confirmed');
    if (bookings.length === 0) return 0;

    const totalNights = bookings.reduce((sum, b) => sum + this.getNightCount(b.startDate, b.endDate), 0);
    return totalNights / bookings.length;
  });

  monthlyRevenue = computed(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.unitBookings()
      .filter(b => b.status === 'confirmed' && b.startDate >= firstDay && b.startDate <= lastDay)
      .reduce((sum, b) => sum + (b.price || 0), 0);
  });

  unitInventory = computed(() => {
    const unitId = this.selectedUnitId();
    if (!unitId) return [];

    // Filter global inventory to show only items for this unit
    // We need to return a structure of Categories -> Items
    const allCategories = this.portfolioService.inventory();

    return allCategories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.unitId === unitId)
    })).filter(cat => cat.items.length > 0);
  });

  availableCategories = computed(() => {
    return this.portfolioService.inventory();
  });

  categoryItemNames = computed(() => {
    const catId = this.inventoryItemCategory();
    if (!catId) return [];

    const names = new Set<string>();
    const inventory = this.portfolioService.inventory();
    if (!inventory) return [];

    const category = inventory.find(c => c.id === catId);
    if (category && category.items) {
      // Only show items that exist in "Master" stock (no unitId)
      category.items.filter(item => !item.unitId).forEach(item => {
        if (item && item.name) {
          names.add(item.name);
        }
      });
    }
    return Array.from(names).filter(n => typeof n === 'string').sort();
  });

  // Helper for edit modal
  selectedCategoryName = computed(() => {
    const catId = this.inventoryItemCategory();
    return this.availableCategories().find(c => c.id === catId)?.name || 'Unknown';
  });

  openInventoryModal(item?: InventoryItem) {
    if (item) {
      this.editingItemId.set(item.id);
      this.inventoryItemName.set(item.name);
      this.inventoryItemQuantity.set(item.quantity);
      // Find category
      const cat = this.portfolioService.inventory().find(c => c.items.some(i => i.id === item.id));
      this.inventoryItemCategory.set(cat?.id || '');
      this.showCustomNameInput.set(false);
    } else {
      this.editingItemId.set(null);
      this.inventoryItemName.set('');
      this.inventoryItemQuantity.set(1);
      this.inventoryItemCategory.set(this.availableCategories()[0]?.id || '');
      this.showCustomNameInput.set(false);
    }
    this.isInventoryModalOpen.set(true);
  }

  saveInventoryItem() {
    const unitId = this.selectedUnitId();
    if (!unitId) return;

    const name = this.inventoryItemName().trim();
    const qty = this.inventoryItemQuantity();
    const catId = this.inventoryItemCategory();

    if (!name || qty < 0 || !catId) return;

    const currentInventory = JSON.parse(JSON.stringify(this.portfolioService.inventory())) as InventoryCategory[];
    const category = currentInventory.find(c => c.id === catId);

    if (!category) return;

    // Find Master Item to take stock from
    const masterItem = category.items.find(i => i.name === name && !i.unitId);
    if (!masterItem) {
      alert(`The item "${name}" was not found in Master Inventory stock.`);
      return;
    }

    if (this.editingItemId()) {
      // Handle Edit: Update stock and allocation
      const item = category.items.find(i => i.id === this.editingItemId());
      if (item) {
        const delta = qty - item.quantity;
        if (masterItem.quantity < delta) {
          alert(`Insufficient Master stock. Only ${masterItem.quantity} units available.`);
          return;
        }
        masterItem.quantity -= delta;
        item.quantity = qty;
        // Optimization: Ensure name is synced if it somehow changed (though UI restricts it)
        item.name = name;
      }
    } else {
      // Handle New Allocation: Take from Master, Add to Unit
      if (masterItem.quantity < qty) {
        alert(`Insufficient Master stock. Only ${masterItem.quantity} units available.`);
        return;
      }

      masterItem.quantity -= qty;

      // Find if unit already has an item with this name
      const existingUnitItem = category.items.find(i => i.name === name && i.unitId === unitId);
      if (existingUnitItem) {
        existingUnitItem.quantity += qty;
      } else {
        category.items.push({
          id: `i-${Date.now()}`,
          name,
          quantity: qty,
          unitId
        });
      }
    }

    this.portfolioService.inventory.set(currentInventory);
    this.apiService.updateInventory(currentInventory).subscribe();
    this.isInventoryModalOpen.set(false);
  }

  deleteInventoryItem(itemId: string) {
    if (!confirm('Return this item to stock?')) return;

    const currentInventory = JSON.parse(JSON.stringify(this.portfolioService.inventory())) as InventoryCategory[];

    for (const cat of currentInventory) {
      const idx = cat.items.findIndex(i => i.id === itemId);
      if (idx !== -1) {
        const item = cat.items[idx];
        // Return quantity to Master Item if applicable
        if (item.unitId) {
          const masterItem = cat.items.find(i => i.name === item.name && !i.unitId);
          if (masterItem) {
            masterItem.quantity += item.quantity;
          }
        }
        cat.items.splice(idx, 1);
        break;
      }
    }

    this.portfolioService.inventory.set(currentInventory);
    this.apiService.updateInventory(currentInventory).subscribe();
  }

  navigateToClient(booking: Booking) {
    if (booking.guestPhone) {
      this.router.navigate(['/dashboard/clients'], { queryParams: { phone: booking.guestPhone } });
    } else {
      alert('No phone number available for this booking.');
    }
  }

  toggleGroup(groupId: string) {
    this.portfolio.update(groups =>
      groups.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g)
    );
  }

  deleteGroup(event: Event, groupId: string) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this group and all its units?')) {
      const groupToDelete = this.portfolio().find(g => g.id === groupId);
      const selectedId = this.selectedUnitId();

      this.portfolio.update(groups => groups.filter(g => g.id !== groupId));
      this.apiService.updatePortfolio(this.portfolioService.portfolio()).subscribe();
      if (selectedId && groupToDelete?.units.some(u => u.id === selectedId)) {
        this.selectedUnitId.set(null);
      }
    }
  }

  deleteCurrentUnit() {
    const unitId = this.selectedUnitId();
    const unitName = this.selectedUnit()?.name;
    if (!unitId) return;

    if (confirm(`Are you sure you want to delete "${unitName}"? This will also archive its future availability.`)) {
      this.apiService.deleteUnit(unitId);
      this.selectedUnitId.set(null);
    }
  }

  updateUnitStatus(unitId: string, status: 'Active' | 'Maintenance') {
    this.portfolio.update(groups =>
      groups.map(g => ({
        ...g,
        units: g.units.map(u => (u.id === unitId ? { ...u, status } : u))
      }))
    );
    this.apiService.updatePortfolio(this.portfolioService.portfolio()).subscribe();
  }

  removePreviewGroup(groupId: string) {
    this.importPreview.update(groups => {
      if (!groups) return null;
      return groups.filter(g => g.id !== groupId);
    });
    if (this.importPreview()?.length === 0) {
      this.importPreview.set(null);
    }
  }

  removePreviewUnit(groupId: string, unitId: string) {
    this.importPreview.update(groups => {
      if (!groups) return null;
      return groups.map(g => {
        if (g.id === groupId) {
          return { ...g, units: g.units.filter(u => u.id !== unitId) };
        }
        return g;
      }).filter(g => g.units.length > 0 || !g.isMerge);
    });

    if (this.importPreview()?.length === 0) {
      this.importPreview.set(null);
    }
  }

  selectUnit(unitId: string) {
    this.selectedUnitId.set(unitId);
    // Find unit directly to be safe and synchronous
    let foundUnit: PropertyUnit | null = null;
    for (const group of this.portfolio()) {
      const u = group.units.find(un => un.id === unitId);
      if (u) {
        foundUnit = u;
        break;
      }
    }
    if (foundUnit) {
      this.editForm.set({ ...foundUnit });
      this.snapshot.set({ ...foundUnit });
    }
  }

  saveUnitInfo() {
    const updatedUnit = this.editForm();
    if (!updatedUnit) return;

    this.isSaving.set(true);

    this.portfolio.update(groups => groups.map(g => ({
      ...g,
      units: g.units.map(u => u.id === updatedUnit.id ? { ...updatedUnit } : u)
    })));

    this.apiService.updatePortfolio(this.portfolio()).subscribe({
      next: (success) => {
        this.isSaving.set(false);
        if (success) {
          // Update snapshot to current form state after successful save
          this.snapshot.set({ ...updatedUnit });
        } else {
          alert('Failed to save changes.');
        }
      },
      error: () => {
        this.isSaving.set(false);
        alert('An error occurred while saving.');
      }
    });
  }

  openMap(address: string) {
    if (!address) {
      alert('Please enter an address first.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }

  generateArrivalMessage() {
    const unit = this.editForm();
    if (!unit) return;

    // Find next upcoming booking for this unit
    const now = new Date();
    const nextBooking = this.allBookings()
      .filter(b => b.unitId === unit.id && b.status !== 'cancelled' && new Date(b.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

    const guestName = nextBooking ? nextBooking.guestName : '[Guest Name]';
    const checkInDate = nextBooking ? new Date(nextBooking.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '[Date]';

    const message = `Hello ${guestName}! 👋\n\nLooking forward to your stay at ${unit.name} on ${checkInDate}.\n\n📍 Address: ${unit.officialAddress}\n🌐 WiFi: ${unit.wifiSsid}\n🔑 Pass: ${unit.wifiPassword}\n🚪 Access Instructions: ${unit.accessCodes || 'Will be sent on check-in day.'}\n\nSee you soon!`;

    this.generatedMessage.set(message);
    this.arrivalMessageModalOpen.set(true);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getNightCount(start: Date | string, end: Date | string): number {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  }

  getSourceClass(source: string): string {
    switch (source.toLowerCase()) {
      case 'airbnb': return 'text-[#ff385c] bg-[#ff385c]/10';
      case 'booking': return 'text-[#003580] bg-[#003580]/10';
      case 'expedia': return 'text-yellow-600 bg-yellow-400/10';
      case 'direct': return 'text-green-600 bg-green-500/10';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Message copied to clipboard!');
    });
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
    if (tab === 'Finance / P&L' && this.transactionCategories().length === 0) {
      this.apiService.getCategories().subscribe(cats => this.transactionCategories.set(cats));
    }
  }

  openTransactionModal() {
    this.txType.set('expense');
    this.txAmount.set(0);
    this.txCategory.set('');
    this.txSubCategory.set('');
    this.txDescription.set('');
    this.txQuantity.set(null); // Reset
    this.txCurrency.set('USD');
    this.txDate.set(new Date().toISOString().split('T')[0]);
    this.isTransactionModalOpen.set(true);

    if (this.transactionCategories().length === 0) {
      this.apiService.getCategories().subscribe(cats => this.transactionCategories.set(cats));
    }
  }

  updateTxType(type: 'income' | 'expense') {
    this.txType.set(type);
    this.txCategory.set('');
    this.txSubCategory.set('');
  }

  saveTransaction() {
    if (!this.canSaveTransaction()) return;

    const unitId = this.selectedUnitId();
    if (!unitId) return;

    let desc = this.txDescription();
    const qty = this.txQuantity();
    const subCategoryName = this.txSubCategory();
    const categoryName = this.txCategory();

    // Check if it's an inventory item
    const selectedItem = this.availableSubCategories().find(s => s.name === subCategoryName);

    if (qty && qty > 0 && this.isInventoryCategorySelected()) {
      desc = `${desc} (Qty: ${qty})`.trim();

      // We need to update the unit's inventory
      const currentInventory = JSON.parse(JSON.stringify(this.portfolioService.inventory())) as InventoryCategory[];
      const category = currentInventory.find(c => c.name === categoryName);

      if (category) {
        let unitItem = category.items.find(i => i.name === subCategoryName && i.unitId === unitId);

        if (unitItem) {
          // Increase existing unit stock
          unitItem.quantity = (unitItem.quantity || 0) + qty;
          // Optionally update price with latest purchase
          const masterItem = category.items.find(i => i.name === subCategoryName && !i.unitId);
          if (masterItem) unitItem.price = masterItem.price;
        } else {
          // Create new allocation for this unit
          const masterItem = category.items.find(i => i.name === subCategoryName && !i.unitId);
          category.items.push({
            id: `i-exp-${Date.now()}`,
            name: subCategoryName,
            quantity: qty,
            price: masterItem?.price || 0,
            unitId: unitId
          });
        }

        // Save updated inventory
        this.portfolioService.inventory.set(currentInventory);
        this.apiService.updateInventory(currentInventory).subscribe();
      }
    } else if (qty && qty > 0) {
      desc = `${desc} (Qty: ${qty})`.trim();
    }

    const tx: Transaction = {
      id: '', // Generated by backend
      date: this.txDate(),
      amount: this.isInventoryCategorySelected() ? (this.calculatedAmount() || 0) : this.txAmount(),
      currency: this.txCurrency(),
      type: this.txType(),
      category: categoryName,
      subCategory: subCategoryName,
      description: desc,
      property: 'Unit Specific',
      unitId: unitId
    };

    this.apiService.addTransaction(tx);
    this.isTransactionModalOpen.set(false);
  }

  syncBookingIncome(silent = false) {
    const unitId = this.selectedUnitId();
    if (!unitId) return;

    this.apiService.syncUnitIncome(unitId).subscribe(res => {
      if (res.synced > 0) {
        if (!silent) alert(`Successfully synchronized ${res.synced} income transactions.`);
        res.transactions.forEach(t => this.portfolioService.addTransaction(t));
      } else {
        if (!silent) alert('No new booking income to synchronize.');
      }
    });
  }

  openNewModal() {
    // 1. Check Limits before opening
    const currentUnits = this.portfolio().reduce((acc, g) => acc + g.units.length, 0);
    const limit = this.tenant().maxUnits;

    if (currentUnits >= limit) {
      this.portfolioService.triggerUpgrade(`You have reached the limit of ${limit} unit(s) on your current plan.`);
      return;
    }

    this.newEntryName.set('');
    this.newEntryType.set('unit');
    const groups = this.portfolio();
    if (groups.length > 0) {
      this.newEntryGroupId.set(groups[0].id);
    }
    this.newEntryAirbnbId.set('');
    this.newEntryBookingId.set('');
    this.newEntryUrl.set('');
    this.newEntryPhoto.set('');
    this.isNewModalOpen.set(true);
  }

  isFetchingDetails = signal(false);

  async onAirbnbIdChange(id: string) {
    this.newEntryAirbnbId.set(id);
    this.fetchUnitDetails(id);
  }

  async onUrlChange(url: string) {
    this.newEntryUrl.set(url);
    const parsed = this.parseUrl(url);
    if (parsed) {
      if (parsed.type === 'airbnb') this.newEntryAirbnbId.set(parsed.id);
      if (parsed.type === 'booking') this.newEntryBookingId.set(parsed.id);

      this.fetchUnitDetails(parsed.id);
    }
  }

  private parseUrl(url: string): { type: 'airbnb' | 'booking', id: string } | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes('airbnb')) {
        // .../rooms/12345678...
        const segments = u.pathname.split('/');
        const roomIndex = segments.indexOf('rooms');
        if (roomIndex !== -1 && segments[roomIndex + 1]) {
          return { type: 'airbnb', id: segments[roomIndex + 1] };
        }
      } else if (u.hostname.includes('booking.com')) {
        // .../hotel/us/name.html... -> we usually need the hotel ID or path
        // For now, let's just take the pathname as valid enough validation or specific ID if we knew the format
        // Booking IDs are messy (e.g. "hotel-name"). Let's assume the user pastes a link to the hotel page.
        // Warning: This is a simplification.
        return { type: 'booking', id: 'extracted-booking-id' };
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  private async fetchUnitDetails(id: string) {
    if (id.length > 4 && !this.newEntryName()) {
      this.isFetchingDetails.set(true);

      const url = this.newEntryUrl();
      if (!url) {
        this.isFetchingDetails.set(false);
        return;
      }

      this.apiService.scrapeUrl(url).subscribe({
        next: (data) => {
          if (data.title) {
            this.newEntryName.set(data.title.substring(0, 100)); // Limit length
          } else {
            this.newEntryName.set(`Imported Unit ${id}`);
          }
          if (data.image) {
            this.newEntryPhoto.set(data.image);
          }
          this.isFetchingDetails.set(false);
        },
        error: (err) => {
          console.error('Scraping failed', err);
          // Fallback
          this.newEntryName.set(`Imported Unit ${id}`);
          this.isFetchingDetails.set(false);
        }
      });
    }
  }

  createEntry() {
    const name = this.newEntryName().trim();
    if (!name && this.newEntryType() !== 'import_url') return; // Name is optional for import_url if it's being fetched, but technically we wait for fetch.

    if (this.newEntryType() === 'group') {
      const newGroup: PropertyGroup = {
        id: `g-new-${Date.now()}`,
        name: name,
        units: [],
        expanded: true
      };
      this.portfolio.update(p => [...p, newGroup]);
      this.apiService.updatePortfolio(this.portfolioService.portfolio()).subscribe();
    } else {
      const groupId = this.newEntryGroupId();
      if (!groupId) return;

      const newUnit: PropertyUnit = {
        id: `u-new-${Date.now()}`,
        name: name,
        internalName: name,
        officialAddress: '',
        basePrice: 0,
        cleaningFee: 0,
        wifiSsid: '',
        wifiPassword: '',
        accessCodes: '',
        status: 'Active',
        airbnbListingId: this.newEntryAirbnbId().trim(),
        bookingListingId: this.newEntryBookingId().trim(),
        photos: this.newEntryPhoto() ? [this.newEntryPhoto()] : []
      };

      this.portfolio.update(groups => groups.map(g => {
        if (g.id === groupId) {
          return { ...g, units: [...g.units, newUnit], expanded: true };
        }
        return g;
      }));
      this.apiService.updatePortfolio(this.portfolioService.portfolio()).subscribe();
      this.selectUnit(newUnit.id);
    }
    this.isNewModalOpen.set(false);
  }

  exportPortfolio() {
    const data: any[] = [];

    // Header Row
    data.push([
      'Group Name',
      'Unit Name',
      'Internal Name',
      'Status',
      'Official Address',
      'Base Price',
      'Cleaning Fee',
      'WiFi SSID',
      'WiFi Password',
      'Access Codes'
    ]);

    // Data Rows
    for (const group of this.portfolio()) {
      // Add Group Row (Optional, or just list units with their group)
      if (group.units.length === 0) {
        data.push([group.name, '', '', '', '', '', '', '', '', '']);
      }

      for (const unit of group.units) {
        data.push([
          group.name,
          unit.name,
          unit.internalName || '',
          unit.status,
          unit.officialAddress || '',
          unit.basePrice || 0,
          unit.cleaningFee || 0,
          unit.wifiSsid || '',
          unit.wifiPassword || '',
          unit.accessCodes || ''
        ]);
      }
    }

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Portfolio');

    XLSX.writeFile(wb, 'ApartEl_Portfolio.xlsx');
  }

  handleImport(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (jsonData && jsonData.length > 0) {
          this.parseExcelData(jsonData);
        }
      };
      reader.readAsArrayBuffer(file);
    }
    target.value = '';
  }

  private parseExcelData(rows: any[][]) {
    // Expected Header: Group Name | Unit Name | Internal Name | Status | Official Address | Base Price | Cleaning Fee | WiFi SSID | WiFi Password | Access Codes
    // Index:           0          | 1         | 2             | 3      | 4                | 5          | 6            | 7         | 8             | 9

    const groupsMap = new Map<string, PropertyGroup>();
    const currentPortfolio = this.portfolio();

    // Initialize map with existing groups to detect merges
    currentPortfolio.forEach(g => {
      groupsMap.set(g.name.toLowerCase(), { ...g, units: [...g.units], isMerge: true });
    });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const groupName = (row[0] || '').toString().trim();
      const unitName = (row[1] || '').toString().trim();

      if (!groupName) continue;

      let group = groupsMap.get(groupName.toLowerCase());
      if (!group) {
        group = {
          id: `g-imp-${Date.now()}-${i}`,
          name: groupName,
          units: [],
          expanded: true,
          isMerge: false
        };
        groupsMap.set(groupName.toLowerCase(), group);
      }

      if (unitName) {
        // Check if unit already exists in this group (duplicate check)
        const unitExists = group.units.some(u => u.name.toLowerCase() === unitName.toLowerCase());

        if (!unitExists) {
          const newUnit: PropertyUnit = {
            id: `u-imp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            name: unitName,
            internalName: (row[2] || unitName).toString().trim(),
            status: (row[3] || 'Active').toString().trim() === 'Maintenance' ? 'Maintenance' : 'Active',
            officialAddress: (row[4] || '').toString().trim(),
            basePrice: Number(row[5]) || 0,
            cleaningFee: Number(row[6]) || 0,
            wifiSsid: (row[7] || '').toString().trim(),
            wifiPassword: (row[8] || '').toString().trim(),
            accessCodes: (row[9] || '').toString().trim(),
            photos: [] // Photos are not imported from Excel
          };
          group.units.push(newUnit);
        }
      }
    }

    const previewData = Array.from(groupsMap.values()).filter(g =>
      g.isMerge ? g.units.length > this.portfolio().find(p => p.id === g.id)?.units.length : true
    );

    // Correction: The filter above is tricky because 'units' in groupsMap has ALL units (old + new). 
    // We want to show only groups that have NEW units or are NEW groups.

    const finalPreview: PropertyGroup[] = [];

    groupsMap.forEach(g => {
      if (!g.isMerge) {
        if (g.units.length > 0) finalPreview.push(g);
      } else {
        const original = currentPortfolio.find(p => p.id === g.id);
        if (original && g.units.length > original.units.length) {
          // Need to isolate only the new units for the preview logic if strictly adding
          // However, our merge logic in confirmImport concat's them. 
          // Let's refine the logic to be cleaner:
          // Actually, let's keep it simple: Just pass the modified groups to preview.
          // But wait, the previous logic separated new units. 

          const newUnits = g.units.filter(u => !original.units.some(ou => ou.id === u.id));
          if (newUnits.length > 0) {
            finalPreview.push({ ...g, units: newUnits });
          }
        }
      }
    });

    if (finalPreview.length > 0) {
      this.importPreview.set(finalPreview);
    } else {
      alert('No new properties found in file to import.');
    }
  }

  confirmImport() {
    const dataToImport = this.importPreview();
    if (dataToImport) {
      // 1. Check Limits (Total units after import)
      const currentUnits = this.portfolio().reduce((acc, g) => acc + g.units.length, 0);
      const newUnitsCount = dataToImport.reduce((acc, g) => acc + g.units.length, 0);
      const limit = this.tenant().maxUnits;

      if (currentUnits + newUnitsCount > limit) {
        this.portfolioService.triggerUpgrade(`Importing these units would exceed your limit of ${limit} units. Please upgrade your plan.`);
        return;
      }

      this.portfolio.update(current => {
        const updatedPortfolio = [...current];
        dataToImport.forEach(importGroup => {
          if (importGroup.isMerge) {
            const index = updatedPortfolio.findIndex(g => g.id === importGroup.id);
            if (index !== -1) {
              updatedPortfolio[index] = {
                ...updatedPortfolio[index],
                units: [...updatedPortfolio[index].units, ...importGroup.units]
              };
            }
          } else {
            const newGroup = { ...importGroup, id: `g-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` };
            updatedPortfolio.push(newGroup);
          }
        });
        return updatedPortfolio;
      });

      this.apiService.updatePortfolio(this.portfolioService.portfolio()).subscribe(success => {
        if (success) {
          alert('Properties imported and saved successfully!');
          if (dataToImport.length > 0 && dataToImport[0].units.length > 0) {
            this.selectedUnitId.set(dataToImport[0].units[0].id);
          }
          this.importPreview.set(null);
        } else {
          alert('Failed to save imported properties to the database. Please try again.');
        }
      });
    }
  }

  cancelImport() {
    this.importPreview.set(null);
  }
}