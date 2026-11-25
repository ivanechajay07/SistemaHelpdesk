import api from '../lib/axios';

export interface AppVersion {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  notes: string;
  mandatory: boolean;
  /** El backend tiene FCM configurado y puede enviar push. */
  pushEnabled?: boolean;
}

/** Versión publicada de la APK (endpoint público). */
export const appService = {
  getVersion: () => api.get<AppVersion>('/app/version'),
};
