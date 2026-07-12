import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { HlmTabsImports } from 'spartan/tabs';
import { ProjectSettingsColumnsTabComponent } from './project-settings-columns-tab.component';

@Component({
  selector: 'app-project-settings-page',
  imports: [ProjectSettingsColumnsTabComponent, ...HlmTabsImports],
  templateUrl: './project-settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class ProjectSettingsPageComponent {
  readonly activeTab = signal('columns');

  onTabActivated(tab: string): void {
    this.activeTab.set(tab);
  }
}
