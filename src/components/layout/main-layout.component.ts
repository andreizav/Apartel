import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { DataService } from '../../services/data.service';
import { NewBookingModalComponent } from '../modals/new-booking-modal.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NewBookingModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen overflow-hidden bg-dark-900 text-slate-200 font-sans">
      
      <!-- Sidebar -->
      <aside class="w-64 flex-shrink-0 bg-dark-800 border-r border-dark-700 flex flex-col">
        <!-- Logo -->
        <div class="h-16 flex items-center px-6 border-b border-dark-700 bg-dark-900/50">
          <span class="material-symbols-rounded text-brand-500 mr-2">apartment</span>
          <span class="text-xl font-display font-bold text-white tracking-tight">apartEl</span>
        </div>

        <!-- Nav Links -->
        <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <a routerLink="/app/calendar" routerLinkActive="bg-brand-600/10 text-brand-500 border-brand-500" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-700 hover:text-white transition-colors border-l-2 border-transparent">
            <span class="material-symbols-rounded">calendar_month</span>
            Multi-Calendar
          </a>
          <a routerLink="/app/properties" routerLinkActive="bg-brand-600/10 text-brand-500 border-brand-500" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-700 hover:text-white transition-colors border-l-2 border-transparent">
            <span class="material-symbols-rounded">holiday_village</span>
            Properties
          </a>
          <a routerLink="/app/tasks" routerLinkActive="bg-brand-600/10 text-brand-500 border-brand-500" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-700 hover:text-white transition-colors border-l-2 border-transparent">
            <span class="material-symbols-rounded">task_alt</span>
            Tasks & Staff
          </a>
          <a routerLink="/app/finance" routerLinkActive="bg-brand-600/10 text-brand-500 border-brand-500" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-700 hover:text-white transition-colors border-l-2 border-transparent">
            <span class="material-symbols-rounded">payments</span>
            Finance (P&L)
          </a>
          <a routerLink="/app/inventory" routerLinkActive="bg-brand-600/10 text-brand-500 border-brand-500" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-700 hover:text-white transition-colors border-l-2 border-transparent">
            <span class="material-symbols-rounded">inventory_2</span>
            Inventory
          </a>
          <a routerLink="/app/connect" routerLinkActive="bg-brand-600/10 text-brand-500 border-brand-500" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-700 hover:text-white transition-colors border-l-2 border-transparent">
            <span class="material-symbols-rounded">hub</span>
            Channel Manager
          </a>
          
          <div class="pt-4 mt-4 border-t border-dark-700">
             <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">System</p>
             <a routerLink="/app/import" routerLinkActive="bg-brand-600/10 text-brand-500 border-brand-500" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-700 hover:text-white transition-colors border-l-2 border-transparent">
                <span class="material-symbols-rounded">upload_file</span>
                Data Import
            </a>
             <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-700 hover:text-white transition-colors">
                <span class="material-symbols-rounded">settings</span>
                Configuration
            </a>
          </div>
        </nav>

        <!-- User Profile -->
        <div class="p-4 border-t border-dark-700">
          <div class="flex items-center gap-3">
            <img src="https://picsum.photos/40/40" class="w-9 h-9 rounded-full ring-2 ring-dark-600" alt="Admin">
            <div>
              <p class="text-sm font-bold text-white">Alex Admin</p>
              <p class="text-xs text-slate-500">Global Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 relative">
        
        <!-- Header -->
        <header class="h-16 bg-dark-800 border-b border-dark-700 flex items-center justify-between px-6 shadow-sm z-10">
           <!-- Search -->
           <div class="relative w-96">
             <span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
             <input type="text" placeholder="Search booking, guest or unit..." 
                class="w-full bg-dark-900 border border-dark-700 text-sm text-white rounded-lg pl-10 pr-4 py-2 focus:ring-1 focus:ring-brand-500 outline-none">
           </div>

           <!-- Actions -->
           <div class="flex items-center gap-4">
             <button class="relative p-2 text-slate-400 hover:text-white hover:bg-dark-700 rounded-full transition-colors">
                <span class="material-symbols-rounded">notifications</span>
                <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-dark-800"></span>
             </button>
             <button (click)="openNewBooking()" class="bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-brand-900/50 transition-all active:scale-[0.98]">
                <span class="material-symbols-rounded text-lg">add</span>
                New Booking
             </button>
           </div>
        </header>

        <!-- Dynamic Content -->
        <main class="flex-1 overflow-hidden bg-dark-900 relative">
          <router-outlet></router-outlet>
        </main>
        
        <!-- Modal Overlay -->
        @if (dataService.showNewBookingModal()) {
          <app-new-booking-modal />
        }

      </div>
    </div>
  `
})
export class MainLayoutComponent {
  dataService = inject(DataService);

  openNewBooking() {
    this.dataService.showNewBookingModal.set(true);
  }
}