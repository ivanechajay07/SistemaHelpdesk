import { create } from 'zustand';
import api from '../lib/axios';

export type ActivoEstado =
  | 'OPERATIVO' | 'EN_MANTENIMIENTO' | 'EN_REPARACION' | 'PRESTADO'
  | 'EN_TRANSITO' | 'DISPONIBLE' | 'RESERVADO' | 'DADO_DE_BAJA' | 'PERDIDO' | 'ROBADO';

export type MovimientoTipo =
  | 'CAMBIO_SEDE' | 'CAMBIO_ENTIDAD' | 'CAMBIO_RESPONSABLE' | 'CAMBIO_UBICACION'
  | 'INGRESO' | 'SALIDA' | 'TRASLADO' | 'DEVOLUCION' | 'REEMPLAZO';

export type TransferenciaEstado = 'BORRADOR' | 'PENDIENTE_APROBACION' | 'EN_TRANSITO' | 'RECIBIDO' | 'RECHAZADO' | 'CANCELADO';

export type MantenimientoTipo = 'PREVENTIVO' | 'CORRECTIVO';
export type MantenimientoEstado = 'PROGRAMADO' | 'EN_PROCESO' | 'FINALIZADO' | 'CANCELADO';
export type PrestamoEstado = 'SOLICITADO' | 'APROBADO' | 'ENTREGADO' | 'DEVUELTO' | 'VENCIDO' | 'CANCELADO';

export interface Activo {
  id: number;
  codigo: string;
  nombre: string;
  categoriaId?: number;
  categoriaNombre?: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  codigoPatrimonial?: string;
  estado: ActivoEstado;
  fechaAdquisicion?: string;
  fechaIngreso?: string;
  entidadId?: number;
  entidadNombre?: string;
  sedeId?: number;
  sedeNombre?: string;
  area?: string;
  ubicacionFisica?: string;
  responsableId?: number;
  responsableNombre?: string;
  cargoResponsable?: string;
  dniResponsable?: string;
  proveedor?: string;
  numeroFactura?: string;
  fechaCompra?: string;
  costo?: number;
  moneda?: string;
  ordenCompra?: string;
  tieneGarantia: boolean;
  garantiaInicio?: string;
  garantiaVencimiento?: string;
  proveedorGarantia?: string;
  fotoUrl?: string;
  qrToken?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  especificaciones: Record<string, string>;
  garantiaPorVencer?: boolean;
  garantiaVencida?: boolean;
}

export interface ActivolistItem {
  id: number;
  codigo: string;
  nombre: string;
  categoriaNombre?: string;
  marca?: string;
  modelo?: string;
  estado: ActivoEstado;
  entidadNombre?: string;
  sedeNombre?: string;
  responsableNombre?: string;
  area?: string;
  numeroSerie?: string;
}

export interface Movimiento {
  id: number;
  activoId: number;
  activoCodigo: string;
  activoNombre: string;
  tipo: MovimientoTipo;
  entidadOrigenNombre?: string;
  sedeOrigenNombre?: string;
  responsableAnteriorNombre?: string;
  ubicacionOrigen?: string;
  entidadDestinoNombre?: string;
  sedeDestinoNombre?: string;
  responsableNuevoNombre?: string;
  ubicacionDestino?: string;
  fecha: string;
  usuarioOperacion: string;
  motivo?: string;
  observaciones?: string;
  confirmado: boolean;
}

export interface Transferencia {
  id: number;
  numeroDocumento: string;
  fecha: string;
  entidadOrigenNombre?: string;
  sedeOrigenNombre?: string;
  entidadDestinoNombre?: string;
  sedeDestinoNombre?: string;
  responsableEntregaNombre?: string;
  responsableRecibeNombre?: string;
  motivo?: string;
  observaciones?: string;
  estado: TransferenciaEstado;
  fechaRecepcion?: string;
  creadoPor?: string;
  pdfUrl?: string;
  activos: { id: number; codigo: string; nombre: string }[];
}

export interface Mantenimiento {
  id: number;
  activoId: number;
  activoCodigo: string;
  activoNombre: string;
  tipo: MantenimientoTipo;
  estado: MantenimientoEstado;
  fecha: string;
  tecnicoNombre?: string;
  proveedor?: string;
  descripcion?: string;
  problemaEncontrado?: string;
  trabajoRealizado?: string;
  repuestos?: string;
  costo?: number;
  proximaRevision?: string;
  observaciones?: string;
  ticketCodigo?: string;
  fechaCreacion?: string;
}

