import { Component, signal, computed, inject, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PortfolioService, Booking } from '../shared/portfolio.service';

@Component({
  selector: 'app-multi-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-calendar.component.html',
})
export class MultiCalendarComponent implements AfterViewInit, OnInit {
  private portfolioService = inject(PortfolioService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChild('headerScroll') headerScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('bodyScroll') bodyScroll!: ElementRef<HTMLDivElement>;

  viewDate = signal(new Date()); // Current month view

  // Cell configuration
  cellWidth = 48; // px

  // State for group expansion in calendar view
  expandedGroups = signal<Record<string, boolean>>({});

  // Bookings from Service
  bookings = this.portfolioService.bookings;

  ngOnInit() {
    // Check for query params to navigate to specific date/unit
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        const d = new Date(params['date']);
        if (!isNaN(d.getTime())) {
          // Set view to the 1st of that month to ensure visibility
          this.viewDate.set(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      }
      if (params['unitId']) {
        // Could implement logic to scroll to specific unit row here
        // For now, ensuring the view month is correct is the primary goal
      }
    });
  }

  ngAfterViewInit() {
    // Initial sync
    this.onBodyScroll();
  }

  onBodyScroll() {
    if (this.headerScroll && this.bodyScroll) {
      this.headerScroll.nativeElement.scrollLeft = this.bodyScroll.nativeElement.scrollLeft;
    }
  }

  // --- Computed State ---

  calendarGroups = computed(() => {
    // Derive structure directly from Portfolio Service
    const portfolio = this.portfolioService.portfolio();

    return portfolio.map(group => ({
      name: group.name,
      units: group.units,
      // Default to expanded if not tracked in local state
      expanded: this.expandedGroups()[group.name] ?? true
    })).filter(g => g.units.length > 0); // Optionally hide empty groups
  });

  currentMonthDays = computed(() => {
    const year = this.viewDate().getFullYear();
    const month = this.viewDate().getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date: date,
        dayNum: i,
        dayName: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isToday: this.isSameDay(date, new Date())
      });
    }
    return days;
  });

  formattedMonth = computed(() => {
    return this.viewDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  // --- Methods ---

  toggleGroup(groupName: string) {
    this.expandedGroups.update(current => ({
      ...current,
      [groupName]: !(current[groupName] ?? true)
    }));
  }

  changeMonth(delta: number) {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  goToToday() {
    this.viewDate.set(new Date());
  }

  navigateToProperty(unitId: string) {
    this.router.navigate(['/dashboard/properties'], { queryParams: { unitId: unitId } });
  }

  navigateToClient(booking: Booking) {
    if (booking.guestPhone) {
      this.router.navigate(['/dashboard/clients'], { queryParams: { phone: booking.guestPhone } });
    } else {
      // Fallback or alert if no phone (maybe navigate to Clients root?)
      alert('This booking has no client record associated.');
    }
  }

  // Calculate position for a booking bar
  getBookingStyle(booking: Booking) {
    const viewYear = this.viewDate().getFullYear();
    const viewMonth = this.viewDate().getMonth();

    // Simple clipping to current month view
    const startOfMonth = new Date(viewYear, viewMonth, 1);
    const endOfMonth = new Date(viewYear, viewMonth + 1, 0);

    // Ensure we have Date objects
    const bStart = new Date(booking.startDate);
    const bEnd = new Date(booking.endDate);

    // If booking is completely outside current month, hide it
    if (bEnd < startOfMonth || bStart > endOfMonth) {
      return { display: 'none' };
    }

    // Calculate effective start and end for the bar within this month
    const effectiveStart = bStart < startOfMonth ? startOfMonth : bStart;
    const effectiveEnd = bEnd > endOfMonth ? endOfMonth : bEnd;

    const startDay = effectiveStart.getDate();

    const diffTime = Math.abs(effectiveEnd.getTime() - effectiveStart.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const left = (startDay - 1) * this.cellWidth;
    const width = durationDays * this.cellWidth;

    return {
      left: `${left}px`,
      width: `${width}px`
    };
  }

  getBookingColor(source: string): string {
    switch (source) {
      case 'airbnb': return 'bg-[#ff385c] text-white';
      case 'booking': return 'bg-[#003580] text-white';
      case 'expedia': return 'bg-[#FFC400] text-black';
      case 'direct': return 'bg-[#10b981] text-white'; // Green
      case 'blocked': return 'bg-gray-400 text-white repeating-linear-gradient(45deg,transparent,transparent_10px,#00000010_10px,#00000010_20px)';
      default: return 'bg-gray-500 text-white';
    }
  }

  private isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  // Helper to filter bookings for a specific unit
  getBookingsForUnit(unitId: string): Booking[] {
    return this.bookings().filter(b => b.unitId === unitId);
  }
}