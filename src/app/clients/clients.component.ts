import { Component, signal, computed, ElementRef, ViewChild, AfterViewChecked, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { PortfolioService, Client, ChatMessage, Booking } from '../shared/portfolio.service';

export interface ClientBookingStatus {
  state: 'current' | 'future' | 'past' | 'none';
  label: string;
  unitName?: string;
  date?: string;
  daysRemaining?: number;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.component.html',
})
export class ClientsComponent implements OnInit, AfterViewChecked {
  private apiService = inject(ApiService);
  private portfolioService = inject(PortfolioService);
  private route = inject(ActivatedRoute);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Consume shared state
  clients = this.portfolioService.clients;
  portfolio = this.portfolioService.portfolio;
  bookings = this.portfolioService.bookings;

  searchQuery = signal('');
  selectedClientId = signal<string | null>(null);

  // Modal State
  isModalOpen = signal(false);
  isEditing = signal(false);
  currentClient = signal<Partial<Client>>({});
  originalPhoneNumber = signal<string | null>(null);

  // Booking Modal State
  isBookingModalOpen = signal(false);
  isLinkModalOpen = signal(false);
  isSyncing = signal(false);
  errorMessage = signal('');

  newBookingData = signal<{
    unitId: string;
    startDate: string;
    endDate: string;
    price: number;
    notes: string;
  }>({
    unitId: '',
    startDate: '',
    endDate: '',
    price: 0,
    notes: ''
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['phone']) {
        const phone = params['phone'];
        const client = this.clients().find(c => c.phoneNumber === phone);
        if (client) {
          this.selectClient(phone);
          if (params['action'] === 'edit') {
            this.openEditModal(client);
          }
        }
      }
    });
  }

  // Computed Values
  filteredClients = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const normQuery = query.replace(/[^\d+]/g, '');

    return this.clients()
      .filter(c => {
        const normPhone = c.phoneNumber.replace(/[^\d+]/g, '');
        return c.name.toLowerCase().includes(query) || normPhone.includes(normQuery);
      })
      .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
  });

  selectedClient = computed(() => {
    return this.clients().find(c => c.phoneNumber === this.selectedClientId()) || null;
  });

  linkableBookings = computed(() => {
    const client = this.selectedClient();
    if (!client) return [];

    return this.bookings()
      .filter(b => (!b.guestPhone || b.guestPhone.trim() === '') && b.source !== 'blocked')
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  });

  getBookingStatus(phoneNumber: string): ClientBookingStatus {
    const allBookings = this.portfolioService.bookings();
    const portfolio = this.portfolioService.portfolio();

    const clientBookings = allBookings.filter(b => b.guestPhone === phoneNumber);

    if (clientBookings.length === 0) {
      return { state: 'none', label: 'New Client' };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const current = clientBookings.find(b => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      return now >= start && now <= end;
    });

    if (current) {
      const unitName = this.getUnitName(current.unitId, portfolio);
      const daysLeft = Math.ceil((new Date(current.endDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
      return {
        state: 'current',
        label: 'Currently Staying',
        unitName: unitName,
        date: `Until ${current.endDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
        daysRemaining: daysLeft
      };
    }

    const futureBookings = clientBookings.filter(b => new Date(b.startDate) > now);
    if (futureBookings.length > 0) {
      futureBookings.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      const next = futureBookings[0];
      const unitName = this.getUnitName(next.unitId, portfolio);
      return {
        state: 'future',
        label: 'Upcoming Booking',
        unitName: unitName,
        date: new Date(next.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
      };
    }

    const pastBookings = clientBookings.filter(b => new Date(b.endDate) < now);
    if (pastBookings.length > 0) {
      pastBookings.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
      const last = pastBookings[0];
      const unitName = this.getUnitName(last.unitId, portfolio);
      return {
        state: 'past',
        label: 'Past Guest',
        unitName: unitName,
        date: `Checked out ${new Date(last.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
      };
    }

    return { state: 'none', label: 'No Active Bookings' };
  }

  public getUnitName(unitId: string, portfolio: any[]): string {
    for (const group of portfolio) {
      const unit = group.units.find((u: any) => u.id === unitId);
      if (unit) return unit.name;
    }
    return 'Unknown Unit';
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) { }
  }

  selectClient(phoneNumber: string) {
    this.selectedClientId.set(phoneNumber);
  }

  getLastMessage(client: Client): string {
    if (client.messages.length === 0) return 'No messages';
    const last = client.messages[client.messages.length - 1];
    const prefix = last.sender === 'agent' ? 'You: ' : last.sender === 'bot' ? 'Bot: ' : '';
    return prefix + last.text;
  }

  formatTime(date: Date): string {
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  openBookingModal() {
    const client = this.selectedClient();
    if (!client) return;

    this.errorMessage.set('');
    this.isSyncing.set(false);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const end = new Date(tomorrow);
    end.setDate(end.getDate() + 3);

    let defaultUnitId = '';
    const portfolioGroups = this.portfolio();
    if (portfolioGroups.length > 0 && portfolioGroups[0].units.length > 0) {
      defaultUnitId = portfolioGroups[0].units[0].id;
    }

    this.newBookingData.set({
      unitId: defaultUnitId,
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      price: 0,
      notes: ''
    });
    this.isBookingModalOpen.set(true);
  }

  openLinkModal() {
    const client = this.selectedClient();
    if (!client) return;

    const status = this.getBookingStatus(client.phoneNumber);
    if (status.state === 'current' || status.state === 'future') {
      return;
    }

    this.isLinkModalOpen.set(true);
  }

  linkBooking(booking: Booking) {
    const client = this.selectedClient();
    if (!client) return;

    this.bookings.update(list => list.map(b => {
      if (b.id === booking.id) {
        return { ...b, guestName: client.name, guestPhone: client.phoneNumber };
      }
      return b;
    }));

    const linkMsg: ChatMessage = {
      id: `sys-link-${Date.now()}`,
      text: `Booking Linked: ${booking.source.toUpperCase()} reservation for ${new Date(booking.startDate).toLocaleDateString()} has been assigned to this profile.`,
      sender: 'bot',
      timestamp: new Date(),
      status: 'read'
    };

    this.clients.update(list => list.map(c => {
      if (c.phoneNumber === client.phoneNumber) {
        return {
          ...c,
          messages: [...c.messages, linkMsg],
          previousBookings: c.previousBookings + 1,
          lastActive: new Date()
        };
      }
      return c;
    }));

    this.isLinkModalOpen.set(false);

    this.portfolioService.addNotification({
      id: `link-${Date.now()}`,
      title: 'Booking Linked',
      message: `Booking ${booking.id} successfully assigned to ${client.name}.`,
      type: 'success',
      timestamp: new Date()
    });
  }

  saveBooking() {
    this.errorMessage.set('');
    const data = this.newBookingData();
    const client = this.selectedClient();

    if (!client || !data.unitId || !data.startDate || !data.endDate) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    if (new Date(data.startDate) >= new Date(data.endDate)) {
      this.errorMessage.set('Check-out date must be after check-in date.');
      return;
    }

    // Prepare booking object
    const newBooking: Booking = {
      id: `b-man-${Date.now()}`,
      unitId: data.unitId,
      guestName: client.name,
      guestPhone: client.phoneNumber,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      source: 'direct',
      status: 'confirmed',
      price: data.price,
      createdAt: new Date()
    };

    // Use Centralized Service Logic
    this.apiService.createBooking(newBooking).subscribe((result) => {
      if (!result.success) {
        this.errorMessage.set(result.error ?? 'Failed to create booking.');
        return;
      }
      this.runAfterBookingCreated(newBooking, client);
    });
  }

  private runAfterBookingCreated(newBooking: Booking, client: Client) {
    // Start Simulation of Sync Process
    this.isSyncing.set(true);

    setTimeout(() => {
      const confirmMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        text: `Booking confirmed: ${newBooking.startDate.toLocaleDateString()} - ${newBooking.endDate.toLocaleDateString()}.\nSynced with Channel Manager.`,
        sender: 'bot',
        timestamp: new Date(),
        status: 'sent'
      };

      this.clients.update(list => list.map(c => {
        if (c.phoneNumber === client.phoneNumber) {
          return {
            ...c,
            messages: [...c.messages, confirmMsg],
            previousBookings: c.previousBookings + 1,
            lastActive: new Date()
          };
        }
        return c;
      }));

      this.portfolioService.addNotification({
        id: `notif-sync-${Date.now()}`,
        title: 'Booking Synchronized',
        message: `Reservation for ${client.name} successfully pushed to Channel Manager.`,
        type: 'success',
        timestamp: new Date(),
        data: {
          action: 'calendar_focus',
          date: newBooking.startDate.toISOString(),
          unitId: newBooking.unitId
        }
      });

      this.isSyncing.set(false);
      this.isBookingModalOpen.set(false);

    }, 1500);
  }

  openAddModal() {
    this.isEditing.set(false);
    this.originalPhoneNumber.set(null);
    this.currentClient.set({
      platform: 'whatsapp',
      status: 'New',
      messages: [],
      previousBookings: 0,
      avatar: `https://picsum.photos/seed/${Date.now()}/100/100`,
      unreadCount: 0,
      online: false,
      lastActive: new Date()
    });
    this.isModalOpen.set(true);
  }

  openEditModal(client: Client) {
    this.isEditing.set(true);
    this.originalPhoneNumber.set(client.phoneNumber);
    this.currentClient.set(JSON.parse(JSON.stringify(client)));
    const c = this.currentClient();
    if (c.lastActive) c.lastActive = new Date(c.lastActive);
    if (c.messages) c.messages = c.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
    this.isModalOpen.set(true);
  }

  saveClient() {
    const data = this.currentClient();
    if (!data.name || !data.phoneNumber) return;

    const newClient: Client = {
      phoneNumber: data.phoneNumber,
      name: data.name,
      email: data.email || '',
      address: data.address || '',
      country: data.country || '',
      previousBookings: data.previousBookings || 0,
      platform: data.platform || 'whatsapp',
      avatar: data.avatar || `https://picsum.photos/seed/${data.phoneNumber}/100/100`,
      status: data.status || 'New',
      lastActive: data.lastActive || new Date(),
      messages: data.messages || [],
      unreadCount: data.unreadCount || 0,
      online: data.online || false,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
    };

    this.clients.update(list => {
      if (this.isEditing()) {
        const originalPhone = this.originalPhoneNumber();
        return list.map(c => c.phoneNumber === originalPhone ? newClient : c);
      } else {
        if (list.some(c => c.phoneNumber === newClient.phoneNumber)) {
          alert('Client with this phone number already exists!');
          return list;
        }
        return [newClient, ...list];
      }
    });

    if (this.isEditing() && this.originalPhoneNumber() === this.selectedClientId()) {
      this.selectedClientId.set(newClient.phoneNumber);
    } else if (!this.isEditing()) {
      this.selectedClientId.set(newClient.phoneNumber);
    }

    this.isModalOpen.set(false);
  }

  deleteClient(phoneNumber: string) {
    if (confirm('Are you sure you want to delete this client and all their history?')) {
      this.clients.update(list => list.filter(c => c.phoneNumber !== phoneNumber));
      if (this.selectedClientId() === phoneNumber) {
        this.selectedClientId.set(null);
      }
    }
  }

  saveHistory() {
    const client = this.selectedClient();
    if (!client) return;
    const historyText = client.messages.map(m =>
      `[${m.timestamp.toLocaleString()}] ${m.sender.toUpperCase()}: ${m.text}`
    ).join('\n');
    const blob = new Blob([historyText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_history_${client.name.replace(/\s/g, '_')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  handleImport(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    const client = this.selectedClient();
    if (file && client) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.processImportText(client.phoneNumber, e.target?.result as string);
      };
      reader.readAsText(file);
    }
    target.value = '';
  }

  private processImportText(phoneNumber: string, text: string) {
    const lines = text.split('\n');
    const newMessages: ChatMessage[] = [];
    const waRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?:\s?[AP]M)?)\s+-\s+([^:]+):\s+(.+)/;

    lines.forEach((line, index) => {
      const clean = line.trim();
      if (clean) {
        let sender: 'client' | 'bot' | 'agent' = 'bot';
        // Simple heuristic if not strictly formatted
        if (index % 2 === 0) sender = 'client';

        newMessages.push({
          id: `imp-${Date.now()}-${index}`,
          text: clean,
          sender: sender,
          timestamp: new Date(Date.now() - (lines.length - index) * 60000),
          platform: 'whatsapp'
        });
      }
    });

    if (newMessages.length > 0) {
      this.clients.update(list => list.map(c => {
        if (c.phoneNumber === phoneNumber) {
          return { ...c, messages: [...c.messages, ...newMessages] };
        }
        return c;
      }));
    }
  }
}