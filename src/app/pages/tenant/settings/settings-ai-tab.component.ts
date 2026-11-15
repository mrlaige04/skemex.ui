import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage, isTransientHttpFailure } from '../../../http/problem-details';
import { PERMISSIONS } from '../../../models/auth/permissions';
import { AuthService } from '../../../services/auth/auth.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 2;
const DEFAULT_TEMPERATURE = 0.2;

@Component({
  selector: 'app-settings-ai-tab',
  imports: [
    NgIcon,
    HasPermissionDirective,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideCheck, lucideLoaderCircle })],
  templateUrl: './settings-ai-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAiTabComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly permissions = PERMISSIONS;
  readonly minTemperature = MIN_TEMPERATURE;
  readonly maxTemperature = MAX_TEMPERATURE;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);
  readonly temperature = signal(DEFAULT_TEMPERATURE);
  private initialTemperature = DEFAULT_TEMPERATURE;

  readonly canSave = computed(() => {
    if (this.saving() || this.loading()) {
      return false;
    }
    const value = this.temperature();
    if (!this.isValidTemperature(value)) {
      return false;
    }
    return value !== this.initialTemperature;
  });

  ngOnInit(): void {
    void this.load();
  }

  updateTemperature(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.temperature.set(Number.isFinite(raw) ? raw : this.temperature());
    this.savedMessage.set(null);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.savedMessage.set(null);

    const value = this.temperature();
    if (!this.isValidTemperature(value)) {
      this.error.set(`Temperature must be between ${MIN_TEMPERATURE} and ${MAX_TEMPERATURE}.`);
      return;
    }

    this.saving.set(true);
    try {
      const updated = await this.auth.updateTenantAiSettings({ aiTemperature: value });
      this.apply(updated.aiTemperature);
      this.savedMessage.set('AI settings saved.');
    } catch (err) {
      this.error.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const settings = await this.auth.getTenantAiSettings();
      this.apply(settings.aiTemperature);
    } catch (err) {
      if (!isTransientHttpFailure(err)) {
        this.error.set(problemDetailMessage(err as HttpErrorResponse));
      }
    } finally {
      this.loading.set(false);
    }
  }

  private apply(value: number): void {
    const clamped = Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, value));
    this.temperature.set(clamped);
    this.initialTemperature = clamped;
  }

  private isValidTemperature(value: number): boolean {
    return Number.isFinite(value) && value >= MIN_TEMPERATURE && value <= MAX_TEMPERATURE;
  }
}
