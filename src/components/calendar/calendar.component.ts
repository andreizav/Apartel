import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { DataService, Booking } from '../../services/data.service';
import { CalendarContextMenuComponent } from './calendar-context-menu.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DragDropModule, CalendarContextMenuComponent],
  templateUrl: './calendar.component.html',
  styles: [`
    .calendar-grid {
       /* Custom scrollbar handling for complex grid */
       scrollbar-width: thin;
       scrollbar-color: #334155 #0f172a;
    }
    .booking-pill {
       transition: box-shadow 0.2s, transform 0.1s;
    }
    .booking-pill:hover {
       z-index: 20 !important;
       box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
    }
    .cdk-drag-preview {
       opacity: 0.8;
       box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    }
    .cdk-drag-placeholder {
       opacity: 0.3;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  dataService = inject(DataService);
  groups = this.dataService.hierarchy;
  bookings = this.dataService.bookings;

  // Configuration
  CELL_WIDTH = 120; // px
  START_DATE = new Date('2023-10-25');
  DAYS_TO_RENDER = 30;

  // View State
  days = signal(Array.from({ length: this.DAYS_TO_RENDER }, (_, i) => {
    const d = new Date(this.START_DATE);
    d.setDate(d.getDate() + i);
    return {
        date: d,
        iso: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6
    };
  }));

  // Context Menu State
  contextMenu = signal<{ x: number, y: number, bookingId?: string } | null>(null);

  // --- Logic ---

  toggleGroup(groupId: string) {
    this.groups.update(current => 
      current.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g)
    );
  }

  // Calculate pixel position for a booking
  getBookingStyle(booking: Booking) {
    const start = new Date(booking.startDate);
    const viewStart = this.START_DATE;
    
    // Difference in days
    const diffTime = start.getTime() - viewStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      left: `${diffDays * this.CELL_WIDTH + 4}px`, // +4 for padding
      width: `${booking.length * this.CELL_WIDTH - 8}px`, // -8 for padding
    };
  }

  onContextMenu(event: MouseEvent, bookingId?: string) {
    event.preventDefault();
    this.contextMenu.set({ x: event.clientX, y: event.clientY, bookingId });
  }

  handleMenuAction(action: string) {
    const ctx = this.contextMenu();
    if (!ctx || !ctx.bookingId) return;

    const booking = this.bookings().find(b => b.id === ctx.bookingId);
    if (!booking) return;

    switch (action) {
        case 'details':
            // Open Edit Modal
            this.dataService.selectedBooking.set(booking);
            this.dataService.showNewBookingModal.set(true);
            break;
        case 'clean':
            // Mark the unit associated with this booking as clean
            // In a real app, maybe check if it's already clean, or prompt logic
            this.dataService.updateUnitCleaningStatus(booking.unitId, 'clean');
            break;
        case 'maintenance':
            // Create a maintenance task for this unit
            let unitName = 'Unknown Unit';
            // Simple lookup
            for(const g of this.groups()) {
                const u = g.units.find(u => u.id === booking.unitId);
                if(u) { unitName = u.name; break; }
            }

            this.dataService.addTask({
                title: 'Quick Maintenance',
                unitId: booking.unitId,
                unitName: unitName,
                type: 'maintenance',
                priority: 'high',
                assignee: 'Unassigned',
                status: 'todo'
            });
            break;
        case 'delete':
            if(confirm('Are you sure you want to cancel this booking?')) {
                this.dataService.deleteBooking(booking.id);
            }
            break;
    }

    this.contextMenu.set(null);
  }

  // --- Drag & Drop ---

  // Predicate to check if drop is allowed (can prevent dropping on maintenance etc)
  allowDropPredicate = (drag: any, drop: any) => {
    return true; // Allow all for now, conflict logic handles the rest
  };

  onDrop(event: CdkDragDrop<any>) {
    // Determine Unit ID (The drop container ID is the unit ID)
    const newUnitId = event.container.id;
    const booking = event.item.data as Booking;
    
    // Determine new Start Date based on drop position x coordinates
    // This is tricky in standard CDK. 
    // Simplified approach: We calculate the drop point relative to the container.
    // In a real production app, we might use the 'distance' moved or mouse coordinates.
    
    // NOTE: CDK DragDrop list is usually for ordering. 
    // Here we use it for "Transfer". 
    // To get the precise X-axis drop, we need the pointer position relative to the grid.
    
    const gridRect = event.container.element.nativeElement.getBoundingClientRect();
    const dropX = event.dropPoint.x - gridRect.left + event.container.element.nativeElement.scrollLeft;
    
    // Calculate column index
    const colIndex = Math.floor(dropX / this.CELL_WIDTH);
    
    // Calculate new date
    const newDate = new Date(this.START_DATE);
    newDate.setDate(newDate.getDate() + colIndex);
    const newDateIso = newDate.toISOString().split('T')[0];

    // Update Data
    this.dataService.updateBookingPosition(booking.id, newUnitId, newDateIso);
  }
}