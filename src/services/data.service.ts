import { Injectable, signal } from '@angular/core';

export interface PropertyGroup {
  id: string;
  name: string;
  type: 'GROUP' | 'STANDALONE';
  units: PropertyUnit[];
  expanded: boolean;
  stats?: {
    totalUnits: number;
    occupancy: number;
  }
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
}

export interface PropertyUnit {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'cleaning';
  cleaningStatus: 'clean' | 'dirty' | 'inspection';
  // Extended Details
  type: 'Rental' | 'Warehouse' | 'Office';
  address?: string;
  wifiSsid?: string;
  wifiPwd?: string;
  accessCodes?: string;
  isActive: boolean;
  inventory?: InventoryItem[];
  basePrice?: number;
  cleaningFee?: number;
}

export interface Booking {
  id: string;
  unitId: string;
  guestName: string;
  source: 'Airbnb' | 'Booking' | 'Direct';
  startDate: string; // ISO YYYY-MM-DD
  length: number;
  status: 'confirmed' | 'payment-pending' | 'blocked' | 'conflict';
  price: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
}

export interface SyncLog {
  id: number;
  channel: string;
  unitName: string;
  type: 'PUSH' | 'PULL';
  action: string;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
  message?: string;
}

// New Interface for Migrated Tasks
export interface StaffTask {
  id: string;
  title: string;
  unitId: string;
  unitName: string;
  assignee: string;
  assigneeId: string;
  type: 'cleaning' | 'maintenance' | 'driver';
  status: 'todo' | 'progress' | 'done';
  date: string;
  priority: 'high' | 'normal';
}

@Injectable({ providedIn: 'root' })
export class DataService {
  
  showNewBookingModal = signal(false);
  showNewPropertyModal = signal(false);
  
  // For Edit Mode
  selectedBooking = signal<Booking | null>(null);

  hierarchy = signal<PropertyGroup[]>([
    {
      id: 'g_art',
      name: 'Art Apartments',
      type: 'GROUP',
      expanded: true,
      stats: { totalUnits: 3, occupancy: 85 },
      units: [
        { 
            id: 'art1', name: 'Art 1', status: 'active', cleaningStatus: 'clean', type: 'Rental', isActive: true,
            address: '12 Khreshchatyk St, Apt 14', wifiSsid: 'Art_Apts_Guest', wifiPwd: 'welcome_guest', accessCodes: 'Door: 1234#',
            basePrice: 80, cleaningFee: 20
        },
        { 
            id: 'art2', name: 'Art 2', status: 'active', cleaningStatus: 'dirty', type: 'Rental', isActive: true,
            address: '12 Khreshchatyk St, Apt 15', wifiSsid: 'Art_Apts_Guest', wifiPwd: 'welcome_guest', accessCodes: 'Door: 5678#',
            basePrice: 85, cleaningFee: 20
        },
        { 
            id: 'redhead', name: 'Readhead', status: 'active', cleaningStatus: 'clean', type: 'Rental', isActive: true,
            address: '14 Khreshchatyk St, Apt 3', wifiSsid: 'Redhead_Guest', wifiPwd: 'red_velvet_cake', accessCodes: 'Keybox: 0000',
            basePrice: 75, cleaningFee: 15
        }
      ]
    },
    {
      id: 'g_stylish',
      name: 'Stylish Apartments',
      type: 'GROUP',
      expanded: true,
      stats: { totalUnits: 4, occupancy: 70 },
      units: [
        { id: 'dragon', name: 'Dragon', status: 'active', cleaningStatus: 'clean', type: 'Rental', isActive: true, address: 'Basseynaya 3', wifiSsid: 'Dragon_Net', wifiPwd: 'fire_breather', basePrice: 110, cleaningFee: 25 },
        { id: 'rythm', name: 'Rythm', status: 'active', cleaningStatus: 'inspection', type: 'Rental', isActive: true, address: 'Basseynaya 5', basePrice: 100, cleaningFee: 25 },
        { id: 'envoy', name: 'Envoy', status: 'active', cleaningStatus: 'clean', type: 'Rental', isActive: true, address: 'Basseynaya 5', basePrice: 105, cleaningFee: 25 },
        { id: 'rhino', name: 'Rhino', status: 'maintenance', cleaningStatus: 'dirty', type: 'Rental', isActive: false, address: 'Basseynaya 7', basePrice: 95, cleaningFee: 25 }
      ]
    },
    {
      id: 'g_story',
      name: 'Story Apartments',
      type: 'GROUP',
      expanded: false,
      stats: { totalUnits: 2, occupancy: 50 },
      units: [
        { id: 'bh50_9', name: 'BH50_9', status: 'active', cleaningStatus: 'clean', type: 'Rental', isActive: true, address: 'B. Khmelnytskoho 50', basePrice: 120, cleaningFee: 30 },
        { id: 'g59', name: 'G59 (Mars)', status: 'active', cleaningStatus: 'clean', type: 'Rental', isActive: true, address: 'Gorkogo 59', basePrice: 115, cleaningFee: 30 }
      ]
    },
    {
      id: 'g_standalone',
      name: 'Standalone / Other',
      type: 'GROUP', 
      expanded: true,
      stats: { totalUnits: 3, occupancy: 100 },
      units: [
        { id: 'lesi3', name: 'Lesi 3', status: 'active', cleaningStatus: 'dirty', type: 'Rental', isActive: true, address: 'Lesi Ukrainky 3', basePrice: 60, cleaningFee: 15 },
        { id: 's45', name: 'S45', status: 'cleaning', cleaningStatus: 'dirty', type: 'Rental', isActive: true, address: 'Saksaganskogo 45', basePrice: 55, cleaningFee: 15 },
        { 
            id: 'office', name: 'ОФИС', status: 'active', cleaningStatus: 'clean', type: 'Office', isActive: false, 
            address: 'Central Warehouse', wifiSsid: 'ApartEl_Office', wifiPwd: 'staff_only_secure', accessCodes: 'Alarm: 9911'
        }
      ]
    }
  ]);

