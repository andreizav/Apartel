import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar-context-menu',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed z-50 w-56 bg-dark-800 rounded-lg shadow-xl border border-dark-700 py-1 overflow-hidden ring-1 ring-black/5"
         [style.left.px]="x()"
         [style.top.px]="y()">
       
       <div class="px-3 py-2 border-b border-dark-700 mb-1">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</p>
       </div>

       <button (click)="action.emit('details')" class="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-dark-700 flex items-center gap-2">
          <span class="material-symbols-rounded text-slate-400">visibility</span> View Details
       </button>
       <button (click)="action.emit('clean')" class="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-dark-700 flex items-center gap-2">
          <span class="material-symbols-rounded text-emerald-500">cleaning_services</span> Mark Clean
       </button>
       <button (click)="action.emit('maintenance')" class="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-dark-700 flex items-center gap-2">
          <span class="material-symbols-rounded text-amber-500">build</span> Add Maintenance
       </button>
       
       <div class="h-px bg-dark-700 my-1"></div>

       <button (click)="action.emit('delete')" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
          <span class="material-symbols-rounded">delete</span> Cancel Booking
       </button>
    </div>
    
    <!-- Backdrop to close -->
    <div class="fixed inset-0 z-40" (click)="close.emit()"></div>
  `
})
export class CalendarContextMenuComponent {
  x = input.required<number>();
  y = input.required<number>();
  bookingId = input<string>();
  
  close = output<void>();
  action = output<string>();
}