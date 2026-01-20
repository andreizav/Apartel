import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-sync-logs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
           <div class="flex items-center gap-2 mb-1">
             <a routerLink="/app/connect" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium group">
               <span class="material-symbols-rounded text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span> Back to Channel Manager
             </a>
           </div>
          <h1 class="text-3xl font-display font-bold text-white">Synchronization Logs</h1>
          <p class="text-slate-400">Audit trail of all real-time communication with external channels.</p>
        </div>
        <div class="flex gap-3">
            <button class="bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-lg border border-dark-700 font-medium flex items-center gap-2 shadow-sm transition-colors">
                <span class="material-symbols-rounded">download</span> Export CSV
            </button>
             <button class="bg-dark-800 hover:bg-dark-700 text-white px-4 py-2 rounded-lg border border-dark-700 font-medium flex items-center gap-2 shadow-sm transition-colors">
                <span class="material-symbols-rounded">refresh</span> Refresh
            </button>
        </div>
      </div>

      <!-- Logs Table Container -->
      <div class="bg-dark-800 border border-dark-700 rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
         <!-- Optional Filters (Visual Placeholder) -->
         <div class="p-4 border-b border-dark-700 bg-dark-900/30 flex gap-4">
            <div class="relative">
                <span class="material-symbols-rounded absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">filter_alt</span>
                <select class="bg-dark-900 border border-dark-700 text-slate-300 text-sm rounded-lg pl-8 pr-4 py-1.5 focus:ring-1 focus:ring-brand-500 outline-none">
                    <option>All Channels</option>
                    <option>Airbnb</option>
                    <option>Booking.com</option>
                </select>
            </div>
             <div class="relative">
                <span class="material-symbols-rounded absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">swap_vert</span>
                <select class="bg-dark-900 border border-dark-700 text-slate-300 text-sm rounded-lg pl-8 pr-4 py-1.5 focus:ring-1 focus:ring-brand-500 outline-none">
                    <option>All Types</option>
                    <option>PUSH</option>
                    <option>PULL</option>
                </select>
            </div>
         </div>

         <div class="flex-1 overflow-auto">
            <table class="w-full text-left text-sm">
                <thead class="bg-dark-900 text-slate-400 sticky top-0 z-10 shadow-sm border-b border-dark-700">
                    <tr>
                        <th class="px-6 py-4 font-semibold">Timestamp</th>
                        <th class="px-6 py-4 font-semibold">Channel</th>
                        <th class="px-6 py-4 font-semibold">Unit</th>
                        <th class="px-6 py-4 font-semibold">Type</th>
                        <th class="px-6 py-4 font-semibold">Action</th>
                        <th class="px-6 py-4 font-semibold text-right">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-dark-700">
                    @for (log of logs(); track log.id) {
                        <tr class="hover:bg-dark-700/30 transition-colors">
                            <td class="px-6 py-4 text-slate-300 font-mono text-xs">
                                {{ log.timestamp | date:'MMM d, HH:mm:ss' }}
                            </td>
                            <td class="px-6 py-4 text-white font-medium flex items-center gap-2">
                                @if(log.channel === 'Airbnb') {
                                    <span class="text-[#FF5A5F] material-symbols-rounded text-lg">cottage</span>
                                } @else if (log.channel === 'Booking.com') {
                                    <span class="text-[#003580] font-bold bg-white px-1 rounded-sm text-xs">B.</span>
                                } @else {
                                    <span class="text-slate-400 material-symbols-rounded text-lg">flight</span>
                                }
                                {{ log.channel }}
                            </td>
                            <td class="px-6 py-4 text-slate-300">{{ log.unitName }}</td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border"
                                    [class.bg-blue-500-10]="log.type === 'PULL'"
                                    [class.text-blue-400]="log.type === 'PULL'"
                                    [class.border-blue-500-20]="log.type === 'PULL'"
                                    [class.bg-purple-500-10]="log.type === 'PUSH'"
                                    [class.text-purple-400]="log.type === 'PUSH'"
                                    [class.border-purple-500-20]="log.type === 'PUSH'">
                                    {{ log.type }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-slate-300">
                                <div class="font-medium">{{ log.action }}</div>
                                @if (log.message) {
                                    <div class="text-xs text-red-400 mt-1 flex items-center gap-1">
                                        <span class="material-symbols-rounded text-[14px]">info</span> {{ log.message }}
                                    </div>
                                }
                            </td>
                            <td class="px-6 py-4 text-right">
                                @if (log.status === 'SUCCESS') {
                                    <span class="inline-flex items-center gap-1 text-emerald-500 font-bold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                        <span class="material-symbols-rounded text-sm">check_circle</span> Success
                                    </span>
                                } @else {
                                    <span class="inline-flex items-center gap-1 text-red-500 font-bold text-xs bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                                        <span class="material-symbols-rounded text-sm">cancel</span> Failed
                                    </span>
                                }
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
         </div>
      </div>
    </div>
  `
})
export class SyncLogsComponent {
  dataService = inject(DataService);
  logs = this.dataService.syncLogs;
}