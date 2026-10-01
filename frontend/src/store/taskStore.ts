import { create } from 'zustand';
import api from '../lib/axios';

export type TaskStatus = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA';
export type TaskPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface Task {
  id: number;
  titulo: string;
  descripcion: string | null;
  prioridad: TaskPriority;
  estado: TaskStatus;
  fechaInicio: string;
  fechaFin: string;
  tecnicoId: number;
  tecnicoNombre: string;
  creadorId: number | null;
  creadorNombre: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaInicioProceso: string | null;
  fechaCompletada: string | null;
}

export interface TaskPayload {
  titulo: string;
  descripcion?: string;
  prioridad: TaskPriority;
  estado?: TaskStatus;
  fechaInicio: string;
  fechaFin: string;
  tecnicoId: number;
}

export type TaskEvidenceTipo = 'PROCESO' | 'COMPLETADA';

export interface TaskEvidence {
  id: number;
  taskId: number;
  tipo: TaskEvidenceTipo;
  imagenData: string;
  comentario: string | null;
  subidoPorId: number | null;
  subidoPorNombre: string | null;
  fechaCreacion: string;
}

export interface TaskEvidencePayload {
  tipo: TaskEvidenceTipo;
  imagenData: string;
  comentario?: string;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (data: TaskPayload) => Promise<void>;
  updateTask: (id: number, data: TaskPayload) => Promise<void>;
  updateTaskStatus: (id: number, estado: TaskStatus) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  fetchTaskEvidence: (taskId: number) => Promise<TaskEvidence[]>;
  addTaskEvidence: (taskId: number, data: TaskEvidencePayload) => Promise<TaskEvidence>;
  deleteTaskEvidence: (taskId: number, evidenceId: number) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get<Task[]>('/tasks');
      set({ tasks: data, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al cargar tareas', loading: false });
    }
  },

  createTask: async (payload) => {
    set({ loading: true, error: null });
    try {
      await api.post('/tasks', payload);
      const { data } = await api.get<Task[]>('/tasks');
      set({ tasks: data, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al crear la tarea', loading: false });
      throw err;
    }
  },

  updateTask: async (id, payload) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/tasks/${id}`, payload);
      const { data } = await api.get<Task[]>('/tasks');
      set({ tasks: data, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al actualizar la tarea', loading: false });
      throw err;
    }
  },

  updateTaskStatus: async (id, estado) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/tasks/${id}/estado`, { estado });
      const { data } = await api.get<Task[]>('/tasks');
      set({ tasks: data, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al actualizar el estado de la tarea', loading: false });
      throw err;
    }
  },

  deleteTask: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/tasks/${id}`);
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id), loading: false }));
    } catch (err) {
      console.error(err);
      set({ error: 'Error al eliminar la tarea', loading: false });
      throw err;
    }
  },

  fetchTaskEvidence: async (taskId) => {
    const { data } = await api.get<TaskEvidence[]>(`/tasks/${taskId}/evidence`);
    return data;
  },

  addTaskEvidence: async (taskId, payload) => {
    const { data } = await api.post<TaskEvidence>(`/tasks/${taskId}/evidence`, payload);
    return data;
  },

  deleteTaskEvidence: async (taskId, evidenceId) => {
    await api.delete(`/tasks/${taskId}/evidence/${evidenceId}`);
  },
}));
