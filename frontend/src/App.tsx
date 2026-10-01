import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { ToastProvider } from './components/ui/Toast';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import ActasConformidad from './pages/ActasConformidad';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Categories from './pages/Categories';
import Entidades from './pages/Entidades';
import Tasks from './pages/Tasks';
import TaskCalendar from './pages/TaskCalendar';
import TaskGantt from './pages/TaskGantt';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Knowledge from './pages/Knowledge';
import CorreoCorporativo from './pages/CorreoCorporativo';
import Monitoring from './pages/Monitoring';
import Templates from './pages/Templates';
import Audit from './pages/Audit';
import DashboardInventario from './pages/inventory/DashboardInventario';
import Activos from './pages/inventory/Activos';
import Movimientos from './pages/inventory/Movimientos';
import Transferencias from './pages/inventory/Transferencias';
import Mantenimientos from './pages/inventory/Mantenimientos';
import Prestamos from './pages/inventory/Prestamos';
import Historial from './pages/inventory/Historial';
import ReportesInventario from './pages/inventory/Reportes';
import QrPublic from './pages/QrPublic';

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
          <Route path="settings" element={
            <ProtectedRouteWithPermission permission="ROLE_MANAGE">
              <Settings />
            </ProtectedRouteWithPermission>
          } />
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
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
