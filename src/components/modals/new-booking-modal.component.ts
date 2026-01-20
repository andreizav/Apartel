import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Booking } from '../../services/data.service';

@Component({
  selector: 'app-new-booking-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-dark-900/80 backdrop-blur-sm transition-opacity" (click)="close()"></div>

      <!-- Modal Card -->
      <div class="relative w-full max-w-lg bg-dark-800 rounded-2xl shadow-2xl border border-dark-700 overflow-hidden transform transition-all">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-dark-700 bg-dark-800 flex items-center justify-between">
          <h2 class="text-lg font-bold text-white font-display">
            {{ isEditMode ? 'Edit Reservation' : 'New Reservation' }}
          </h2>
          <button (click)="close()" class="text-slate-400 hover:text-white transition-colors">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          
          <!-- Unit & Source -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400 uppercase">Unit</label>
              <select [(ngModel)]="booking.unitId" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                <option value="" disabled selected>Select Unit</option>
                @for (group of hierarchy(); track group.name) {
                  <optgroup [label]="group.name">
                    @for (unit of group.units; track unit.id) {
                      <option [value]="unit.id">{{ unit.name }}</option>
                    }
                  </optgroup>
                }
              </select>
            </div>
            <div class="space-y-1.5">
               <label class="text-xs font-semibold text-slate-400 uppercase">Source</label>
               <select [(ngModel)]="booking.source" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                  <option value="Direct">Direct</option>
                  <option value="Airbnb">Airbnb</option>
                  <option value="Booking">Booking.com</option>
               </select>
            </div>
          </div>

          <!-- Guest Name -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-400 uppercase">Guest Name</label>
            <input type="text" [(ngModel)]="booking.guestName" placeholder="e.g. John Doe" 
              class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
          </div>

          <!-- Dates & Length -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
               <label class="text-xs font-semibold text-slate-400 uppercase">Check-in Date</label>
               <input type="date" [(ngModel)]="booking.startDate" 
                 class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
            </div>
            <div class="space-y-1.5">
               <label class="text-xs font-semibold text-slate-400 uppercase">Nights</label>
               <input type="number" [(ngModel)]="booking.length" min="1" 
                 class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
            </div>
          </div>

          <!-- Price & Status -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
               <label class="text-xs font-semibold text-slate-400 uppercase">Total Price</label>
               <div class="relative">
                 <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                 <input type="number" [(ngModel)]="booking.price" 
                   class="w-full bg-dark-900 border border-dark-700 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
               </div>
            </div>
            <div class="space-y-1.5">
               <label class="text-xs font-semibold text-slate-400 uppercase">Status</label>
               <select [(ngModel)]="booking.status" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                  <option value="confirmed">Confirmed</option>
                  <option value="payment-pending">Payment Pending</option>
                  <option value="blocked">Blocked (Maintenance)</option>
               </select>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-dark-900/50 border-t border-dark-700 flex justify-end gap-3">
          <button (click)="close()" class="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-dark-700 transition-colors text-sm font-medium">
            Cancel
          </button>
          <button (click)="save()" class="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-lg shadow-brand-900/50 transition-all flex items-center gap-2">
            <span class="material-symbols-rounded text-lg">check</span> {{ isEditMode ? 'Update' : 'Save' }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class NewBookingModalComponent implements OnInit {
  dataService = inject(DataService);
  hierarchy = this.dataService.hierarchy;

  booking: Partial<Booking> = {
    unitId: '',
    source: 'Direct',
    startDate: new Date().toISOString().split('T')[0],
    length: 1,
    status: 'confirmed',
    price: 0
  };

  isEditMode = false;

  ngOnInit() {
    const selected = this.dataService.selectedBooking();
    if (selected) {
      this.isEditMode = true;
      // Clone to avoid direct mutation
      this.booking = { ...selected };
    }
  }

  close() {
    this.dataService.showNewBookingModal.set(false);
    this.dataService.selectedBooking.set(null);
  }

  save() {
    if (!this.booking.unitId || !this.booking.guestName) {
        alert('Please fill in Unit and Guest Name');
        return;
    }

    if (this.isEditMode) {
      this.dataService.updateBooking(this.booking as Booking);
    } else {
      this.dataService.addBooking(this.booking);
    }
  }
}