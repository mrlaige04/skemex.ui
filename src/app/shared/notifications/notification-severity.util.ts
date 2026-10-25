import type { NotificationSeverity } from '../../models/notifications/notifications.models';

export function severityTintClass(severity: string): string {
  switch (severity) {
    case 'Success':
      return 'notifications-severity--success';
    case 'Warning':
      return 'notifications-severity--warning';
    case 'Error':
      return 'notifications-severity--error';
    case 'Info':
    default:
      return 'notifications-severity--info';
  }
}

export function severityLabel(severity: string): string {
  switch (severity as NotificationSeverity) {
    case 'Success':
      return 'Success';
    case 'Warning':
      return 'Warning';
    case 'Error':
      return 'Error';
    case 'Info':
    default:
      return 'Info';
  }
}
