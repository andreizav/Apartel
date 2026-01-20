import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8">
      
      <div class="flex items-end justify-between">
        <div>
          <h1 class="text-3xl font-display font-bold text-white">Financial Performance</h1>
          <p class="text-slate-400">Profit & Loss Statement • October 2023</p>
        </div>
        <div class="flex bg-dark-800 p-1 rounded-lg border border-dark-700">
            <button class="px-4 py-1.5 rounded-md bg-brand-600 text-white text-sm font-bold shadow-sm">USD</button>
            <button class="px-4 py-1.5 rounded-md text-slate-400 hover:text-white text-sm font-medium">UAH</button>
            <button class="px-4 py-1.5 rounded-md text-slate-400 hover:text-white text-sm font-medium">EUR</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <!-- Revenue -->
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-6 relative overflow-hidden group">
            <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span class="material-symbols-rounded text-6xl text-brand-500">payments</span>
            </div>
            <p class="text-slate-400 text-sm font-medium mb-1">Total Revenue</p>
            <h3 class="text-3xl font-bold text-white mb-2">$42,500</h3>
            <span class="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">+12.5% vs last month</span>
        </div>

        <!-- Expenses -->
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-6 relative overflow-hidden group">
             <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span class="material-symbols-rounded text-6xl text-red-500">trending_down</span>
            </div>
            <p class="text-slate-400 text-sm font-medium mb-1">Total Expenses</p>
            <h3 class="text-3xl font-bold text-white mb-2">$15,200</h3>
            <span class="text-slate-500 text-xs font-bold bg-dark-700 px-2 py-1 rounded">Stable</span>
        </div>

        <!-- Net Profit -->
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-6 relative overflow-hidden group">
             <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span class="material-symbols-rounded text-6xl text-emerald-500">savings</span>
            </div>
            <p class="text-slate-400 text-sm font-medium mb-1">Net Profit</p>
            <h3 class="text-3xl font-bold text-white mb-2">$27,300</h3>
            <span class="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">+8.2% Margin</span>
        </div>

        <!-- ROI -->
        <div class="bg-dark-800 border border-dark-700 rounded-xl p-6 relative overflow-hidden group">
             <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span class="material-symbols-rounded text-6xl text-purple-500">monitoring</span>
            </div>
            <p class="text-slate-400 text-sm font-medium mb-1">ROI (Annual)</p>
            <h3 class="text-3xl font-bold text-white mb-2">18.4%</h3>
            <span class="text-purple-400 text-xs font-bold bg-purple-500/10 px-2 py-1 rounded">Target: 15%</span>
        </div>
      </div>

      <!-- Detail Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Expense Breakdown -->
        <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            <div class="p-5 border-b border-dark-700 flex justify-between items-center">
                <h3 class="font-bold text-white">Expense Categories</h3>
                <button class="text-brand-500 text-sm font-bold">Download Report</button>
            </div>
            <table class="w-full text-left text-sm">
                <thead class="bg-dark-900/50 text-slate-400">
                    <tr>
                        <th class="px-6 py-3 font-medium">Category</th>
                        <th class="px-6 py-3 font-medium text-right">Amount</th>
                        <th class="px-6 py-3 font-medium text-right">%</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-dark-700">
                    <tr class="hover:bg-dark-700/30 transition-colors">
                        <td class="px-6 py-4 flex items-center gap-2 text-slate-300">
                            <span class="material-symbols-rounded text-purple-400">cleaning_services</span> Cleaning
                        </td>
                        <td class="px-6 py-4 text-right text-white font-mono">$4,200</td>
                        <td class="px-6 py-4 text-right text-slate-500">28%</td>
                    </tr>
                    <tr class="hover:bg-dark-700/30 transition-colors">
                        <td class="px-6 py-4 flex items-center gap-2 text-slate-300">
                             <span class="material-symbols-rounded text-blue-400">local_laundry_service</span> Laundry
                        </td>
                        <td class="px-6 py-4 text-right text-white font-mono">$3,100</td>
                        <td class="px-6 py-4 text-right text-slate-500">20%</td>
                    </tr>
                    <tr class="hover:bg-dark-700/30 transition-colors">
                        <td class="px-6 py-4 flex items-center gap-2 text-slate-300">
                             <span class="material-symbols-rounded text-amber-400">directions_car</span> Cars & Logistics
                        </td>
                        <td class="px-6 py-4 text-right text-white font-mono">$2,800</td>
                        <td class="px-6 py-4 text-right text-slate-500">18%</td>
                    </tr>
                    <tr class="hover:bg-dark-700/30 transition-colors">
                        <td class="px-6 py-4 flex items-center gap-2 text-slate-300">
                             <span class="material-symbols-rounded text-slate-400">apartment</span> Common Maint.
                        </td>
                        <td class="px-6 py-4 text-right text-white font-mono">$1,500</td>
                        <td class="px-6 py-4 text-right text-slate-500">10%</td>
                    </tr>
                     <tr class="hover:bg-dark-700/30 transition-colors">
                        <td class="px-6 py-4 flex items-center gap-2 text-slate-300">
                             <span class="material-symbols-rounded text-slate-400">desk</span> Office
                        </td>
                        <td class="px-6 py-4 text-right text-white font-mono">$800</td>
                        <td class="px-6 py-4 text-right text-slate-500">5%</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Profitability Chart Placeholder -->
        <div class="bg-dark-800 rounded-xl border border-dark-700 p-6 flex flex-col">
            <h3 class="font-bold text-white mb-6">Income Source</h3>
            <div class="flex-1 flex items-end gap-4 px-4 pb-4 border-b border-dark-600">
                <!-- Simple CSS Bar Chart -->
                <div class="flex-1 flex flex-col items-center gap-2">
                    <div class="w-full bg-brand-500 rounded-t-lg hover:bg-brand-400 transition-colors relative group" style="height: 180px">
                        <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">$18k</div>
                    </div>
                    <span class="text-xs text-slate-400">Airbnb</span>
                </div>
                <div class="flex-1 flex flex-col items-center gap-2">
                    <div class="w-full bg-blue-600 rounded-t-lg hover:bg-blue-500 transition-colors relative group" style="height: 140px">
                        <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">$14k</div>
                    </div>
                    <span class="text-xs text-slate-400">Booking</span>
                </div>
                <div class="flex-1 flex flex-col items-center gap-2">
                    <div class="w-full bg-emerald-500 rounded-t-lg hover:bg-emerald-400 transition-colors relative group" style="height: 80px">
                         <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">$8k</div>
                    </div>
                    <span class="text-xs text-slate-400">Direct</span>
                </div>
            </div>
            <div class="mt-4 text-sm text-slate-400 text-center">
                Total Direct Bookings increased by <strong>15%</strong> this quarter.
            </div>
        </div>

      </div>

    </div>
  `
})
export class FinanceComponent {}