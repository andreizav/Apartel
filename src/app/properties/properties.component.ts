import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import * as XLSX from 'xlsx';
import { ApiService } from '../shared/api.service';
import { PortfolioService, PropertyGroup, PropertyUnit, Booking, InventoryCategory, InventoryItem } from '../shared/portfolio.service';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './properties.component.html',
})
export class PropertiesComponent implements OnInit {
  private apiService = inject(ApiService);
  private portfolioService = inject(PortfolioService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  portfolio = this.portfolioService.portfolio;
  allBookings = this.portfolioService.bookings;
  tenant = this.portfolioService.tenant;

  importPreview = signal<PropertyGroup[] | null>(null);
  selectedUnitId = signal<string | null>('u1');
  activeTab = signal<string>('Basic Info');

  isNewModalOpen = signal(false);
  newEntryType = signal<'group' | 'unit'>('unit');
  newEntryName = signal('');
  newEntryGroupId = signal('');

  editForm = signal<PropertyUnit | null>(null);
  snapshot = signal<PropertyUnit | null>(null);
  isSaving = signal(false);

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

  tabs = ['Basic Info', 'Guest History', 'Photos', 'Inventory', 'Settings'];

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
      category.items.forEach(item => {
        if (item && item.name) {
          names.add(item.name);
        }
      });
    }
    return Array.from(names).filter(n => typeof n === 'string').sort();
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

    if (this.editingItemId()) {
      // Update existing
      // First, we need to find where the item is currently (it might be in a different category if we allowed cat change, but for now assuming valid catId logic)
      // Actually, since we might simply be updating, let's find the original item location
      let found = false;
      for (const cat of currentInventory) {
        const itemIndex = cat.items.findIndex(i => i.id === this.editingItemId());
        if (itemIndex !== -1) {
          if (cat.id === catId) {
            // Same category update
            cat.items[itemIndex].name = name;
            cat.items[itemIndex].quantity = qty;
          } else {
            // Moved category
            cat.items.splice(itemIndex, 1);
            category.items.push({
              id: this.editingItemId()!,
              name,
              quantity: qty,
              unitId
            });
          }
          found = true;
          break;
        }
      }
    } else {
      // Create new
      category.items.push({
        id: `i-${Date.now()}`,
        name,
        quantity: qty,
        unitId
      });
    }

    this.portfolioService.inventory.set(currentInventory);
    this.apiService.updateInventory(currentInventory).subscribe();
    this.isInventoryModalOpen.set(false);
  }

  deleteInventoryItem(itemId: string) {
    if (!confirm('Delete this item?')) return;

    const currentInventory = JSON.parse(JSON.stringify(this.portfolioService.inventory())) as InventoryCategory[];

    for (const cat of currentInventory) {
      const idx = cat.items.findIndex(i => i.id === itemId);
      if (idx !== -1) {
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
    this.isNewModalOpen.set(true);
  }

  createEntry() {
    const name = this.newEntryName().trim();
    if (!name) return;

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
        photos: []
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