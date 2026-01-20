import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, PropertyUnit, PropertyGroup } from '../../services/data.service';
import { NewPropertyModalComponent } from '../modals/new-property-modal.component';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, FormsModule, NewPropertyModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex bg-dark-900">
      
      <!-- Left Sidebar: Hierarchy Tree -->
      <aside class="w-80 border-r border-dark-700 bg-dark-800 flex flex-col">
        <div class="p-4 border-b border-dark-700 flex justify-between items-center bg-dark-900/50">
           <h2 class="font-bold text-white font-display">Portfolio</h2>
           <button (click)="openNewPropertyModal()" class="text-xs bg-brand-600 hover:bg-brand-500 text-white px-2 py-1 rounded flex items-center gap-1">
             <span class="material-symbols-rounded text-sm">add</span> New
           </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-2">
            @for (group of hierarchy(); track group.id) {
                <div class="mb-1">
                    <!-- Group Header -->
                    <div class="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors group"
                         [class.bg-dark-700]="selectedId() === group.id"
                         (click)="selectGroup(group)">
                        
                        <button (click)="toggleGroup(group.id, $event)" class="text-slate-500 hover:text-white">
                            <span class="material-symbols-rounded text-lg transition-transform" [class.rotate-90]="group.expanded">chevron_right</span>
                        </button>
                        
                        <span class="material-symbols-rounded text-amber-500">folder</span>
                        <span class="text-sm font-medium text-slate-200 flex-1 truncate">{{ group.name }}</span>
                        <span class="text-[10px] bg-dark-900 text-slate-500 px-1.5 rounded">{{ group.units.length }}</span>
                    </div>

                    <!-- Unit List -->
                    @if (group.expanded) {
                        <div class="ml-4 pl-3 border-l border-dark-600 mt-1 space-y-0.5">
                            @for (unit of group.units; track unit.id) {
                                <div class="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-dark-700/50 transition-colors"
                                     [class.bg-brand-900_20]="selectedId() === unit.id"
                                     [class.text-brand-400]="selectedId() === unit.id"
                                     (click)="selectUnit(unit)">
                                    
                                    @if(unit.type === 'Office') {
                                        <span class="material-symbols-rounded text-sm text-slate-500">warehouse</span>
                                    } @else {
                                        <span class="material-symbols-rounded text-sm" [class.text-brand-500]="selectedId() === unit.id" [class.text-slate-500]="selectedId() !== unit.id">home</span>
                                    }
                                    
                                    <span class="text-sm truncate" [class.text-white]="selectedId() === unit.id" [class.text-slate-400]="selectedId() !== unit.id">
                                        {{ unit.name }}
                                    </span>

                                    @if(!unit.isActive) {
                                        <span class="w-1.5 h-1.5 rounded-full bg-red-500 ml-auto" title="Inactive/Maintenance"></span>
                                    }
                                </div>
                            }
                        </div>
                    }
                </div>
            }
        </div>
      </aside>

      <!-- Main Content: Details -->
      <main class="flex-1 flex flex-col min-w-0 bg-dark-900 relative">
        
        @if (selectedUnit()) {
            <!-- Header -->
            <div class="h-16 border-b border-dark-700 bg-dark-800 px-6 flex items-center justify-between">
                <div>
                    <h1 class="text-xl font-bold text-white font-display flex items-center gap-2">
                        {{ selectedUnit()!.name }}
                        @if (selectedUnit()!.type === 'Office') {
                             <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300">Non-Rentable</span>
                        } @else {
                             <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-900/30 text-brand-400">Rentable Unit</span>
                        }
                    </h1>
                    <p class="text-xs text-slate-400 font-mono">{{ selectedUnit()!.id }}</p>
                </div>
                
                <div class="flex items-center gap-3">
                     <!-- Status Toggle (Simulated) -->
                    <div class="flex items-center bg-dark-900 rounded-full p-1 border border-dark-700">
                        <button class="px-3 py-1 rounded-full text-xs font-bold transition-all"
                            [class.bg-emerald-600]="selectedUnit()!.status === 'active'"
                            [class.text-white]="selectedUnit()!.status === 'active'"
                            [class.text-slate-500]="selectedUnit()!.status !== 'active'">
                            Active
                        </button>
                        <button class="px-3 py-1 rounded-full text-xs font-bold transition-all"
                             [class.bg-amber-600]="selectedUnit()!.status === 'maintenance'"
                             [class.text-white]="selectedUnit()!.status === 'maintenance'"
                             [class.text-slate-500]="selectedUnit()!.status !== 'maintenance'">
                            Maintenance
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <div class="px-6 border-b border-dark-700 flex gap-6 mt-4">
                <button (click)="activeTab.set('info')" 
                    class="pb-3 text-sm font-medium border-b-2 transition-colors"
                    [class.border-brand-500]="activeTab() === 'info'"
                    [class.text-white]="activeTab() === 'info'"
                    [class.border-transparent]="activeTab() !== 'info'"
                    [class.text-slate-400]="activeTab() !== 'info'">
                    Basic Info
                </button>
                <button (click)="activeTab.set('photos')" 
                    class="pb-3 text-sm font-medium border-b-2 transition-colors"
                    [class.border-brand-500]="activeTab() === 'photos'"
                    [class.text-white]="activeTab() === 'photos'"
                    [class.border-transparent]="activeTab() !== 'photos'"
                    [class.text-slate-400]="activeTab() !== 'photos'">
                    Photos
                </button>
                <button (click)="activeTab.set('inventory')" 
                    class="pb-3 text-sm font-medium border-b-2 transition-colors"
                    [class.border-brand-500]="activeTab() === 'inventory'"
                    [class.text-white]="activeTab() === 'inventory'"
                    [class.border-transparent]="activeTab() !== 'inventory'"
                    [class.text-slate-400]="activeTab() !== 'inventory'">
                    Inventory
                </button>
                <button (click)="activeTab.set('settings')" 
                    class="pb-3 text-sm font-medium border-b-2 transition-colors"
                    [class.border-brand-500]="activeTab() === 'settings'"
                    [class.text-white]="activeTab() === 'settings'"
                    [class.border-transparent]="activeTab() !== 'settings'"
                    [class.text-slate-400]="activeTab() !== 'settings'">
                    Settings
                </button>
            </div>

            <!-- Tab Content -->
            <div class="p-6 overflow-y-auto flex-1">
                @switch (activeTab()) {
                    @case ('info') {
                        <div class="max-w-3xl space-y-6">
                            <!-- Location -->
                            <div class="bg-dark-800 p-5 rounded-xl border border-dark-700">
                                <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                                    <span class="material-symbols-rounded text-brand-500">pin_drop</span> Location & Address
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="space-y-1">
                                        <label class="text-xs font-bold text-slate-400 uppercase">Internal Name</label>
                                        <input type="text" [value]="selectedUnit()!.name" class="w-full bg-dark-900 border border-dark-600 rounded px-3 py-2 text-white">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-xs font-bold text-slate-400 uppercase">Official Address</label>
                                        <input type="text" [value]="selectedUnit()!.address || ''" class="w-full bg-dark-900 border border-dark-600 rounded px-3 py-2 text-white">
                                    </div>
                                </div>
                            </div>

                            <!-- Financials (Read only view for now) -->
                            <div class="bg-dark-800 p-5 rounded-xl border border-dark-700">
                                <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                                    <span class="material-symbols-rounded text-brand-500">payments</span> Base Pricing
                                </h3>
                                <div class="grid grid-cols-2 gap-4">
                                     <div class="space-y-1">
                                        <label class="text-xs font-bold text-slate-400 uppercase">Base Price</label>
                                        <p class="text-white font-mono text-lg">\${{ selectedUnit()!.basePrice || 0 }}</p>
                                    </div>
                                     <div class="space-y-1">
                                        <label class="text-xs font-bold text-slate-400 uppercase">Cleaning Fee</label>
                                        <p class="text-white font-mono text-lg">\${{ selectedUnit()!.cleaningFee || 0 }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Connectivity -->
                            <div class="bg-dark-800 p-5 rounded-xl border border-dark-700">
                                <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                                    <span class="material-symbols-rounded text-brand-500">wifi</span> Connectivity & Access
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="space-y-1">
                                        <label class="text-xs font-bold text-slate-400 uppercase">WiFi SSID</label>
                                        <input type="text" [value]="selectedUnit()!.wifiSsid || ''" class="w-full bg-dark-900 border border-dark-600 rounded px-3 py-2 text-white font-mono">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-xs font-bold text-slate-400 uppercase">WiFi Password</label>
                                        <div class="relative">
                                            <input type="text" [value]="selectedUnit()!.wifiPwd || ''" class="w-full bg-dark-900 border border-dark-600 rounded px-3 py-2 text-white font-mono">
                                            <button class="absolute right-2 top-2 text-slate-500 hover:text-white"><span class="material-symbols-rounded text-sm">content_copy</span></button>
                                        </div>
                                    </div>
                                    <div class="space-y-1 md:col-span-2">
                                        <label class="text-xs font-bold text-slate-400 uppercase">Access Codes (Door/Alarm)</label>
                                        <textarea class="w-full bg-dark-900 border border-dark-600 rounded px-3 py-2 text-white font-mono text-sm h-20">{{ selectedUnit()!.accessCodes }}</textarea>
                                        <p class="text-[10px] text-slate-500">This info will be sent to confirmed guests 24h before check-in.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                    @case ('photos') {
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="aspect-square bg-dark-800 rounded-lg border-2 border-dashed border-dark-600 flex flex-col items-center justify-center text-slate-500 hover:border-brand-500 hover:text-brand-500 transition-colors cursor-pointer">
                                <span class="material-symbols-rounded text-3xl">add_a_photo</span>
                                <span class="text-xs font-bold mt-2">Upload</span>
                            </div>
                            <img src="https://picsum.photos/400/400?random=1" class="aspect-square object-cover rounded-lg border border-dark-700">
                            <img src="https://picsum.photos/400/400?random=2" class="aspect-square object-cover rounded-lg border border-dark-700">
                            <img src="https://picsum.photos/400/400?random=3" class="aspect-square object-cover rounded-lg border border-dark-700">
                        </div>
                    }
                    @case ('inventory') {
                        <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                             <table class="w-full text-left text-sm">
                                <thead class="bg-dark-900/50 text-slate-400 border-b border-dark-700">
                                    <tr>
                                        <th class="px-6 py-3 font-medium">Item</th>
                                        <th class="px-6 py-3 font-medium">Category</th>
                                        <th class="px-6 py-3 font-medium text-right">Qty</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-dark-700">
                                    <tr class="hover:bg-dark-700/30">
                                        <td class="px-6 py-3 text-white">Samsung 42" TV</td>
                                        <td class="px-6 py-3 text-slate-500">Electronics</td>
                                        <td class="px-6 py-3 text-right text-slate-300">1</td>
                                    </tr>
                                     <tr class="hover:bg-dark-700/30">
                                        <td class="px-6 py-3 text-white">Nespresso Machine</td>
                                        <td class="px-6 py-3 text-slate-500">Kitchen</td>
                                        <td class="px-6 py-3 text-right text-slate-300">1</td>
                                    </tr>
                                     <tr class="hover:bg-dark-700/30">
                                        <td class="px-6 py-3 text-white">Hair Dryer (Philips)</td>
                                        <td class="px-6 py-3 text-slate-500">Bathroom</td>
                                        <td class="px-6 py-3 text-right text-slate-300">1</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="p-4 bg-dark-900/30 border-t border-dark-700 flex justify-center">
                                <button class="text-sm text-brand-500 font-bold hover:text-brand-400">Manage in Inventory Module</button>
                            </div>
                        </div>
                    }
                    @case ('settings') {
                        <div class="bg-dark-800 p-6 rounded-xl border border-dark-700 max-w-2xl">
                            <h3 class="font-bold text-white mb-6 text-lg">Unit Configuration</h3>
                            
                            <div class="flex items-center justify-between mb-6 pb-6 border-b border-dark-700">
                                <div>
                                    <h4 class="font-bold text-white">Rentable Unit</h4>
                                    <p class="text-sm text-slate-400">Enable this to list the unit on booking channels.</p>
                                </div>
                                <div class="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" [checked]="selectedUnit()!.isActive" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                                    <label class="toggle-label block overflow-hidden h-6 rounded-full bg-brand-500 cursor-pointer"></label>
                                </div>
                            </div>

                             <div class="space-y-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-bold text-slate-400 uppercase">Unit Type</label>
                                    <select [value]="selectedUnit()!.type" class="w-full bg-dark-900 border border-dark-600 rounded px-3 py-2 text-white">
                                        <option value="Rental">Rental Apartment</option>
                                        <option value="Office">Office (Non-Bookable)</option>
                                        <option value="Warehouse">Warehouse (Logistics)</option>
                                    </select>
                                    <p class="text-xs text-slate-500 mt-1">Changing this to "Office" or "Warehouse" will remove it from the Multi-Calendar.</p>
                                </div>
                             </div>
                        </div>
                    }
                }
            </div>

        } @else if (selectedGroup()) {
             <!-- Group View (Stats) -->
             <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div class="w-20 h-20 bg-dark-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-dark-700">
                    <span class="material-symbols-rounded text-4xl text-amber-500">folder_open</span>
                </div>
                <h1 class="text-3xl font-bold text-white mb-2">{{ selectedGroup()!.name }}</h1>
                <p class="text-slate-400 mb-8 max-w-md">This group contains {{ selectedGroup()!.units.length }} units. Settings applied here will cascade to all child units unless overridden.</p>
                
                <div class="grid grid-cols-2 gap-4 w-full max-w-lg">
                    <div class="bg-dark-800 p-4 rounded-xl border border-dark-700">
                        <p class="text-slate-400 text-xs uppercase font-bold">Total Units</p>
                        <p class="text-2xl font-bold text-white">{{ selectedGroup()!.units.length }}</p>
                    </div>
                     <div class="bg-dark-800 p-4 rounded-xl border border-dark-700">
                        <p class="text-slate-400 text-xs uppercase font-bold">Occupancy (Avg)</p>
                        <p class="text-2xl font-bold text-emerald-500">{{ selectedGroup()!.stats?.occupancy }}%</p>
                    </div>
                </div>
             </div>
        } @else {
            <!-- Empty State -->
             <div class="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                <span class="material-symbols-rounded text-6xl text-slate-600 mb-4">holiday_village</span>
                <p class="text-slate-400">Select a Group or Unit from the sidebar to view details.</p>
             </div>
        }

        @if (dataService.showNewPropertyModal()) {
            <app-new-property-modal />
        }

      </main>
    </div>
  `
})
export class PropertiesComponent {
  dataService = inject(DataService);
  hierarchy = this.dataService.hierarchy;

  selectedId = signal<string | null>(null);
  selectedUnit = signal<PropertyUnit | null>(null);
  selectedGroup = signal<PropertyGroup | null>(null);
  
  activeTab = signal<'info' | 'photos' | 'inventory' | 'settings'>('info');

  toggleGroup(groupId: string, event: Event) {
    event.stopPropagation();
    this.hierarchy.update(groups => 
      groups.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g)
    );
  }

  selectGroup(group: PropertyGroup) {
    this.selectedId.set(group.id);
    this.selectedGroup.set(group);
    this.selectedUnit.set(null);
  }

  selectUnit(unit: PropertyUnit) {
    this.selectedId.set(unit.id);
    this.selectedUnit.set(unit);
    this.selectedGroup.set(null);
    this.activeTab.set('info'); // Reset tab
  }

  openNewPropertyModal() {
      this.dataService.showNewPropertyModal.set(true);
  }
}