import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { BrnAlertDialogContent } from '@spartan-ng/brain/alert-dialog';
import { HlmAlertDialogImports } from 'spartan/alert-dialog';
import type { ButtonVariants } from 'spartan/button';

@Component({
  selector: 'app-confirm-alert-dialog',
  imports: [BrnAlertDialogContent, ...HlmAlertDialogImports],
  template: `
    <hlm-alert-dialog [state]="state()" (stateChanged)="onStateChanged($event)">
      <hlm-alert-dialog-content *hlmAlertDialogPortal>
        <hlm-alert-dialog-header>
          <h2 hlmAlertDialogTitle>{{ title() }}</h2>
          <div hlmAlertDialogDescription>
            <ng-content />
          </div>
        </hlm-alert-dialog-header>
        <hlm-alert-dialog-footer>
          <button type="button" hlmAlertDialogCancel>{{ cancelLabel() }}</button>
          <button
            type="button"
            hlmAlertDialogAction
            [variant]="confirmVariant()"
            (click)="confirmed.emit()"
          >
            {{ confirmLabel() }}
          </button>
        </hlm-alert-dialog-footer>
      </hlm-alert-dialog-content>
    </hlm-alert-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmAlertDialogComponent {
  readonly state = model<'open' | 'closed'>('closed');
  readonly title = input.required<string>();
  readonly confirmLabel = input('Delete');
  readonly cancelLabel = input('Cancel');
  readonly confirmVariant = input<ButtonVariants['variant']>('destructive');
  readonly confirmed = output<void>();

  onStateChanged(next: 'open' | 'closed'): void {
    this.state.set(next);
  }
}
