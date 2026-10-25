import {
  Directive,
  effect,
  inject,
  Input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';

@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  private role: string | undefined;
  private hasView = false;

  @Input('hasRole')
  set hasRole(role: string | undefined) {
    this.role = role;
    this.updateView();
  }

  constructor() {
    effect(() => {
      this.auth.accessToken();
      this.auth.rbacVersion();
      this.updateView();
    });
  }

  private updateView(): void {
    const hasAccess = !this.role || this.auth.hasRole(this.role);
    if (hasAccess && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
