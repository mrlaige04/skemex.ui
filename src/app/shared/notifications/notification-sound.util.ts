const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3?v=3';

let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.preload = 'auto';
    audio.volume = 0.4;
  }
  return audio;
}

/** Plays the soft chime from `public/sounds/notification.mp3`. */
export function playNotificationSound(): void {
  try {
    const el = getAudio();
    el.currentTime = 0;
    void el.play().catch(() => undefined);
  } catch {
    // Autoplay restrictions — ignore.
  }
}