  bookings = signal<Booking[]>([
    { id: 'b1', unitId: 'art1', guestName: 'Ivanov I.', source: 'Airbnb', startDate: '2023-10-25', length: 3, status: 'confirmed', price: 150, paymentStatus: 'paid' },
    { id: 'b2', unitId: 'art2', guestName: 'Smith J.', source: 'Booking', startDate: '2023-10-26', length: 5, status: 'payment-pending', price: 300, paymentStatus: 'unpaid' },
    { id: 'b3', unitId: 'dragon', guestName: 'Maint.', source: 'Direct', startDate: '2023-10-25', length: 2, status: 'blocked', price: 0, paymentStatus: 'paid' },
    { id: 'b4', unitId: 'lesi3', guestName: 'Anna K.', source: 'Airbnb', startDate: '2023-10-27', length: 4, status: 'confirmed', price: 220, paymentStatus: 'paid' },
    // Conflict Example
    { id: 'b5', unitId: 'envoy', guestName: 'Conflict Test', source: 'Direct', startDate: '2023-10-26', length: 2, status: 'conflict', price: 200, paymentStatus: 'paid' }
  ]);

  // Tasks populated from Migration (Simulated)
  tasks = signal<StaffTask[]>([
    { id: 't1', title: 'Checkout Clean', unitId: 'art1', unitName: 'Art 1', type: 'cleaning', assignee: 'Oksana', assigneeId: 'u1', status: 'progress', priority: 'high', date: '2023-10-26' },
    { id: 't2', title: 'Fix AC Unit', unitId: 'g59', unitName: 'G59 (Mars)', type: 'maintenance', assignee: 'Zhenya', assigneeId: 'u2', status: 'todo', priority: 'high', date: '2023-10-26' },
    { id: 't3', title: 'Restock Shampoo', unitId: 'dragon', unitName: 'Dragon', type: 'driver', assignee: 'Driver 1', assigneeId: 'u3', status: 'todo', priority: 'normal', date: '2023-10-27' },
    { id: 't4', title: 'Deep Clean', unitId: 'lesi3', unitName: 'Lesi 3', type: 'cleaning', assignee: 'Oksana', assigneeId: 'u1', status: 'done', priority: 'normal', date: '2023-10-25' },
  ]);

  syncLogs = signal<SyncLog[]>([
    { id: 1, channel: 'Airbnb', unitName: 'Art 1', type: 'PULL', action: 'New Booking', status: 'SUCCESS', timestamp: '2023-10-26T14:30:00' },
    { id: 2, channel: 'Booking.com', unitName: 'Dragon', type: 'PUSH', action: 'Block Dates', status: 'SUCCESS', timestamp: '2023-10-26T14:31:00' },
    { id: 3, channel: 'Expedia', unitName: 'G59 (Mars)', type: 'PUSH', action: 'Update Rates', status: 'FAILED', timestamp: '2023-10-26T14:35:00', message: 'API Rate Limit Exceeded' },
    { id: 4, channel: 'Airbnb', unitName: 'Lesi 3', type: 'PUSH', action: 'Availability Sync', status: 'SUCCESS', timestamp: '2023-10-26T15:00:00' },
    { id: 5, channel: 'Booking.com', unitName: 'Art 2', type: 'PULL', action: 'New Booking', status: 'SUCCESS', timestamp: '2023-10-26T15:15:00' },
    { id: 6, channel: 'Airbnb', unitName: 'Rhino', type: 'PUSH', action: 'Update Rates', status: 'SUCCESS', timestamp: '2023-10-26T15:20:00' },
    { id: 7, channel: 'Booking.com', unitName: 'Envoy', type: 'PUSH', action: 'Block Dates', status: 'SUCCESS', timestamp: '2023-10-26T15:30:00' },
  ]);

