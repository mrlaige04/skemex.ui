import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { HlmTabsImports } from 'spartan/tabs';
import { SettingsColumnsTabComponent } from './settings-columns-tab.component';

@Component({
  selector: 'app-settings-page',
  imports: [SettingsColumnsTabComponent, ...HlmTabsImports],
  templateUrl: './settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class SettingsPageComponent {
  readonly activeTab = signal('columns');

  onTabActivated(tab: string): void {
    this.activeTab.set(tab);
  }
}
