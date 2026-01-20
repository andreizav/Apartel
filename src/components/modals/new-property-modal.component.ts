import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, PropertyUnit } from '../../services/data.service';

@Component({
  selector: 'app-new-property-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-dark-900/80 backdrop-blur-sm" (click)="close()"></div>
      <div class="relative w-full max-w-lg bg-dark-800 rounded-2xl shadow-2xl border border-dark-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-dark-700 bg-dark-800 flex items-center justify-between">
          <h2 class="text-lg font-bold text-white font-display">Add New Property</h2>
          <button (click)="close()" class="text-slate-400 hover:text-white"><span class="material-symbols-rounded">close</span></button>
        </div>
        
        <div class="p-6 space-y-4">
            <!-- Internal Name -->
            <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400 uppercase">Internal Name</label>
                <input type="text" [(ngModel)]="newUnit.name" placeholder="e.g. Art 3" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
            </div>

            <!-- Group Selection -->
            <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400 uppercase">Group</label>
                <select [(ngModel)]="selectedGroupId" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                    <option value="" disabled selected>Select Group</option>
                    @for (group of hierarchy(); track group.id) {
                        <option [value]="group.id">{{ group.name }}</option>
                    }
                </select>
            </div>

            <!-- Type & Status -->
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-slate-400 uppercase">Property Type</label>
                    <select [(ngModel)]="newUnit.type" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                        <option value="Rental">Rental</option>
                        <option value="Warehouse">Warehouse</option>
                        <option value="Office">Office</option>
                    </select>
                </div>
                 <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-slate-400 uppercase">Status</label>
                    <div class="flex items-center h-[42px]">
                        <label class="flex items-center cursor-pointer">
                            <div class="relative">
                                <input type="checkbox" [(ngModel)]="newUnit.isActive" class="sr-only">
                                <div class="block bg-dark-700 w-10 h-6 rounded-full" [class.bg-brand-600]="newUnit.isActive"></div>
                                <div class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition" [class.translate-x-4]="newUnit.isActive"></div>
                            </div>
                            <div class="ml-3 text-sm text-slate-300 font-medium">Rentable</div>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Address -->
            <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400 uppercase">Official Address</label>
                <input type="text" [(ngModel)]="newUnit.address" placeholder="e.g. 12 Khreshchatyk St" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
            </div>

            <!-- Financials -->
            <div class="grid grid-cols-2 gap-4">
                 <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-slate-400 uppercase">Base Price</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input type="number" [(ngModel)]="newUnit.basePrice" class="w-full bg-dark-900 border border-dark-700 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                    </div>
                </div>
                 <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-slate-400 uppercase">Cleaning Fee</label>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input type="number" [(ngModel)]="newUnit.cleaningFee" class="w-full bg-dark-900 border border-dark-700 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:ring-1 focus:ring-brand-500 outline-none">
                    </div>
                </div>
            </div>

        </div>

        <div class="px-6 py-4 bg-dark-900/50 border-t border-dark-700 flex justify-end gap-3">
             <button (click)="close()" class="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-dark-700 transition-colors text-sm font-medium">Cancel</button>
             <button (click)="save()" class="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-lg shadow-brand-900/50 transition-all flex items-center gap-2">
                <span class="material-symbols-rounded text-lg">check</span> Create Unit
             </button>
        </div>
      </div>
    </div>
  `
})
export class NewPropertyModalComponent {
  dataService = inject(DataService);
  hierarchy = this.dataService.hierarchy;

  newUnit: Partial<PropertyUnit> = {
      name: '',
      type: 'Rental',
      isActive: true,
      address: '',
      status: 'active',
      basePrice: 0,
      cleaningFee: 0
  };
  selectedGroupId = '';

  close() {
      this.dataService.showNewPropertyModal.set(false);
  }

  save() {
      if (!this.newUnit.name || !this.selectedGroupId) {
          alert('Name and Group are required');
          return;
      }
      this.dataService.addPropertyUnit(this.newUnit, this.selectedGroupId);
  }
}