  addBooking(bookingData: Partial<Booking>) {
    const newBooking: Booking = {
      id: Math.random().toString(36).substring(2, 9),
      unitId: bookingData.unitId || '',
      guestName: bookingData.guestName || 'Unknown Guest',
      source: bookingData.source || 'Direct',
      startDate: bookingData.startDate || new Date().toISOString().split('T')[0],
      length: bookingData.length || 1,
      status: bookingData.status || 'confirmed',
      price: bookingData.price || 0,
      paymentStatus: 'unpaid'
    };

    // Simple Overlap Check
    if (this.checkOverlap(newBooking.unitId, newBooking.startDate, newBooking.length)) {
      alert('Warning: This creates a double booking!');
      newBooking.status = 'conflict';
    }

    this.bookings.update(current => [...current, newBooking]);
    this.showNewBookingModal.set(false);
  }

  updateBooking(updatedBooking: Booking) {
    this.bookings.update(current => 
      current.map(b => b.id === updatedBooking.id ? updatedBooking : b)
    );
    this.showNewBookingModal.set(false);
    this.selectedBooking.set(null);
  }

  deleteBooking(id: string) {
    this.bookings.update(current => current.filter(b => b.id !== id));
  }

  addPropertyUnit(unitData: Partial<PropertyUnit>, groupId: string) {
    const newUnit: PropertyUnit = {
      id: Math.random().toString(36).substring(2, 9),
      name: unitData.name || 'New Unit',
      status: unitData.status || 'active',
      cleaningStatus: 'clean',
      type: unitData.type || 'Rental',
      address: unitData.address,
      wifiSsid: '',
      wifiPwd: '',
      accessCodes: '',
      isActive: unitData.isActive ?? true,
      basePrice: unitData.basePrice || 0,
      cleaningFee: unitData.cleaningFee || 0
    };

    this.hierarchy.update(groups => 
      groups.map(g => {
          if (g.id === groupId) {
              return { ...g, units: [...g.units, newUnit] };
          }
          return g;
      })
    );
    this.showNewPropertyModal.set(false);
  }
  
  updateUnitCleaningStatus(unitId: string, status: 'clean' | 'dirty' | 'inspection') {
    this.hierarchy.update(groups => 
        groups.map(g => ({
            ...g,
            units: g.units.map(u => u.id === unitId ? { ...u, cleaningStatus: status } : u)
        }))
    );
  }
  
  addTask(taskData: Partial<StaffTask>) {
    const newTask: StaffTask = {
        id: Math.random().toString(36).substring(2),
        title: taskData.title || 'New Task',
        unitId: taskData.unitId || '',
        unitName: taskData.unitName || 'Unknown Unit',
        assignee: taskData.assignee || 'Unassigned',
        assigneeId: '',
        type: taskData.type || 'maintenance',
        status: 'todo',
        priority: taskData.priority || 'normal',
        date: new Date().toISOString().split('T')[0]
    };
    
    this.tasks.update(current => [newTask, ...current]);
  }

  // CORE LOGIC: Check for overlaps
  // Returns true if overlap exists
  checkOverlap(unitId: string, startDate: string, length: number, excludeBookingId?: string): boolean {
    const start = new Date(startDate).getTime();
    const end = start + (length * 24 * 60 * 60 * 1000);

    return this.bookings().some(b => {
      if (b.unitId !== unitId || b.id === excludeBookingId) return false;
      const bStart = new Date(b.startDate).getTime();
      const bEnd = bStart + (b.length * 24 * 60 * 60 * 1000);

      // Overlap formula: (StartA < EndB) && (EndA > StartB)
      return (start < bEnd) && (end > bStart);
    });
  }

  updateBookingPosition(bookingId: string, newUnitId: string, newStartDate: string) {
    const booking = this.bookings().find(b => b.id === bookingId);
    if (!booking) return;

    // Simulate backend validation
    const hasOverlap = this.checkOverlap(newUnitId, newStartDate, booking.length, bookingId);
    
    this.bookings.update(current => current.map(b => {
      if (b.id === bookingId) {
        return { 
          ...b, 
          unitId: newUnitId, 
          startDate: newStartDate,
          status: hasOverlap ? 'conflict' : (b.status === 'conflict' ? 'confirmed' : b.status)
        };
      }
      return b;
    }));
  }
}