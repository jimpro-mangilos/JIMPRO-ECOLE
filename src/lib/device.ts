/**
 * Identité de l'appareil — utilisée pour la gestion des appareils de confiance.
 * Un « appareil » = un navigateur sur une machine (identifiant stable en localStorage).
 */

const DEVICE_KEY = 'jimpro_device_id';

/** Identifiant stable de l'appareil (UUID en localStorage). */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // localStorage indisponible (mode privé strict) : identifiant de session
    return 'dev-' + Math.random().toString(36).slice(2);
  }
}

/** Nom lisible de l'appareil, ex : « Chrome sur Linux ». */
export function getDeviceName(): string {
  try {
    const ua = navigator.userAgent;
    let browser = 'Navigateur';
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/')) browser = 'Safari';

    let os = '';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';

    return os ? `${browser} sur ${os}` : browser;
  } catch {
    return 'Appareil inconnu';
  }
}

/** User-agent complet, pour le diagnostic côté IT Manager. */
export function getDeviceUserAgent(): string {
  try {
    return navigator.userAgent || '';
  } catch {
    return '';
  }
}
