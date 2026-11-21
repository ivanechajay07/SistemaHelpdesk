import api from '../lib/axios';

/** Consultas públicas sin sesión (QR de inventario). */
export const publicService = {
  getAssetByQr: (token: string) =>
    api.get(`/inventario/activos/qr/${encodeURIComponent(token)}`),
};
