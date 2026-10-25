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
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  private permission: string | undefined;
  private hasView = false;

  @Input('hasPermission')
  set hasPermission(permission: string | undefined) {
    this.permission = permission;
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
    const hasAccess = !this.permission || this.auth.hasPermission(this.permission);
    if (hasAccess && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
