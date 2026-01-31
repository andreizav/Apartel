
import { Component, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../shared/api.service';
import { PortfolioService, AppSettings } from '../shared/portfolio.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html'
})
export class SettingsComponent {
  private apiService = inject(ApiService);
  private portfolioService = inject(PortfolioService);

  // Connect to shared settings
  settings = this.portfolioService.appSettings;

  // Computed signals for template access
  waStatus = computed(() => this.settings().waStatus);
  autoDraft = computed(() => this.settings().autoDraft);
  tgBotToken = computed(() => this.settings().tgBotToken);
  tgAdminGroupId = computed(() => this.settings().tgAdminGroupId);
  aiApiKey = computed(() => this.settings().aiApiKey);
  aiSystemPrompt = computed(() => this.settings().aiSystemPrompt);
  ragSensitivity = computed(() => this.settings().ragSensitivity);

  isQrModalOpen = signal(false);
  activeHelpSection = signal<string | null>(null);
  qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=SimulatedBaileysConnection_ApartEl';

  toggleHelp(section: string) {
    this.activeHelpSection.update(current => current === section ? null : section);
  }

  // Helper to update specific setting field
  updateSetting(field: keyof AppSettings, value: any) {
    this.settings.update(s => ({ ...s, [field]: value }));
  }

  toggleAutoDraft() {
    this.updateSetting('autoDraft', !this.autoDraft());
  }

  openQrModal() {
    if (!this.portfolioService.tenant().features.staffBot) {
      this.portfolioService.triggerUpgrade('WhatsApp Staff Bot requires a PRO subscription.');
      return;
    }
    if (this.waStatus() === 'connected') return;

    this.isQrModalOpen.set(true);
    this.updateSetting('waStatus', 'qr_ready');

    setTimeout(() => {
      if (this.isQrModalOpen() && this.waStatus() === 'qr_ready') {
        this.confirmConnection();
      }
    }, 4000);
  }

  confirmConnection() {
    this.updateSetting('waStatus', 'connected');
    this.isQrModalOpen.set(false);
    this.apiService.updateSettings(this.portfolioService.appSettings());
  }

  disconnectDevice() {
    if (confirm('Are you sure you want to unlink this device?')) {
      this.updateSetting('waStatus', 'disconnected');
      this.apiService.updateSettings(this.portfolioService.appSettings());
    }
  }

  testTgNotification() {
    const token = this.tgBotToken();
    const chatId = this.tgAdminGroupId();

    if (!token || !chatId) {
      alert('Please enter a valid Bot Token and Group ID first.');
      return;
    }

    this.apiService.testTelegramNotification(token, chatId).subscribe(res => {
      if (res.success) {
        alert('✅ Success! Check your Telegram group for the test message.');
      } else {
        alert(`❌ Failed: ${res.error}`);
      }
    });
  }

  constructor() {
    // Sync Telegram on load (once per page refresh/init)
    this.apiService.syncTelegram().subscribe();
  }

  saveSettings() {
    this.apiService.updateSettings(this.portfolioService.appSettings());
    alert('Settings saved successfully!');
  }
}