/** Informe de lo realizado al cerrar/cambiar el estado de un mantenimiento. */
export interface MantenimientoInforme {
  trabajoRealizado?: string;
  problemaEncontrado?: string;
  repuestos?: string;
  costo?: number;
  proximaRevision?: string;
  observaciones?: string;
}

export interface Prestamo {
  id: number;
  activoId: number;
  activoCodigo: string;
  activoNombre: string;
  solicitanteNombre?: string;
  responsableEntregaNombre?: string;
  fechaEntrega?: string;
  fechaDevolucionPrevista?: string;
  fechaDevolucionReal?: string;
  motivo?: string;
  estado: PrestamoEstado;
  observaciones?: string;
  fechaCreacion?: string;
  devolucionVencida?: boolean;
}

export interface CategoriaActivo {
  id: number;
  nombre: string;
  descripcion?: string;
  campos: string[];
}

export interface DashboardInventario {
  totalActivos: number;
  operativos: number;
  enMantenimiento: number;
  enReparacion: number;
  prestados: number;
  enTransito: number;
  dadosDeBaja: number;
  sinResponsable: number;
  sinUbicacion: number;
  garantiasPorVencer: number;
  garantiasVencidas: number;
  mantenimientosProximos: number;
  mantenimientosVencidos: number;
  prestamosVencidos: number;
  transferenciasPendientes: number;
  porEstado: { name: string; value: number }[];
  porEntidad: { name: string; value: number }[];
  porSede: { name: string; value: number }[];
  porCategoria: { name: string; value: number }[];
  movimientosPorMes: { name: string; value: number }[];
  movimientosPorTipo: { name: string; value: number }[];
}

interface InventarioState {
  dashboard: DashboardInventario | null;
  dashboardLoading: boolean;
  activos: ActivolistItem[];
  activoTotal: number;
  activoTotalPages: number;
  activoLoading: boolean;
  activoDetalle: Activo | null;
  movimientos: Movimiento[];
  movimientosTotal: number;
  movimientosLoading: boolean;
  transferencias: Transferencia[];
  transferenciasLoading: boolean;
  mantenimientos: Mantenimiento[];
  mantenimientosLoading: boolean;
  prestamos: Prestamo[];
  prestamosLoading: boolean;
  categorias: CategoriaActivo[];
  categoriasLoading: boolean;
  error: string | null;

  fetchDashboard: () => Promise<void>;
  fetchActivos: (params?: any) => Promise<void>;
  fetchActivo: (id: number) => Promise<Activo | null>;
  crearActivo: (data: any) => Promise<any>;
  actualizarActivo: (id: number, data: any) => Promise<any>;
  eliminarActivo: (id: number) => Promise<void>;
  darDeBajaActivo: (id: number, motivo?: string) => Promise<void>;
  generarQr: (id: number) => Promise<string | null>;
  fetchMovimientos: (activoId?: number, page?: number, size?: number) => Promise<void>;
  registrarMovimiento: (data: any) => Promise<void>;
  fetchTransferencias: () => Promise<void>;
  crearTransferencia: (data: any) => Promise<void>;
  confirmarRecepcion: (id: number) => Promise<void>;
  anularTransferencia: (id: number, motivo?: string) => Promise<void>;
  fetchMantenimientos: () => Promise<void>;
  crearMantenimiento: (data: any) => Promise<void>;
  cambiarEstadoMantenimiento: (id: number, estado: MantenimientoEstado, informe?: MantenimientoInforme) => Promise<void>;
  fetchPrestamos: () => Promise<void>;
  crearPrestamo: (data: any) => Promise<void>;
  devolverPrestamo: (id: number) => Promise<void>;
  fetchCategorias: () => Promise<void>;
  crearCategoria: (data: any) => Promise<void>;
}

