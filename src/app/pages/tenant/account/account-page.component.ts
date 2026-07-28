import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, maxLength, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCamera, lucideMail, lucideTrash2, lucideUser } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-account-page',
  imports: [
    FormField,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideUser, lucideCamera, lucideMail, lucideTrash2 })],
  templateUrl: './account-page.component.html',
  styleUrl: './account-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPageComponent {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');

  readonly submitting = signal(false);
  readonly deletingAvatar = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly success = signal(false);
  readonly profileEmail = signal('');
  /** False until <code>GET api/auth/me</code> (or workspace fallback) has populated the form. */
  readonly profileReady = signal(false);

  readonly imageFile = signal<File | null>(null);
  /** Object URL for a newly picked file; revoked when cleared or destroyed. */
  readonly pendingImageUrl = signal<string | null>(null);
  /** Avatar URL returned from the API (shown until user picks a new file). */
  readonly serverAvatarUrl = signal<string | null>(null);
  readonly avatarPreviewFailed = signal(false);

  readonly previewSource = computed(() => {
    const pending = this.pendingImageUrl();
    if (pending) {
      return pending;
    }
    const s = this.serverAvatarUrl()?.trim();
    return s && s.length > 0 ? s : null;
  });

  private readonly resetPreviewErrorOnSourceChange = effect(() => {
    this.previewSource();
    this.avatarPreviewFailed.set(false);
  });

  private readonly model = signal({
    firstName: '',
    lastName: '',
  });

  readonly profileForm = form(this.model, (f) => {
    maxLength(f.firstName, 128);
    maxLength(f.lastName, 128);
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearPendingImagePreview();
    });
    afterNextRender(() => {
      void this.prefillProfile();
    });
  }

  /** Live display name from the form, then email local-part as fallback. */
  readonly displayName = computed(() => {
    const m = this.model();
    const full = `${m.firstName?.trim() ?? ''} ${m.lastName?.trim() ?? ''}`.trim();
    if (full) {
      return full;
    }
    const e = this.profileEmail() || this.auth.workspaceContext()?.userEmail || '';
    const local = e.split('@')[0]?.trim();
    return local || 'Your profile';
  });

  /** Initials from first/last name (live from the form), then email local-part as fallback. */
  profileInitials(): string {
    const m = this.model();
    const fn = m.firstName?.trim() ?? '';
    const ln = m.lastName?.trim() ?? '';
    if (fn.length > 0 && ln.length > 0 && fn[0] && ln[0]) {
      return (fn[0] + ln[0]).toUpperCase();
    }
    if (fn.length >= 2) {
      return fn.slice(0, 2).toUpperCase();
    }
    if (fn.length === 1) {
      return fn.toUpperCase();
    }
    const e = this.profileEmail() || this.auth.workspaceContext()?.userEmail || '';
    const local = e.split('@')[0] ?? '';
    if (!local) {
      return '?';
    }
    const parts = local.split(/[.\-_]/).filter(Boolean);
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
  }

  openImagePicker(): void {
    this.imageInput()?.nativeElement.click();
  }

  onAvatarPreviewError(): void {
    this.avatarPreviewFailed.set(true);
  }

  /** Pending file pick or saved server photo — something removable. */
  canRemoveProfileImage(): boolean {
    return !!this.pendingImageUrl() || !!this.serverAvatarUrl()?.trim();
  }

  async removeProfileImage(): Promise<void> {
    this.serverError.set(null);
    this.success.set(false);

    if (this.pendingImageUrl()) {
      this.clearPendingImagePreview();
      this.imageFile.set(null);
      const input = this.imageInput()?.nativeElement;
      if (input) {
        input.value = '';
      }
      return;
    }

    if (!this.serverAvatarUrl()?.trim()) {
      return;
    }

    this.deletingAvatar.set(true);
    try {
      const res = await this.auth.deleteProfileImage();
      this.serverAvatarUrl.set(res.avatarUrl?.trim() || null);
      this.success.set(true);
    } catch (err) {
      const message =
        err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Something went wrong';
      this.serverError.set(message);
    } finally {
      this.deletingAvatar.set(false);
    }
  }

  private clearPendingImagePreview(): void {
    const pending = this.pendingImageUrl();
    if (pending) {
      URL.revokeObjectURL(pending);
      this.pendingImageUrl.set(null);
    }
  }

  private async prefillProfile(): Promise<void> {
    try {
      const p = await this.auth.getMyProfile();
      this.model.set({
        firstName: (p.firstName ?? '').trim(),
        lastName: (p.lastName ?? '').trim(),
      });
      this.profileEmail.set((p.email ?? '').trim());
      this.serverAvatarUrl.set(p.avatarUrl?.trim() || null);
      this.auth.patchWorkspaceProfile({
        firstName: p.firstName ?? '',
        lastName: p.lastName ?? '',
        avatarUrl: p.avatarUrl ?? null,
      });
    } catch {
      const ctx = this.auth.workspaceContext();
      this.model.set({
        firstName: ctx?.firstName?.trim() ?? '',
        lastName: ctx?.lastName?.trim() ?? '',
      });
      this.profileEmail.set((ctx?.userEmail ?? '').trim());
      this.serverAvatarUrl.set(ctx?.avatarUrl?.trim() || null);
    } finally {
      this.profileReady.set(true);
    }
  }

  onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.clearPendingImagePreview();
    this.imageFile.set(file);
    if (file && file.size > 0) {
      this.pendingImageUrl.set(URL.createObjectURL(file));
    }
    this.success.set(false);
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async commit(): Promise<void> {
    this.serverError.set(null);
    this.success.set(false);

    const v = this.profileForm().value();
    const file = this.imageFile();
    const hasName =
      (v.firstName?.trim().length ?? 0) > 0 || (v.lastName?.trim().length ?? 0) > 0;
    const hasFile = !!file && file.size > 0;

    if (!hasName && !hasFile) {
      this.serverError.set('Change at least one field or choose a profile image.');
      return;
    }

    this.submitting.set(true);
    try {
      await submit(this.profileForm, async (field) => {
        try {
          const res = await this.auth.updateProfile({
            firstName: hasName ? v.firstName : undefined,
            lastName: hasName ? v.lastName : undefined,
            image: hasFile ? file : undefined,
          });
          this.model.set({
            firstName: (res.firstName ?? '').trim(),
            lastName: (res.lastName ?? '').trim(),
          });
          this.serverAvatarUrl.set(res.avatarUrl?.trim() || null);
          this.clearPendingImagePreview();
          this.imageFile.set(null);
          const input = this.imageInput()?.nativeElement;
          if (input) {
            input.value = '';
          }
          this.success.set(true);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Something went wrong';
          this.serverError.set(message);
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
