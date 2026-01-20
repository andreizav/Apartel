import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 max-w-7xl mx-auto">
        <div class="flex items-center justify-between mb-8">
            <div>
              <h1 class="text-2xl font-bold font-display text-white">Inventory & Logistics</h1>
              <p class="text-slate-400">Manage warehouse stock and apartment passports</p>
            </div>
            <div class="flex gap-3">
                 <button class="px-4 py-2 border border-dark-600 rounded-lg text-slate-300 hover:text-white hover:bg-dark-700 transition-colors">
                    Search Passport
                </button>
                <button class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
                    Reorder Stock
                </button>
            </div>
        </div>

        <!-- Alert Banner -->
        <div class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 flex items-start gap-3">
            <span class="material-symbols-rounded text-amber-500 mt-0.5">warning</span>
            <div>
                <h4 class="text-amber-500 font-bold text-sm">Low Stock Alert</h4>
                <p class="text-amber-200/70 text-sm">3 items are below minimum threshold. Please restock "Office" warehouse.</p>
            </div>
        </div>

        <div class="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden shadow-sm">
            <div class="p-4 border-b border-dark-700 bg-dark-800/50 flex gap-4">
                <button class="px-4 py-2 rounded-lg bg-dark-700 text-white text-sm font-bold">Warehouse (Office)</button>
                <button class="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors text-sm font-medium">Unit Passports</button>
            </div>
            
            <table class="w-full text-left text-sm">
                <thead class="bg-dark-900 text-slate-400 border-b border-dark-700">
                    <tr>
                        <th class="px-6 py-4 font-semibold">Item Name</th>
                        <th class="px-6 py-4 font-semibold">Category</th>
                        <th class="px-6 py-4 font-semibold">In Stock</th>
                        <th class="px-6 py-4 font-semibold">Status</th>
                        <th class="px-6 py-4 font-semibold text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-dark-700">
                    <tr class="hover:bg-dark-700/30 transition-colors">
                        <td class="px-6 py-4 font-medium text-white">Shampoo (50ml)</td>
                        <td class="px-6 py-4 text-slate-400">Consumables</td>
                        <td class="px-6 py-4 text-white font-mono">142</td>
                        <td class="px-6 py-4">
                            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> OK
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button class="text-slate-400 hover:text-white">Edit</button>
                        </td>
                    </tr>
                     <tr class="hover:bg-dark-700/30 transition-colors bg-red-500/5">
                        <td class="px-6 py-4 font-medium text-white">Coffee Pods</td>
                        <td class="px-6 py-4 text-slate-400">Kitchen</td>
                        <td class="px-6 py-4 text-white font-mono">12</td>
                        <td class="px-6 py-4">
                            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                                <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Low
                            </span>
                        </td>
                         <td class="px-6 py-4 text-right">
                            <button class="text-brand-500 hover:text-brand-400 font-bold">Order</button>
                        </td>
                    </tr>
                    <tr class="hover:bg-dark-700/30 transition-colors">
                        <td class="px-6 py-4 font-medium text-white">Toilet Paper (Premium)</td>
                        <td class="px-6 py-4 text-slate-400">Consumables</td>
                        <td class="px-6 py-4 text-white font-mono">85</td>
                        <td class="px-6 py-4">
                            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> OK
                            </span>
                        </td>
                         <td class="px-6 py-4 text-right">
                            <button class="text-slate-400 hover:text-white">Edit</button>
                        </td>
                    </tr>
                    <tr class="hover:bg-dark-700/30 transition-colors">
                        <td class="px-6 py-4 font-medium text-white">Bed Linen Set (King)</td>
                        <td class="px-6 py-4 text-slate-400">Laundry / Assets</td>
                        <td class="px-6 py-4 text-white font-mono">15</td>
                        <td class="px-6 py-4">
                             <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Warning
                            </span>
                        </td>
                         <td class="px-6 py-4 text-right">
                            <button class="text-brand-500 hover:text-brand-400 font-bold">Check</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  `
})
export class InventoryComponent {}