export const useInventarioStore = create<InventarioState>((set) => ({
  dashboard: null,
  dashboardLoading: false,
  activos: [],
  activoTotal: 0,
  activoTotalPages: 0,
  activoLoading: false,
  activoDetalle: null,
  movimientos: [],
  movimientosTotal: 0,
  movimientosLoading: false,
  transferencias: [],
  transferenciasLoading: false,
  mantenimientos: [],
  mantenimientosLoading: false,
  prestamos: [],
  prestamosLoading: false,
  categorias: [],
  categoriasLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ dashboardLoading: true });
    try {
      const res = await api.get('/inventario/dashboard');
      set({ dashboard: res.data, dashboardLoading: false });
    } catch (e: any) {
      console.error(e);
      set({ error: e.response?.data?.message || 'Error cargando dashboard', dashboardLoading: false });
    }
  },

  fetchActivos: async (params) => {
    set({ activoLoading: true });
    try {
      const res = await api.get('/inventario/activos', { params });
      set({
        activos: res.data.content || [],
        activoTotal: res.data.totalElements || 0,
        activoTotalPages: res.data.totalPages || 0,
        activoLoading: false,
      });
    } catch (e: any) {
      console.error(e);
      set({ error: e.response?.data?.message || 'Error cargando activos', activoLoading: false });
    }
  },

  fetchActivo: async (id) => {
    try {
      const res = await api.get(`/inventario/activos/${id}`);
      set({ activoDetalle: res.data });
      return res.data;
    } catch (e: any) {
      console.error(e);
      set({ error: e.response?.data?.message || 'Error cargando activo' });
      return null;
    }
  },

  crearActivo: async (data) => {
    try {
      const res = await api.post('/inventario/activos', data);
      return res.data;
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al registrar el activo');
    }
  },

  actualizarActivo: async (id, data) => {
    try {
      const res = await api.put(`/inventario/activos/${id}`, data);
      return res.data;
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al actualizar el activo');
    }
  },

  eliminarActivo: async (id) => {
    try {
      await api.delete(`/inventario/activos/${id}`);
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al eliminar el activo');
    }
  },

  darDeBajaActivo: async (id, motivo) => {
    try {
      await api.post(`/inventario/activos/${id}/baja`, { motivo });
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al dar de baja el activo');
    }
  },

  generarQr: async (id) => {
    try {
      const res = await api.post(`/inventario/activos/${id}/qr`);
      return res.data?.qrToken || null;
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al generar QR');
    }
  },

  fetchMovimientos: async (activoId, page = 0, size = 20) => {
    set({ movimientosLoading: true });
    try {
      const params: any = { page, size };
      if (activoId) params.activoId = activoId;
      const res = await api.get('/inventario/movimientos', { params });
      set({
        movimientos: res.data.content || [],
        movimientosTotal: res.data.totalElements || 0,
        movimientosLoading: false,
      });
    } catch (e: any) {
      console.error(e);
      set({ error: e.response?.data?.message || 'Error cargando movimientos', movimientosLoading: false });
    }
  },

  registrarMovimiento: async (data) => {
    try {
      await api.post('/inventario/movimientos', data);
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al registrar el movimiento');
    }
  },

  fetchTransferencias: async () => {
    set({ transferenciasLoading: true });
    try {
      const res = await api.get('/inventario/transferencias');
      set({ transferencias: res.data || [], transferenciasLoading: false });
    } catch (e: any) {
      console.error(e);
      set({ error: e.response?.data?.message || 'Error cargando transferencias', transferenciasLoading: false });
    }
  },

  crearTransferencia: async (data) => {
    try {
      await api.post('/inventario/transferencias', data);
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al crear la transferencia');
    }
  },

  confirmarRecepcion: async (id) => {
    try {
      await api.post(`/inventario/transferencias/${id}/recibir`);
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al confirmar recepción');
    }
  },

  anularTransferencia: async (id, motivo) => {
    try {
      await api.post(`/inventario/transferencias/${id}/anular`, { motivo });
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al anular la transferencia');
    }
  },

  fetchMantenimientos: async () => {
    set({ mantenimientosLoading: true });
    try {
      const res = await api.get('/inventario/mantenimientos');
      set({ mantenimientos: res.data || [], mantenimientosLoading: false });
    } catch (e: any) {
      console.error(e);
      set({ error: e.response?.data?.message || 'Error cargando mantenimientos', mantenimientosLoading: false });
    }
  },

  crearMantenimiento: async (data) => {
    try {
      await api.post('/inventario/mantenimientos', data);
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al registrar el mantenimiento');
    }
  },

  cambiarEstadoMantenimiento: async (id, estado, informe) => {
    try {
      await api.patch(`/inventario/mantenimientos/${id}/estado`, { estado, ...informe });
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al cambiar estado');
    }
  },

  fetchPrestamos: async () => {
    set({ prestamosLoading: true });
    try {
      const res = await api.get('/inventario/prestamos');
      set({ prestamos: res.data || [], prestamosLoading: false });
    } catch (e: any) {
      console.error(e);
      set({ error: e.response?.data?.message || 'Error cargando préstamos', prestamosLoading: false });
    }
  },

  crearPrestamo: async (data) => {
    try {
      await api.post('/inventario/prestamos', data);
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al registrar el préstamo');
    }
  },

  devolverPrestamo: async (id) => {
    try {
      await api.post(`/inventario/prestamos/${id}/devolver`);
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al registrar la devolución');
    }
  },

  fetchCategorias: async () => {
    set({ categoriasLoading: true });
    try {
      const res = await api.get('/inventario/categorias');
      set({ categorias: res.data || [], categoriasLoading: false });
    } catch (e: any) {
      console.error(e);
      set({ error: e.response?.data?.message || 'Error cargando categorías', categoriasLoading: false });
    }
  },

  crearCategoria: async (data) => {
    try {
      await api.post('/inventario/categorias', data);
    } catch (e: any) {
      console.error(e);
      throw new Error(e.response?.data?.message || 'Error al crear la categoría');
    }
  },
}));

