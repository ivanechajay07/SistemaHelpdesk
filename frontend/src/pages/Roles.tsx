import { useEffect, useState, type ElementType } from 'react';
import { useRoleStore, type Role } from '../store/roleStore';
import { useToast } from '../components/ui/Toast';
import { Shield, ShieldAlert, Check, Ticket, ListTodo, Users, Settings2, Building2, Layers, FileText, Puzzle, Activity } from 'lucide-react';

// Agrupación de permisos por menú del sistema (lo que cada rol podrá visualizar)
const MENU_GROUPS: { label: string; description: string; icon: ElementType; color: string; bg: string; names: string[] }[] = [
  { label: 'Tickets', description: 'Ver, asignar, editar y eliminar tickets', icon: Ticket, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/15', names: ['TICKET_VIEW_ALL', 'TICKET_ASSIGN', 'TICKET_EDIT', 'TICKET_DELETE'] },
  { label: 'Gestor de Tareas', description: 'Menú Tareas, Calendario y Diagrama de Gantt', icon: ListTodo, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-500/15', names: ['TASK_MANAGE'] },
  { label: 'Usuarios', description: 'Administración de cuentas de usuario', icon: Users, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-500/15', names: ['USER_MANAGE'] },
  { label: 'Entidades y Sedes', description: 'Menú Entidad: registro de entidades y sedes', icon: Building2, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/15', names: ['ENTITY_MANAGE'] },
  { label: 'Categorías', description: 'Categorías, subcategorías y plantillas', icon: Layers, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/15', names: ['CATEGORY_MANAGE'] },
  { label: 'Monitoreo de Red', description: 'Menú Monitoreo: objetivos vigilados y alertas', icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15', names: ['MONITORING_VIEW'] },
  { label: 'Reportes', description: 'Reportes e informes exportables', icon: FileText, color: 'text-lime-600 dark:text-lime-400', bg: 'bg-lime-100 dark:bg-lime-500/15', names: ['REPORT_VIEW'] },
  { label: 'Roles y Configuración', description: 'Permisos del sistema y configuración', icon: Settings2, color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-500/15', names: ['ROLE_MANAGE'] },
];

export default function Roles() {
  const { roles, permissions, isLoading, fetchRoles, fetchPermissions, updateRolePermissions } = useRoleStore();
  const toast = useToast();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  // Select the first role by default
  useEffect(() => {
    if (roles.length > 0 && !selectedRole) {
      handleSelectRole(roles[0]);
    }
  }, [roles]);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissionIds(role.permissions.map(p => p.id));
  };

  const togglePermission = (id: number) => {
    setSelectedPermissionIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    try {
      await updateRolePermissions(selectedRole.id, selectedPermissionIds);
      toast({
        variant: 'success',
        title: 'Permisos actualizados',
        message: `El rol ${selectedRole.name} se guardó correctamente. Los usuarios verán los cambios al volver a iniciar sesión.`,
      });
    } catch (error) {
      // Error is handled in store
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && roles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">Roles y Permisos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestiona los niveles de acceso y permisos de cada rol en el sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <h2 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              Roles del Sistema
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={`w-full text-left px-5 py-4 transition-colors ${
                  selectedRole?.id === role.id 
                    ? 'bg-blue-50/50 dark:bg-blue-500/10 border-l-[3px] border-blue-600' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-[3px] border-transparent'
                }`}
              >
                <div className={`font-bold text-[13px] tracking-wide mb-1 ${selectedRole?.id === role.id ? 'text-blue-900 dark:text-blue-400 uppercase' : 'text-slate-800 dark:text-slate-200 uppercase'}`}>{role.name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{role.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Configuration */}
        <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col shadow-sm">
          {selectedRole ? (
            <>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">Configurando: <span className="text-blue-600 dark:text-blue-400 uppercase">{selectedRole.name}</span></h2>
                  <p className="text-sm font-medium text-slate-500">{selectedRole.permissions.length} permisos activos</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Guardando...' : <><Check className="w-4 h-4" /> Guardar Cambios</>}
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="space-y-5">
                  {MENU_GROUPS.map((group) => {
                    const groupPerms = permissions.filter((p) => group.names.includes(p.name));
                    if (groupPerms.length === 0) return null;
                    const activeCount = groupPerms.filter((p) => selectedPermissionIds.includes(p.id)).length;
                    const GroupIcon = group.icon;
                    return (
                      <section key={group.label}>
                        <header className="flex items-center gap-2.5 mb-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${group.bg}`}>
                            <GroupIcon className={`w-4 h-4 ${group.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">{group.label}</h3>
                            <p className="text-[11px] text-slate-400 font-medium truncate">{group.description}</p>
                          </div>
                          <span className={`min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center text-[10px] font-black rounded-full ${
                            activeCount > 0 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            {activeCount}/{groupPerms.length}
                          </span>
                        </header>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {groupPerms.map((permission) => {
                            const isActive = selectedPermissionIds.includes(permission.id);
                            return (
                              <label
                                key={permission.id}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                                  isActive
                                    ? 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/30'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                                }`}
                              >
                                <div className="flex h-5 items-center">
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={() => togglePermission(permission.id)}
                                    className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className={`text-[13px] font-bold tracking-wide ${isActive ? 'text-blue-900 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {permission.description || permission.name}
                                  </span>
                                  <span className="text-xs text-slate-500 font-mono mt-1 font-medium">
                                    {permission.name}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}

                  {/* Permisos sin menú asignado */}
                  {(() => {
                    const groupedNames = MENU_GROUPS.flatMap((g) => g.names);
                    const others = permissions.filter((p) => !groupedNames.includes(p.name));
                    if (others.length === 0) return null;
                    return (
                      <section>
                        <header className="flex items-center gap-2.5 mb-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                            <Puzzle className="w-4 h-4 text-slate-500" />
                          </div>
                          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Otros permisos</h3>
                        </header>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {others.map((permission) => {
                            const isActive = selectedPermissionIds.includes(permission.id);
                            return (
                              <label
                                key={permission.id}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                                  isActive
                                    ? 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/30'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                                }`}
                              >
                                <div className="flex h-5 items-center">
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={() => togglePermission(permission.id)}
                                    className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className={`text-[13px] font-bold tracking-wide ${isActive ? 'text-blue-900 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {permission.description || permission.name}
                                  </span>
                                  <span className="text-xs text-slate-500 font-mono mt-1 font-medium">{permission.name}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })()}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-slate-500">
              <ShieldAlert className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
              <p>Selecciona un rol a la izquierda para configurar sus permisos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
