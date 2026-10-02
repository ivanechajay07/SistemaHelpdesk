import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SkeletonPage } from './components/ui/Skeleton';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { ToastProvider } from './components/ui/Toast';
import DashboardLayout from './layouts/DashboardLayout';

// Rutas con carga diferida (code-splitting): cada página se descarga solo al entrar.
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tickets = lazy(() => import('./pages/Tickets'));
const TicketDetail = lazy(() => import('./pages/TicketDetail'));
const ActasConformidad = lazy(() => import('./pages/ActasConformidad'));
const Users = lazy(() => import('./pages/Users'));
const Roles = lazy(() => import('./pages/Roles'));
const Categories = lazy(() => import('./pages/Categories'));
const Entidades = lazy(() => import('./pages/Entidades'));
const Tasks = lazy(() => import('./pages/Tasks'));
const TaskCalendar = lazy(() => import('./pages/TaskCalendar'));
const TaskGantt = lazy(() => import('./pages/TaskGantt'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const CorreoCorporativo = lazy(() => import('./pages/CorreoCorporativo'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const Templates = lazy(() => import('./pages/Templates'));
const Audit = lazy(() => import('./pages/Audit'));
const DashboardInventario = lazy(() => import('./pages/inventory/DashboardInventario'));
const Activos = lazy(() => import('./pages/inventory/Activos'));
const Movimientos = lazy(() => import('./pages/inventory/Movimientos'));
const Transferencias = lazy(() => import('./pages/inventory/Transferencias'));
const Mantenimientos = lazy(() => import('./pages/inventory/Mantenimientos'));
const Prestamos = lazy(() => import('./pages/inventory/Prestamos'));
const Historial = lazy(() => import('./pages/inventory/Historial'));
const ReportesInventario = lazy(() => import('./pages/inventory/Reportes'));
const QrPublic = lazy(() => import('./pages/QrPublic'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function ProtectedRouteWithPermission({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission) && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function App() {
  const isDark = useThemeStore((state) => state.isDark);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Refresca roles/permisos al cargar y al volver a la ventana, para que los
  // cambios hechos en "Roles y Permisos" se reflejen sin cerrar sesión.
  useEffect(() => {
    if (!token) return;
    refreshMe();
    const onFocus = () => refreshMe();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token, refreshMe]);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<SkeletonPage />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/qr/:token" element={<QrPublic />} />

            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="tickets/actas" element={<ActasConformidad />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route path="knowledge" element={<Knowledge />} />
              <Route path="knowledge/correos" element={<CorreoCorporativo />} />
              <Route path="monitoring" element={
                <ProtectedRouteWithPermission permission="MONITORING_VIEW">
                  <Monitoring />
                </ProtectedRouteWithPermission>
              } />
              <Route path="users" element={
                <ProtectedRouteWithPermission permission="USER_MANAGE">
                  <Users />
                </ProtectedRouteWithPermission>
              } />
              <Route path="roles" element={
                <ProtectedRouteWithPermission permission="ROLE_MANAGE">
                  <Roles />
                </ProtectedRouteWithPermission>
              } />
              <Route path="categories" element={
                <ProtectedRouteWithPermission permission="CATEGORY_MANAGE">
                  <Categories />
                </ProtectedRouteWithPermission>
              } />
              <Route path="plantillas" element={
                <ProtectedRouteWithPermission permission="CATEGORY_MANAGE">
                  <Templates />
                </ProtectedRouteWithPermission>
              } />
              <Route path="auditoria" element={
                <AdminRoute>
                  <Audit />
                </AdminRoute>
              } />
              <Route path="entidades" element={
                <ProtectedRouteWithPermission permission="ENTITY_MANAGE">
                  <Entidades />
                </ProtectedRouteWithPermission>
              } />
              <Route path="tareas" element={
                <ProtectedRouteWithPermission permission="TASK_MANAGE">
                  <Tasks />
                </ProtectedRouteWithPermission>
              } />
              <Route path="tareas/calendario" element={
                <ProtectedRouteWithPermission permission="TASK_MANAGE">
                  <TaskCalendar />
                </ProtectedRouteWithPermission>
              } />
              <Route path="tareas/gantt" element={
                <ProtectedRouteWithPermission permission="TASK_MANAGE">
                  <TaskGantt />
                </ProtectedRouteWithPermission>
              } />
              <Route path="reports" element={
                <ProtectedRouteWithPermission permission="REPORT_VIEW">
                  <Reports />
                </ProtectedRouteWithPermission>
              } />
              <Route path="settings" element={<Settings />} />
              <Route path="inventario" element={
                <ProtectedRouteWithPermission permission="INV_VIEW">
                  <DashboardInventario />
                </ProtectedRouteWithPermission>
              } />
              <Route path="inventario/activos" element={
                <ProtectedRouteWithPermission permission="INV_VIEW">
                  <Activos />
                </ProtectedRouteWithPermission>
              } />
              <Route path="inventario/movimientos" element={
                <ProtectedRouteWithPermission permission="INV_VIEW">
                  <Movimientos />
                </ProtectedRouteWithPermission>
              } />
              <Route path="inventario/transferencias" element={
                <ProtectedRouteWithPermission permission="INV_TRANSFER">
                  <Transferencias />
                </ProtectedRouteWithPermission>
              } />
              <Route path="inventario/mantenimientos" element={
                <ProtectedRouteWithPermission permission="INV_MANT">
                  <Mantenimientos />
                </ProtectedRouteWithPermission>
              } />
              <Route path="inventario/prestamos" element={
                <ProtectedRouteWithPermission permission="INV_PRESTAMO">
                  <Prestamos />
                </ProtectedRouteWithPermission>
              } />
              <Route path="inventario/historial" element={
                <ProtectedRouteWithPermission permission="INV_HISTORIAL">
                  <Historial />
                </ProtectedRouteWithPermission>
              } />
              <Route path="inventario/reportes" element={
                <ProtectedRouteWithPermission permission="INV_VIEW">
                  <ReportesInventario />
                </ProtectedRouteWithPermission>
              } />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