export const ESTADO_LABELS: Record<string, string> = {
  OPERATIVO: 'Operativo', EN_MANTENIMIENTO: 'En Mantenimiento', EN_REPARACION: 'En Reparación',
  PRESTADO: 'Prestado', EN_TRANSITO: 'En Tránsito', DISPONIBLE: 'Disponible',
  RESERVADO: 'Reservado', DADO_DE_BAJA: 'Dado de Baja', PERDIDO: 'Perdido', ROBADO: 'Robado',
};

export const ESTADO_BADGE: Record<string, string> = {
  OPERATIVO: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  EN_MANTENIMIENTO: 'bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
  EN_REPARACION: 'bg-orange-50 text-orange-700 ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400',
  PRESTADO: 'bg-violet-50 text-violet-700 ring-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400',
  EN_TRANSITO: 'bg-cyan-50 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400',
  DISPONIBLE: 'bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400',
  RESERVADO: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400',
  DADO_DE_BAJA: 'bg-red-50 text-red-700 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400',
  PERDIDO: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400',
  ROBADO: 'bg-red-50 text-red-700 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400',
};

export const MOVIMIENTO_LABELS: Record<string, string> = {
  CAMBIO_SEDE: 'Cambio de Sede', CAMBIO_ENTIDAD: 'Cambio de Entidad', CAMBIO_RESPONSABLE: 'Cambio de Responsable',
  CAMBIO_UBICACION: 'Cambio de Ubicación', INGRESO: 'Ingreso', SALIDA: 'Salida', TRASLADO: 'Traslado',
  DEVOLUCION: 'Devolución', REEMPLAZO: 'Reemplazo',
};

export const TRANSFERENCIA_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador', PENDIENTE_APROBACION: 'Pendiente de Aprobación', EN_TRANSITO: 'En Tránsito',
  RECIBIDO: 'Recibido', RECHAZADO: 'Rechazado', CANCELADO: 'Cancelado',
};

export const TRANSFERENCIA_BADGE: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400',
  PENDIENTE_APROBACION: 'bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
  EN_TRANSITO: 'bg-cyan-50 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400',
  RECIBIDO: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  RECHAZADO: 'bg-red-50 text-red-700 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400',
  CANCELADO: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400',
};

export const MANTENIMIENTO_LABELS: Record<string, string> = {
  PROGRAMADO: 'Programado', EN_PROCESO: 'En Proceso', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado',
};

export const MANTENIMIENTO_BADGE: Record<string, string> = {
  PROGRAMADO: 'bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400',
  EN_PROCESO: 'bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
  FINALIZADO: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  CANCELADO: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400',
};

export const PRESTAMO_LABELS: Record<string, string> = {
  SOLICITADO: 'Solicitado', APROBADO: 'Aprobado', ENTREGADO: 'Entregado',
  DEVUELTO: 'Devuelto', VENCIDO: 'Vencido', CANCELADO: 'Cancelado',
};

export const PRESTAMO_BADGE: Record<string, string> = {
  SOLICITADO: 'bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400',
  APROBADO: 'bg-cyan-50 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400',
  ENTREGADO: 'bg-violet-50 text-violet-700 ring-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400',
  DEVUELTO: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  VENCIDO: 'bg-red-50 text-red-700 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400',
  CANCELADO: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400',
};
