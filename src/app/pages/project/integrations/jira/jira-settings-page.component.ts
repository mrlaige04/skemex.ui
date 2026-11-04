import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProjectSettingsIntegrationsTabComponent } from '../../project-settings-integrations-tab.component';

/**
 * Jira connection / project mapping / webhook settings.
 * Reuses the panel from Project Settings → Integrations.
 */
@Component({
  selector: 'app-jira-settings-page',
  imports: [ProjectSettingsIntegrationsTabComponent],
  templateUrl: './jira-settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-0 overflow-y-auto' },
})
export class JiraSettingsPageComponent {}
