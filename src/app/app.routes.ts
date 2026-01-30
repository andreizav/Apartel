import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    children: [
      { path: '', loadComponent: () => import('./dashboard/home.component').then(m => m.DashboardHomeComponent) },
      { path: 'properties', loadComponent: () => import('./properties/properties.component').then(m => m.PropertiesComponent) },
      { path: 'calendar', loadComponent: () => import('./multi-calendar/multi-calendar.component').then(m => m.MultiCalendarComponent) },
      { path: 'clients', loadComponent: () => import('./clients/clients.component').then(m => m.ClientsComponent) },
      { path: 'communications', loadComponent: () => import('./communications/communications.component').then(m => m.CommunicationsComponent) },
      { path: 'channel-simulator', loadComponent: () => import('./channel-simulator/channel-simulator.component').then(m => m.ChannelSimulatorComponent) },
      { path: 'superbase', loadComponent: () => import('./superbase/superbase.component').then(m => m.SuperbaseComponent) },
      { path: 'inventory', loadComponent: () => import('./inventory/inventory.component').then(m => m.InventoryComponent) },
      { path: 'pnl', loadComponent: () => import('./pnl/pnl.component').then(m => m.PnLComponent) },
      { path: 'channel-manager', loadComponent: () => import('./channel-manager/channel-manager.component').then(m => m.ChannelManagerComponent) },
      { path: 'staff', loadComponent: () => import('./staff/staff.component').then(m => m.StaffComponent) },
      { path: 'settings', loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];