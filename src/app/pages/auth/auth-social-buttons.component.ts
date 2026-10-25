import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGithub } from '@ng-icons/lucide';
import { HlmIconImports } from 'spartan/icon';
import type { ExternalAuthProviderDto } from '../../models/auth/auth.models';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-auth-social-buttons',
  imports: [NgIcon, ...HlmIconImports],
  providers: [provideIcons({ lucideGithub })],
  template: `
    @if (providers().length > 0) {
      <div class="auth-social">
        @for (provider of providers(); track provider.name) {
          <button
            type="button"
            class="auth-social-btn"
            (click)="onProviderClick(provider.name)"
          >
            @switch (providerKey(provider)) {
              @case ('google') {
                <svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              }
              @case ('github') {
                <ng-icon hlm name="lucideGithub" size="sm" />
              }
            }
            <span>{{ providerLabel(provider) }}</span>
          </button>
        }
      </div>

      <div class="auth-divider">
        <span class="auth-divider__label">or email</span>
      </div>
    }
  `,
  styleUrl: './auth-social-buttons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthSocialButtonsComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly providers = signal<ExternalAuthProviderDto[]>([]);

  ngOnInit(): void {
    void this.loadProviders();
  }

  providerKey(provider: ExternalAuthProviderDto): string {
    return (provider.name ?? '').trim().toLowerCase();
  }

  providerLabel(provider: ExternalAuthProviderDto): string {
    const label = provider.displayName?.trim() || provider.name?.trim();
    if (label) {
      return label;
    }
    const key = this.providerKey(provider);
    if (key === 'google') {
      return 'Google';
    }
    if (key === 'github') {
      return 'GitHub';
    }
    return 'Continue';
  }

  onProviderClick(name: string): void {
    this.auth.startExternalLogin(name);
  }

  private async loadProviders(): Promise<void> {
    try {
      const list = await this.auth.listExternalProviders();
      this.providers.set(Array.isArray(list) ? list : []);
    } catch {
      this.providers.set([]);
    }
  }
}
