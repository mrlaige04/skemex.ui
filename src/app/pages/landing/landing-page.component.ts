import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideGithub,
  lucideLinkedin,
  lucideTwitter,
} from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { APP_PATHS } from '../../routing/app-paths';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideGithub,
      lucideLinkedin,
      lucideTwitter,
    }),
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  private readonly auth = inject(AuthService);

  readonly appPaths = APP_PATHS;

  readonly currentYear = new Date().getFullYear();
  readonly primaryCta = computed(() => this.resolvePrimaryCta());
  readonly secondaryCta = computed(() => this.resolveSecondaryCta());

  readonly features = [
    {
      title: 'Smart decomposition',
      description:
        'Describe a goal in plain language — AI breaks it into actionable subtasks with clear scope and hierarchy.',
    },
    {
      title: 'Intelligent routing',
      description:
        'Tasks are classified and placed on the right column automatically, so status always matches the work.',
    },
    {
      title: 'Visual boards',
      description: 'Kanban columns per project. Drag tasks across statuses and see progress in one place.',
    },
    {
      title: 'Team workspaces',
      description: 'Invite members, assign owners, and keep every project scoped to the right people.',
    },
  ] as const;

  readonly decompositionSteps = [
    {
      index: '01',
      title: 'Drop in a high-level task',
      description: 'Write what you need in one sentence — a feature, bug fix, or initiative.',
    },
    {
      index: '02',
      title: 'AI decomposes it',
      description: 'Skemex splits the work into subtasks, keeps parent-child links, and suggests assignees.',
    },
    {
      index: '03',
      title: 'Board updates itself',
      description: 'Each piece lands in the right column. Your team executes — no manual triage.',
    },
  ] as const;

  readonly headerNavLinks: Array<{ label: string; href?: string; routerLink?: readonly string[] }> = [
    { label: 'Decomposition', href: '#ai' },
    { label: 'Capabilities', href: '#features' },
    { label: 'Pricing', routerLink: [APP_PATHS.pricing] },
  ];

  readonly footerProductLinks = this.headerNavLinks;

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

    return { label: 'Open workspace', link: [APP_PATHS.dashboard] };
  }

  private resolveSecondaryCta(): { label: string; link: string[] } | null {
    if (!this.auth.accessToken()) {
      return { label: 'Sign in', link: ['/auth/login'] };
    }

    return null;
  }
}
