import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 max-w-7xl mx-auto h-full flex flex-col">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-display font-bold text-white">Channel Manager</h1>
          <p class="text-slate-400">Map internal units to OTA listings for real-time synchronization.</p>
        </div>
        <div class="flex gap-3">
             <button routerLink="/app/connect/logs" class="px-4 py-2 border border-dark-600 rounded-lg text-slate-300 hover:text-white hover:bg-dark-700 transition-colors flex items-center gap-2">
                <span class="material-symbols-rounded">history</span> Sync Logs
            </button>
            <button class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2">
                <span class="material-symbols-rounded">sync</span> Force Sync All
            </button>
        </div>
      </div>

      <!-- Channel Status Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Airbnb -->
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                 <!-- Simple SVG Icon placeholder -->
                 <svg class="w-8 h-8 text-[#FF5A5F]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-white">Airbnb</h3>
                <p class="text-xs text-emerald-500 font-bold flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Connected
                </p>
            </div>
            <div class="text-right">
                <div class="text-2xl font-bold text-white">18</div>
                <div class="text-xs text-slate-500">Listings</div>
            </div>
        </div>

        <!-- Booking.com -->
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-5 flex items-center gap-4">
             <div class="w-12 h-12 rounded-full bg-[#003580] flex items-center justify-center flex-shrink-0">
                 <span class="font-bold text-white text-lg">B.</span>
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-white">Booking.com</h3>
                <p class="text-xs text-emerald-500 font-bold flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Connected
                </p>
            </div>
            <div class="text-right">
                <div class="text-2xl font-bold text-white">22</div>
                <div class="text-xs text-slate-500">Rooms</div>
            </div>
        </div>

        <!-- Expedia -->
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-5 flex items-center gap-4 opacity-60 grayscale">
             <div class="w-12 h-12 rounded-full bg-[#00355f] flex items-center justify-center flex-shrink-0">
                 <span class="font-bold text-white text-lg">E</span>
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-white">Expedia</h3>
                <p class="text-xs text-slate-500 font-bold flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-slate-500"></span> Not Configured
                </p>
            </div>
            <button class="text-xs bg-dark-700 hover:bg-dark-600 text-white px-3 py-1.5 rounded">Connect</button>
        </div>
      </div>

      <!-- Mapping Table -->
      <div class="bg-dark-800 border border-dark-700 rounded-xl flex-1 flex flex-col overflow-hidden">
        <div class="p-4 border-b border-dark-700 bg-dark-900/50 flex justify-between items-center">
            <h3 class="font-bold text-white">Unit Mapping Configuration</h3>
            <div class="flex items-center gap-2 text-sm text-slate-400">
                <span class="w-3 h-3 bg-brand-500/20 border border-brand-500 rounded-sm"></span> Mapped
                <span class="w-3 h-3 bg-dark-700 border border-dark-600 rounded-sm"></span> Unmapped
            </div>
        </div>

        <div class="flex-1 overflow-auto">
            <table class="w-full text-left text-sm">
                <thead class="bg-dark-900 text-slate-400 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-6 py-4 font-semibold w-1/4">Internal Unit (Hierarchy)</th>
                        <th class="px-6 py-4 font-semibold w-1/4">Airbnb Listing ID</th>
                        <th class="px-6 py-4 font-semibold w-1/4">Booking.com Room ID</th>
                        <th class="px-6 py-4 font-semibold w-1/6">Markup %</th>
                        <th class="px-6 py-4 font-semibold text-right">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-dark-700">
                    @for (group of hierarchy(); track group.name) {
                        <!-- Group Header -->
                        <tr class="bg-dark-800/80">
                            <td colspan="5" class="px-6 py-2 font-bold text-slate-300 text-xs uppercase tracking-wider">
                                {{ group.name }}
                            </td>
                        </tr>
                        @for (unit of group.units; track unit.id) {
                            <tr class="hover:bg-dark-700/30 transition-colors group">
                                <td class="px-6 py-4 font-medium text-white flex items-center gap-2">
                                    <span class="material-symbols-rounded text-slate-500 text-lg">home</span>
                                    {{ unit.name }}
                                </td>
                                
                                <!-- Airbnb Input -->
                                <td class="px-6 py-3">
                                    <div class="relative">
                                        <input type="text" placeholder="e.g. 18239012" 
                                            class="w-full bg-dark-900 border border-dark-700 rounded px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors group-hover:bg-dark-900/80">
                                        <div class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">ABNB</div>
                                    </div>
                                </td>

                                <!-- Booking Input -->
                                <td class="px-6 py-3">
                                    <div class="relative">
                                        <input type="text" placeholder="e.g. 98321_02" 
                                            class="w-full bg-dark-900 border border-dark-700 rounded px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors group-hover:bg-dark-900/80">
                                        <div class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">BKG</div>
                                    </div>
                                </td>

                                <!-- Markup -->
                                <td class="px-6 py-3">
                                    <div class="flex items-center gap-2">
                                        <input type="number" value="15" 
                                            class="w-16 bg-dark-900 border border-dark-700 rounded px-2 py-2 text-right text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 outline-none">
                                        <span class="text-slate-500">%</span>
                                    </div>
                                </td>

                                <!-- Action -->
                                <td class="px-6 py-4 text-right">
                                     <button class="text-brand-500 hover:text-white text-xs font-bold border border-brand-500/30 hover:bg-brand-600 px-3 py-1.5 rounded transition-all">
                                        Map
                                     </button>
                                </td>
                            </tr>
                        }
                    }
                </tbody>
            </table>
        </div>
      </div>

    </div>
  `
})
export class ConnectComponent {
  dataService = inject(DataService);
  hierarchy = this.dataService.hierarchy;
}