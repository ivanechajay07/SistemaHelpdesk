import api from '../lib/axios';

export interface AppVersion {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  notes: string;
  mandatory: boolean;
}

/** Versión publicada de la APK (endpoint público). */
export const appService = {
  getVersion: () => api.get<AppVersion>('/app/version'),
};
