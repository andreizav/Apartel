
import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../shared/api.service';
import { PortfolioService, AppNotification, Client } from '../shared/portfolio.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private portfolioService = inject(PortfolioService);
  private router = inject(Router);

  ngOnInit() {
    this.apiService.syncTelegram().subscribe();
  }

  sidebarOpen = signal(false);
  showNotifications = signal(false);

  // Upgrade Modal State
  isProcessingPayment = signal(false);
  selectedGateway = signal<'stripe' | 'stars' | 'yukassa' | null>(null);

  // Expose Service Signals
  notifications = this.portfolioService.notifications;
  showUpgradeModal = this.portfolioService.showUpgradeModal;
  upgradeReason = this.portfolioService.upgradeReason;
  tenant = this.portfolioService.tenant;
  currentUser = this.portfolioService.currentUser;

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  toggleNotifications() {
    this.showNotifications.update(v => !v);
  }

  dismissNotification(event: Event, id: string) {
    event.stopPropagation();
    this.portfolioService.dismissNotification(id);
  }

  handleNotificationAction(notification: AppNotification) {
    const d = notification.data as { action?: string; date?: string; unitId?: string; pendingClient?: Client; phone?: string } | undefined;
    if (d?.action === 'calendar_focus') {
      this.router.navigate(['/dashboard/calendar'], {
        queryParams: { date: d.date, unitId: d.unitId }
      });
    } else if (d?.pendingClient) {
      const client = d.pendingClient;
      this.portfolioService.clients.update(list => [client, ...list]);
      this.router.navigate(['/dashboard/clients'], { queryParams: { phone: client.phoneNumber } });
    } else if (d?.phone) {
      this.router.navigate(['/dashboard/clients'], { queryParams: { phone: d.phone, action: 'edit' } });
    }
    this.portfolioService.dismissNotification(notification.id);
    this.showNotifications.set(false);
  }

  logout() {
    this.apiService.logout();
    this.router.navigate(['/']);
  }

  // --- Payment / Upgrade Logic ---

  closeUpgradeModal() {
    this.showUpgradeModal.set(false);
    this.isProcessingPayment.set(false);
    this.selectedGateway.set(null);
  }

  selectGateway(gateway: 'stripe' | 'stars' | 'yukassa') {
    this.selectedGateway.set(gateway);
  }

  processPayment() {
    if (!this.selectedGateway()) return;

    this.isProcessingPayment.set(true);

    // Simulate Payment Gateway Redirect/Delay
    setTimeout(() => {
      this.apiService.activateProPlan();
      this.isProcessingPayment.set(false);
      this.selectedGateway.set(null);
    }, 2500);
  }
}
