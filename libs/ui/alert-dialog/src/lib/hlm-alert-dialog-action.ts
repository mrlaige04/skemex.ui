import { Directive, input } from '@angular/core';
import { BrnDialogClose } from '@spartan-ng/brain/dialog';
import { HlmButton } from 'spartan/button';

@Directive({
  selector: 'button[hlmAlertDialogAction]',
  hostDirectives: [
    { directive: BrnDialogClose, inputs: ['delay'] },
    { directive: HlmButton, inputs: ['variant', 'size'] },
  ],
  host: {
    '[type]': 'type()',
  },
})
export class HlmAlertDialogAction {
  public readonly type = input<'button' | 'submit' | 'reset'>('button');
}
