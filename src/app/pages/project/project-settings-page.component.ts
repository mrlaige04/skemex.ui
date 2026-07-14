import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmTabsImports } from 'spartan/tabs';
import { ProjectSettingsColumnsTabComponent } from './project-settings-columns-tab.component';
import { ProjectSettingsMainInfoTabComponent } from './project-settings-main-info-tab.component';
import { ProjectSettingsUsersTabComponent } from './project-settings-users-tab.component';

const SETTINGS_TABS = new Set(['main', 'users', 'columns']);

@Component({
  selector: 'app-project-settings-page',
  imports: [
    ProjectSettingsMainInfoTabComponent,
    ProjectSettingsUsersTabComponent,
    ProjectSettingsColumnsTabComponent,
    ...HlmTabsImports,
  ],
  templateUrl: './project-settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class ProjectSettingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeTab = signal('main');

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab')?.trim().toLowerCase() ?? '';
    if (SETTINGS_TABS.has(tab)) {
      this.activeTab.set(tab);
    }
  }

  onTabActivated(tab: string): void {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: tab === 'main' ? {} : { tab },
      replaceUrl: true,
    });
  }
}
