import { Routes } from '@angular/router';
import { OverviewComponent } from './pages/overview/overview.component';
import { ConnectionsComponent } from './pages/connections/connections.component';
import { AgentsComponent } from './pages/agents/agents.component';
import { FlowsComponent } from './pages/flows/flows.component';
import { SyncComponent } from './pages/sync/sync.component';
import { HistoryComponent } from './pages/history/history.component';
import { MappingsComponent } from './pages/mappings/mappings.component';
import { LogsComponent } from './pages/logs/logs.component';
import { LicensesComponent } from './pages/licenses/licenses.component';
import { LoginComponent } from './pages/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  { path: 'overview', component: OverviewComponent, canActivate: [authGuard] },
  { path: 'connections', component: ConnectionsComponent, canActivate: [authGuard] },
  { path: 'agents', component: AgentsComponent, canActivate: [authGuard] },
  { path: 'licenses', component: LicensesComponent, canActivate: [authGuard] },
  { path: 'flows', component: FlowsComponent, canActivate: [authGuard] },
  { path: 'sync', component: SyncComponent, canActivate: [authGuard] },
  { path: 'history', component: HistoryComponent, canActivate: [authGuard] },
  { path: 'mappings', component: MappingsComponent, canActivate: [authGuard] },
  { path: 'logs', component: LogsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'overview' },
];
