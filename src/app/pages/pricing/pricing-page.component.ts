import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideCheck,
  lucideGithub,
  lucideLinkedin,
  lucideSparkles,
  lucideTwitter,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { APP_PATHS } from '../../routing/app-paths';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-pricing-page',
  imports: [RouterLink, NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideCheck,
      lucideGithub,
      lucideLinkedin,
      lucideSparkles,
      lucideTwitter,
    }),
  ],
  templateUrl: './pricing-page.component.html',
  styleUrl: '../landing/landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingPageComponent {
  private readonly auth = inject(AuthService);

  readonly currentYear = new Date().getFullYear();
  readonly primaryCta = computed(() => this.resolvePrimaryCta());
  readonly secondaryCta = computed(() => this.resolveSecondaryCta());

  readonly freePlan = {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to start decomposing tasks with AI — no credit card required.',
    features: [
      'Unlimited projects & boards',
      'AI smart task decomposition',
      'Custom workspace columns',
      'Team members & assignments',
      'Drag-and-drop kanban',
    ],
  } as const;

  readonly footerProductLinks: Array<{ label: string; href?: string; routerLink?: readonly string[] }> = [
    { label: 'AI decomposition', href: '/#ai' },
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', routerLink: [APP_PATHS.pricing] },
  ];

  readonly footerAccountLinks = [
    { label: 'Sign in', routerLink: ['/auth/login'] as const },
    { label: 'Create account', routerLink: ['/auth/register'] as const },
    { label: 'Select workspace', routerLink: [APP_PATHS.select] as const },
  ] as const;

  readonly footerLegalLinks = [
    { label: 'Privacy policy', href: '#' },
    { label: 'Terms of service', href: '#' },
    { label: 'Contact', href: '#' },
  ] as const;

  readonly socialLinks = [
    { label: 'GitHub', icon: 'lucideGithub', href: 'https://github.com' },
    { label: 'LinkedIn', icon: 'lucideLinkedin', href: 'https://linkedin.com' },
    { label: 'X (Twitter)', icon: 'lucideTwitter', href: 'https://x.com' },
  ] as const;

  preventNav(event: Event): void {
    event.preventDefault();
  }

  private resolvePrimaryCta(): { label: string; link: string[] } {
    if (!this.auth.accessToken()) {
      return { label: 'Get started free', link: ['/auth/register'] };
    }

    if (this.auth.isSuperAdmin()) {
      return { label: 'Open admin console', link: [APP_PATHS.adminDashboard] };
    }

    if (!this.auth.workspaceContext()?.tenantId) {
      return { label: 'Choose workspace', link: [APP_PATHS.select] };
    }

    return { label: 'Try Skemex', link: [APP_PATHS.dashboard] };
  }

  private resolveSecondaryCta(): { label: string; link: string[] } | null {
    if (!this.auth.accessToken()) {
      return { label: 'Sign in', link: ['/auth/login'] };
    }

    return null;
  }
}
