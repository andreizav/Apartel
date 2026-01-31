import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService, Booking } from '../shared/portfolio.service';

@Component({
  selector: 'app-channel-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './channel-simulator.component.html',
})
export class ChannelSimulatorComponent implements OnInit {
  private portfolioService = inject(PortfolioService);

  // State
  activeChannel = signal<'airbnb' | 'booking'>('airbnb');
  selectedUnitId = signal<string>('');
  currentDate = signal(new Date()); // View date for calendar

  // Modal State
  isModalOpen = signal(false);
  modalType = signal<'book' | 'block'>('book');

  // iCal Modal State
  isIcalModalOpen = signal(false);
  icalContent = signal('');



  // Data for New Event
  newEventData = signal({
    guestName: '',
    startDate: '',
    endDate: '',
    price: 0,
    notes: ''
  });

  // Services
  portfolio = this.portfolioService.portfolio;
  bookings = this.portfolioService.bookings;

  ngOnInit() {
    // Select first unit by default
    const groups = this.portfolio();
    if (groups.length > 0 && groups[0].units.length > 0) {
      this.selectedUnitId.set(groups[0].units[0].id);
    }
  }

  // --- Computed ---

  selectedUnit = computed(() => {
    const id = this.selectedUnitId();
    for (const group of this.portfolio()) {
      const unit = group.units.find(u => u.id === id);
      if (unit) return unit;
    }
    return null;
  });

  formattedMonth = computed(() => {
    return this.currentDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  calendarDays = computed(() => {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Find starting day of week (0=Sun)
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true });
    }

    const unitId = this.selectedUnitId();
    const unitBookings = this.bookings().filter(b => b.unitId === unitId);

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isToday = this.isSameDay(date, new Date());

      // Check for booking on this day
      const booking = unitBookings.find(b => {
        const start = new Date(b.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(b.endDate);
        end.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        return date >= start && date <= end;
      });

      days.push({
        empty: false,
        dayNum: i,
        date: date,
        isToday: isToday,
        booking: booking
      });
    }
    return days;
  });

  // --- Actions ---

  switchChannel(channel: 'airbnb' | 'booking') {
    this.activeChannel.set(channel);
  }

  prevMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  openModal(day: any) {
    if (day.empty || day.booking) return; // Can't book over existing

    this.modalType.set('book');
    const start = day.date as Date;
    // Default 3 days
    const end = new Date(start);
    end.setDate(start.getDate() + 3);

    this.newEventData.set({
      guestName: '',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      price: (this.selectedUnit()?.basePrice || 100) * 3,
      notes: ''
    });
    this.isModalOpen.set(true);
  }

  toggleBlock() {
    this.modalType.set(this.modalType() === 'book' ? 'block' : 'book');
  }

  saveEvent() {
    const data = this.newEventData();
    if (!data.startDate || !data.endDate) return;

    // For Blocks, name is optional/fixed
    const guestName = this.modalType() === 'block' ? 'Blocked by Host' : (data.guestName || 'Guest');

    const source = this.modalType() === 'block' ? 'blocked' : this.activeChannel();

    const newBooking: Booking = {
      id: `${source === 'airbnb' ? 'hm' : 'bk'}-${Date.now()}`, // Simulated external ID
      unitId: this.selectedUnitId(),
      guestName: guestName,
      guestPhone: '',
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      source: source,
      status: 'confirmed',
      price: this.modalType() === 'block' ? 0 : data.price,
      createdAt: new Date()
    };

    // Push to shared state
    this.bookings.update(current => [...current, newBooking]);

    this.portfolioService.addNotification({
      id: `sync-${Date.now()}`,
      title: 'Channel Sync',
      message: `New ${this.modalType() === 'block' ? 'block' : 'booking'} received from ${this.capitalize(source)} for ${this.selectedUnit()?.name}`,
      type: 'info',
      timestamp: new Date(),
      data: {
        action: 'calendar_focus',
        date: newBooking.startDate.toISOString(),
        unitId: newBooking.unitId
      }
    });

    this.isModalOpen.set(false);
  }

  // --- iCal Simulation ---

  openIcalModal() {
    this.icalContent.set('');
    this.isIcalModalOpen.set(true);
  }

  generateRandomIcal() {
    const unitName = this.selectedUnit()?.name || 'Unit';
    const now = new Date();

    // Generate 2 random bookings in the future
    const event1Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);
    const event1End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 9);

    const event2Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15);
    const event2End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 17);

    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const fmtDay = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');

    // Raw iCal String Construction
    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ApartEl Simulator//NONSGML v1.0//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART;VALUE=DATE:${fmtDay(event1Start)}
DTEND;VALUE=DATE:${fmtDay(event1End)}
SUMMARY:Reservation: John Smith
DESCRIPTION:Phone: +15550101
UID:${Date.now()}-1@apartel.app
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:${fmtDay(event2Start)}
DTEND;VALUE=DATE:${fmtDay(event2End)}
SUMMARY:Blocked: Maintenance
UID:${Date.now()}-2@apartel.app
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    this.icalContent.set(ical);
  }

  processIcalImport() {
    const content = this.icalContent();
    if (!content.includes('BEGIN:VCALENDAR')) {
      alert('Invalid iCal format.');
      return;
    }

    const events = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    let count = 0;

    events.forEach(e => {
      // Regex parsing for basic iCal fields
      const startMatch = e.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
      const endMatch = e.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
      const sumMatch = e.match(/SUMMARY:(.*)/);

      if (startMatch && endMatch) {
        const startStr = startMatch[1];
        const endStr = endMatch[1];

        const start = new Date(
          parseInt(startStr.substring(0, 4)),
          parseInt(startStr.substring(4, 6)) - 1,
          parseInt(startStr.substring(6, 8))
        );

        const end = new Date(
          parseInt(endStr.substring(0, 4)),
          parseInt(endStr.substring(4, 6)) - 1,
          parseInt(endStr.substring(6, 8))
        );

        // Correct end date (iCal end date is exclusive, but our system might treat it differently, keeping as is for now)
        // Actually usually for Date only events end date is day AFTER check out. 
        // Let's subtract 1 day for visualization consistency if needed, but standard booking systems usually store check-out date.

        let summary = sumMatch ? sumMatch[1].trim() : 'External Booking';
        let source: 'blocked' | 'direct' = 'direct'; // Map iCal to direct or specific source

        if (summary.toLowerCase().includes('block')) {
          source = 'blocked';
          summary = 'Blocked (iCal)';
        }

        const newBooking: Booking = {
          id: `ical-${Date.now()}-${count}`,
          unitId: this.selectedUnitId(),
          guestName: summary.replace('Reservation:', '').trim(),
          guestPhone: '', // Usually not in iCal summary
          startDate: start,
          endDate: end,
          source: source,
          status: 'confirmed',
          price: 0, // iCal doesn't usually carry price
          createdAt: new Date()
        };

        this.bookings.update(b => [...b, newBooking]);
        count++;
      }
    });

    this.portfolioService.addNotification({
      id: `ical-sync-${Date.now()}`,
      title: 'iCal Import',
      message: `Imported ${count} events from iCal feed for ${this.selectedUnit()?.name}`,
      type: 'success',
      timestamp: new Date()
    });

    this.isIcalModalOpen.set(false);
  }

  // --- Helpers ---

  private isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  private capitalize(s: string) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}