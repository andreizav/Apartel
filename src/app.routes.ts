import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/layout/main-layout.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { FinanceComponent } from './components/finance/finance.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { ConnectComponent } from './components/connect/connect.component';
import { SyncLogsComponent } from './components/connect/sync-logs.component';
import { PropertiesComponent } from './components/properties/properties.component';
import { DataImportComponent } from './components/import/data-import.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'app',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'calendar', pathMatch: 'full' },
      { path: 'calendar', component: CalendarComponent },
      { path: 'properties', component: PropertiesComponent },
      { path: 'finance', component: FinanceComponent },
      { path: 'tasks', component: TasksComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'connect', component: ConnectComponent },
      { path: 'connect/logs', component: SyncLogsComponent },
      { path: 'import', component: DataImportComponent },
    ]
  }
];