import { Component, signal, computed, inject, ViewChild, ElementRef, AfterViewInit, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PortfolioService, Booking } from '../shared/portfolio.service';
import { ApiService } from '../shared/api.service';

@Component({
  selector: 'app-multi-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiCalendarComponent implements AfterViewInit, OnInit {
  private portfolioService = inject(PortfolioService);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

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

    // Optimize: Bind scroll event manually with passive: true to avoid Angular CD overhead
    const scrollEl = this.bodyScroll.nativeElement;
    const onScroll = () => this.onBodyScroll();

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => {
      scrollEl.removeEventListener('scroll', onScroll);
    });
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

  // Optimize: Group bookings by unitId to avoid O(N*M) filtering in the template
  bookingsByUnit = computed(() => {
    const bookings = this.bookings();
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (!map.has(b.unitId)) {
        map.set(b.unitId, []);
      }
      map.get(b.unitId)!.push(b);
    }
    return map;
  });

  // Pre-compute visible bookings and their styles
  visibleBookingsByUnit = computed(() => {
    const bookingsMap = this.bookingsByUnit();
    const viewDate = this.viewDate();
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const cellWidth = this.cellWidth;

    // View boundaries
    const startOfMonth = new Date(viewYear, viewMonth, 1);
    const endOfMonth = new Date(viewYear, viewMonth + 1, 0);

    const result = new Map<string, RenderableBooking[]>();

    for (const [unitId, bookings] of bookingsMap.entries()) {
      const renderable: RenderableBooking[] = [];

      for (const booking of bookings) {
         const bStart = new Date(booking.startDate);
         const bEnd = new Date(booking.endDate);

         // Visibility Check
         if (bEnd < startOfMonth || bStart > endOfMonth) {
           continue;
         }

         // Style Calculation
         const effectiveStart = bStart < startOfMonth ? startOfMonth : bStart;
         const effectiveEnd = bEnd > endOfMonth ? endOfMonth : bEnd;
         const startDay = effectiveStart.getDate();

         const diffTime = Math.abs(effectiveEnd.getTime() - effectiveStart.getTime());
         const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

         const left = (startDay - 1) * cellWidth;
         const width = durationDays * cellWidth;

         // Color Calculation
         let colorClass = 'bg-gray-500 text-white';
         switch (booking.source) {
            case 'airbnb': colorClass = 'bg-[#ff385c] text-white'; break;
            case 'booking': colorClass = 'bg-[#003580] text-white'; break;
            case 'expedia': colorClass = 'bg-[#FFC400] text-black'; break;
            case 'direct': colorClass = 'bg-[#10b981] text-white'; break;
            case 'blocked': colorClass = 'bg-gray-400 text-white repeating-linear-gradient(45deg,transparent,transparent_10px,#00000010_10px,#00000010_20px)'; break;
         }

         renderable.push({
           booking,
           style: { left: `${left}px`, width: `${width}px` },
           colorClass
         });
      }
      result.set(unitId, renderable);
    }
    return result;
  });

  // --- Methods ---

  // --- Booking Modal State ---
  isModalOpen = signal(false);
  editingBookingId = signal<string | null>(null);

  // Form Data
  bookingForm = signal<{
    unitId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    price: number;
    guestName: string;
    guestPhone: string;
    notes: string;
  }>({
    unitId: '',
    startDate: '',
    endDate: '',
    price: 0,
    guestName: '',
    guestPhone: '',
    notes: ''
  });

  // Client Selection State
  isNewClient = signal(false);
  selectedClientId = signal<string>(''); // For existing client selection

  newClientForm = signal<{
    name: string;
    phone: string;
    email: string;
  }>({
    name: '',
    phone: '',
    email: ''
  });

  // Derived list of clients for dropdown
  availableClients = this.portfolioService.clients;

  // --- Methods ---

  openBookingModal(unitId?: string, startDate?: Date, bookingToEdit?: Booking) {
    // Reset forms
    this.isNewClient.set(false);
    this.selectedClientId.set('');
    this.newClientForm.set({ name: '', phone: '', email: '' });

    if (bookingToEdit) {
      // Edit Mode
      this.editingBookingId.set(bookingToEdit.id);

      const start = new Date(bookingToEdit.startDate);
      const end = new Date(bookingToEdit.endDate);

      this.bookingForm.set({
        unitId: bookingToEdit.unitId,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        price: bookingToEdit.price || 0,
        guestName: bookingToEdit.guestName,
        guestPhone: bookingToEdit.guestPhone,
        notes: bookingToEdit.description || ''
      });

      // Try to match with existing client
      const existingClient = this.availableClients().find(c => c.phoneNumber === bookingToEdit.guestPhone);
      if (existingClient) {
        this.selectedClientId.set(existingClient.id);
      }
    } else {
      // Create Mode
      this.editingBookingId.set(null);

      const today = new Date();
      const start = startDate || today;
      const end = new Date(start);
      end.setDate(end.getDate() + 1); // Default 1 night

      this.bookingForm.set({
        unitId: unitId || this.calendarGroups()[0]?.units[0]?.id || '',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        price: 0,
        guestName: '',
        guestPhone: '',
        notes: ''
      });
    }

    this.isModalOpen.set(true);
  }

  closeBookingModal() {
    this.isModalOpen.set(false);
    this.editingBookingId.set(null);
  }

  // Handle existing client selection
  onClientSelect(clientId: string) {
    this.selectedClientId.set(clientId);
    const client = this.availableClients().find(c => c.id === clientId);
    if (client) {
      this.bookingForm.update(f => ({
        ...f,
        guestName: client.name,
        guestPhone: client.phoneNumber
      }));
    }
  }

  saveBooking() {
    const form = this.bookingForm();

    // 1. Validation
    if (!form.unitId || !form.startDate || !form.endDate) {
      alert('Please fill in all required fields.');
      return;
    }

    if (this.isNewClient()) {
      const nc = this.newClientForm();
      if (!nc.name || !nc.phone) {
        alert('Please enter client name and phone.');
        return;
      }
      form.guestName = nc.name;
      form.guestPhone = nc.phone;
    } else {
      // Only require client selection if creating new or if user explicitly wants to link one
      if (!this.editingBookingId() && !this.selectedClientId()) {
        alert('Please select a client.');
        return;
      }

      if (this.selectedClientId()) {
        const client = this.availableClients().find(c => c.id === this.selectedClientId());
        if (client) {
          form.guestName = client.name;
          form.guestPhone = client.phoneNumber;
        }
      }
    }

    // 2. Create New Client if needed (or verify existing)
    if (this.isNewClient()) {
      const nc = this.newClientForm();
      const newClient = {
        id: `c-${Date.now()}`,
        name: nc.name,
        phoneNumber: nc.phone,
        email: nc.email || '',
        address: '',
        country: '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nc.name)}&background=random`,
        platform: 'whatsapp' as const,
        status: 'New' as const,
        lastActive: new Date(),
        createdAt: new Date(),
        unreadCount: 0,
        online: false,
        messages: [],
        previousBookings: 0
      };

      this.apiService.addClient(newClient).subscribe(success => {
        if (!success) {
          alert('Client with this phone number already exists.');
          return;
        }
        this.processBookingSave(form);
      });
    } else {
      this.processBookingSave(form);
    }
  }

  processBookingSave(form: any) {
    // 3. Create or Update Booking
    if (this.editingBookingId()) {
      // UPDATE
      const existing = this.bookings().find(b => b.id === this.editingBookingId());
      if (existing) {
        const updatedBooking: Booking = {
          ...existing,
          unitId: form.unitId,
          guestName: form.guestName,
          guestPhone: form.guestPhone,
          startDate: new Date(form.startDate),
          endDate: new Date(form.endDate),
          price: form.price,
          description: form.notes
        };

        this.apiService.updateBooking(updatedBooking).subscribe(result => {
          if (result.success) {
            this.closeBookingModal();
          } else {
            alert(result.error);
          }
        });
      }
    } else {
      // CREATE
      const newBooking = {
        id: `b-${Date.now()}`,
        unitId: form.unitId,
        guestName: form.guestName,
        guestPhone: form.guestPhone,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        source: 'direct' as const,
        status: 'confirmed' as const,
        price: form.price,
        description: form.notes,
        createdAt: new Date()
      };

      this.apiService.createBooking(newBooking).subscribe(result => {
        if (result.success) {
          this.closeBookingModal();
        } else {
          alert(result.error || 'Failed to create booking.');
        }
      });
    }
  }

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
    // Always open the booking modal in edit mode
    this.openBookingModal(undefined, undefined, booking);
  }

  private isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  getVisibleBookings(unitId: string): RenderableBooking[] {
    return this.visibleBookingsByUnit().get(unitId) || [];
  }
}

interface RenderableBooking {
  booking: Booking;
  style: any;
  colorClass: string;
}