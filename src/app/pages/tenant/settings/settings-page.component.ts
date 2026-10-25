import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmTabsImports } from 'spartan/tabs';
import { PERMISSIONS } from '../../../models/auth/permissions';
import { AuthService } from '../../../services/auth/auth.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { RolesPageComponent } from '../roles/roles-page.component';
import { SettingsColumnsTabComponent } from './settings-columns-tab.component';
import { SettingsSpecializationsTabComponent } from './settings-specializations-tab.component';

@Component({
  selector: 'app-settings-page',
  imports: [
    SettingsColumnsTabComponent,
    SettingsSpecializationsTabComponent,
    RolesPageComponent,
    HasPermissionDirective,
    ...HlmTabsImports,
  ],
  templateUrl: './settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class SettingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly permissions = PERMISSIONS;

  readonly activeTab = signal('columns');

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'roles' || tab === 'specializations' || tab === 'columns') {
      this.activeTab.set(tab);
    } else if (this.auth.hasPermission(PERMISSIONS.settingsColumnsView)) {
      this.activeTab.set('columns');
    } else if (this.auth.hasPermission(PERMISSIONS.settingsSpecializationsView)) {
      this.activeTab.set('specializations');
    } else if (this.auth.hasPermission(PERMISSIONS.settingsRolesView)) {
      this.activeTab.set('roles');
    }
  }

  onTabActivated(tab: string): void {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
