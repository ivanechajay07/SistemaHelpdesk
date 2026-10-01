import { useEffect, useState } from 'react';
import {
  Mail, Plus, Search, Loader2, Eye, EyeOff, Edit2, Trash2, Copy, Building2, Briefcase, Lock, AtSign, X, Save, AlertCircle, FileText,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCorreoStore, type CorreoCorporativo } from '../store/correoStore';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawCorporateHeader, drawSectionTitle, drawFooter, drawKpiCards, formatReportDate } from '../lib/reportPdf';

interface CuentaRow {
  email: string;
  password: string;
}

const emptyCuenta = (): CuentaRow => ({ email: '', password: '' });

export default function CorreoCorporativo() {
  const toast = useToast();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const { correos, loading, error, fetchCorreos, createCorreo, updateCorreo, deleteCorreo, fetchPassword } = useCorreoStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; correo?: CorreoCorporativo }>(null);
  const [form, setForm] = useState({ nombre: '', apellidos: '', cargo: '', empresa: '' });
  const [cuentas, setCuentas] = useState<CuentaRow[]>([emptyCuenta()]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [revealingId, setRevealingId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    action?: () => Promise<void>;
    successTitle?: string;
    successMessage?: string;
  } | null>(null);

  useEffect(() => {
    fetchCorreos();
  }, [fetchCorreos]);

  const openCreate = () => {
    setForm({ nombre: '', apellidos: '', cargo: '', empresa: '' });
    setCuentas([emptyCuenta()]);
    setFieldErrors({});
    setModal({ mode: 'create' });
  };

  const openEdit = (correo: CorreoCorporativo) => {
    setForm({ nombre: correo.nombre, apellidos: correo.apellidos, cargo: correo.cargo, empresa: correo.empresa });
    setCuentas(correo.cuentas.length ? correo.cuentas.map((c) => ({ email: c.email, password: '' })) : [emptyCuenta()]);
    setFieldErrors({});
    setModal({ mode: 'edit', correo });
  };

  const updateCuenta = (index: number, field: 'email' | 'password', value: string) => {
    setCuentas((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido';
    if (!form.apellidos.trim()) errors.apellidos = 'Los apellidos son requeridos';
    if (!form.cargo.trim()) errors.cargo = 'El cargo es requerido';
    if (!form.empresa.trim()) errors.empresa = 'La empresa es requerida';
    const seen = new Set<string>();
    cuentas.forEach((row, i) => {
      if (!row.email.trim()) errors[`email_${i}`] = 'El correo es requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) errors[`email_${i}`] = 'Correo inválido';
      else {
        const key = row.email.trim().toLowerCase();
        if (seen.has(key)) errors[`email_${i}`] = 'Correo duplicado';
        seen.add(key);
      }
      if (!row.password.trim()) errors[`password_${i}`] = 'La contraseña es requerida';
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      cargo: form.cargo.trim(),
      empresa: form.empresa.trim(),
      cuentas: cuentas.map((c) => ({ email: c.email.trim(), password: c.password.trim() })),
    };
    try {
      if (modal?.mode === 'edit' && modal.correo) {
        await updateCorreo(modal.correo.id, payload);
        toast({ variant: 'success', title: 'Registro actualizado', message: 'El directorio se actualizó correctamente.' });
      } else {
        await createCorreo(payload);
        toast({ variant: 'success', title: 'Registro creado', message: 'El correo corporativo fue registrado.' });
      }
      setModal(null);
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Error',
        message: err.response?.data?.message || 'No se pudo guardar el registro.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const revealPassword = async (correoId: number, cuentaId: number) => {
    if (!isAdmin) {
      toast({
        variant: 'error',
        title: 'Acceso no permitido',
        message: 'No está permitido visualizar las contraseñas. Solo los administradores pueden hacerlo.',
      });
      return;
    }
    if (revealed[cuentaId]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[cuentaId];
        return next;
      });
      return;
    }
    setRevealingId(cuentaId);
    try {
      const { password } = await fetchPassword(correoId, cuentaId);
      setRevealed((prev) => ({ ...prev, [cuentaId]: password }));
    } catch (err: any) {
      const msg = err.response?.status === 403
        ? 'No está permitido visualizar las contraseñas. Solo los administradores pueden hacerlo.'
        : 'Error al obtener la contraseña.';
      toast({ variant: 'error', title: 'Acceso no permitido', message: msg });
    } finally {
      setRevealingId(null);
    }
  };

  const copyPassword = (password: string) => {
    navigator.clipboard?.writeText(password).then(() => {
      toast({ variant: 'success', title: 'Copiado', message: 'Contraseña copiada al portapapeles.' });
    }).catch(() => {
      toast({ variant: 'error', title: 'Error', message: 'No se pudo copiar.' });
    });
  };

  const exportPdf = () => {
    setExporting(true);
    try {
      const dateStr = formatReportDate();
      const doc = new jsPDF('p', 'mm', 'letter');
      const pageHeight = doc.internal.pageSize.getHeight();
      const M = 15;

      let y = drawCorporateHeader(doc, {
        title: 'DIRECTORIO DE CORREO CORPORATIVO',
        subtitle: 'Correos corporativos de la organizacion',
        meta: `Generado: ${dateStr} · Total de registros: ${correos.length}`,
      });
      y += 2;

      const totalCuentas = correos.reduce((acc, c) => acc + c.cuentas.length, 0);
      const empresas = new Set(correos.map((c) => c.empresa)).size;
      y = drawKpiCards(doc, [
        { label: 'Personas registradas', value: String(correos.length) },
        { label: 'Cuentas de correo', value: String(totalCuentas) },
        { label: 'Empresas', value: String(empresas) },
      ], y);
      y += 8;

      if (y + 20 > pageHeight - 22) {
        doc.addPage();
        y = M;
      }
      y = drawSectionTitle(doc, 'Registros del Directorio', y);

      autoTable(doc, {
        startY: y,
        head: [['Nombre y Apellidos', 'Cargo', 'Empresa', 'Correos a cargo']],
        body: correos.map((c) => [
          `${c.nombre} ${c.apellidos}`,
          c.cargo,
          c.empresa,
          c.cuentas.map((cu) => cu.email).join('\n') || '—',
        ]),
        styles: { fontSize: 8.5, cellPadding: 2.4, valign: 'middle' },
        headStyles: { fillColor: [30, 58, 138], fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 52 },
          1: { cellWidth: 36 },
          2: { cellWidth: 36 },
          3: { cellWidth: 66 },
        },
        margin: { left: M, right: M },
      });

      drawFooter(doc, `Directorio de correos · ${dateStr}`);
      doc.save(`Directorio_Correos_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ variant: 'success', title: 'PDF generado', message: `Directorio exportado con ${correos.length} registros.` });
    } catch (err) {
      console.error(err);
      toast({ variant: 'error', title: 'Error', message: 'No se pudo generar el PDF del directorio.' });
    }
    setExporting(false);
  };

  const handleDelete = (correo: CorreoCorporativo) => {
    setDialog({
      variant: 'danger',
      title: 'Eliminar registro',
      message: `Se eliminará el correo corporativo de "${correo.nombre} ${correo.apellidos}" con sus cuentas asociadas. ¿Deseas continuar?`,
      confirmText: 'Sí, eliminar',
      action: async () => { await deleteCorreo(correo.id); },
      successTitle: 'Registro eliminado',
      successMessage: 'El registro fue eliminado del directorio.',
    });
  };

  const runDialogAction = async () => {
    const action = dialog?.action;
    const successTitle = dialog?.successTitle;
    const successMessage = dialog?.successMessage;
    setDialog(null);
    if (!action) return;
    try {
      await action();
      if (successTitle) toast({ variant: 'success', title: successTitle, message: successMessage });
    } catch (err: any) {
      console.error(err);
      setDialog({
        variant: 'error',
        title: 'Error en la operación',
        message: err.response?.data?.message || 'No se pudo completar la acción.',
      });
    }
  };

  const filtered = correos.filter((c) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.nombre + ' ' + c.apellidos).toLowerCase().includes(q) ||
      c.cargo.toLowerCase().includes(q) ||
      c.empresa.toLowerCase().includes(q) ||
      c.cuentas.some((cu) => cu.email.toLowerCase().includes(q))
    );
  });
  const { page, setPage, pageSize, setPageSize, paged, total } = usePagedList(filtered, 8);

  const inputCls = (field: string) =>
    `w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-400 ${
      fieldErrors[field] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Mail className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Directorio de Correo Corporativo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registro de correos corporativos con contraseñas cifradas. Solo los administradores pueden verlas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cargo, empresa, correo..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={exportPdf}
            disabled={exporting}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-sm font-bold transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Exportar PDF
          </button>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Nuevo Correo
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-sm">{error}</div>
      )}

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500 font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Mail className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            {correos.length === 0 ? 'Aún no hay correos corporativos registrados.' : 'No se encontraron coincidencias.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paged.map((correo) => {
              const initials = (correo.nombre[0] || '') + (correo.apellidos[0] || '');
              return (
                <div key={correo.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden anim-fade-in-up">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-500/25 shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white truncate">{correo.nombre} {correo.apellidos}</h3>
                          <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <Briefcase className="w-3 h-3" /> {correo.cargo}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEdit(correo)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors" title="Editar">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(correo)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mt-3">
                      <Building2 className="w-3.5 h-3.5" /> {correo.empresa}
                    </p>
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cuentas de correo ({correo.cuentas.length})</p>
                    {correo.cuentas.length === 0 ? (
                      <p className="text-xs italic text-slate-400">Sin cuentas registradas.</p>
                    ) : (
                      correo.cuentas.map((cuenta) => {
                        const password = revealed[cuenta.id];
                        const visible = !!password;
                        return (
                          <div key={cuenta.id} className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                            <AtSign className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{cuenta.email}</p>
                              <p className="text-[11px] font-mono text-slate-400 truncate">
                                {visible ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">{password}</span>
                                ) : (
                                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> ••••••••••</span>
                                )}
                              </p>
                            </div>
                            {visible && (
                              <button
                                onClick={() => copyPassword(password)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Copiar contraseña"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => revealPassword(correo.id, cuenta.id)}
                              disabled={revealingId === cuenta.id}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50"
                              title={isAdmin ? (visible ? 'Ocultar contraseña' : 'Ver contraseña') : 'Ver contraseña (solo administradores)'}
                            >
                              {revealingId === cuenta.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} label="registros" />
      )}

      {/* ===== Modal Crear / Editar ===== */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md anim-fade-in">
          <div className="my-auto w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden anim-scale-in flex flex-col max-h-[calc(100dvh-1.5rem)]">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
                  {modal.mode === 'edit' ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{modal.mode === 'edit' ? 'Editar Correo Corporativo' : 'Nuevo Correo Corporativo'}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Las contraseñas se guardan cifradas</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3.5">
              {modal.mode === 'edit' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Al editar, ingrese nuevamente la contraseña de cada cuenta.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nombre *</label>
                  <input type="text" className={inputCls('nombre')} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Juan" />
                  {fieldErrors.nombre && <p className="text-red-500 text-xs mt-1">{fieldErrors.nombre}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Apellidos *</label>
                  <input type="text" className={inputCls('apellidos')} value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} placeholder="Ej. Pérez García" />
                  {fieldErrors.apellidos && <p className="text-red-500 text-xs mt-1">{fieldErrors.apellidos}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cargo *</label>
                  <input type="text" className={inputCls('cargo')} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Ej. Jefe de TI" />
                  {fieldErrors.cargo && <p className="text-red-500 text-xs mt-1">{fieldErrors.cargo}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Empresa *</label>
                  <input type="text" className={inputCls('empresa')} value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} placeholder="Ej. INSN" />
                  {fieldErrors.empresa && <p className="text-red-500 text-xs mt-1">{fieldErrors.empresa}</p>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Correos a cargo *</label>
                  <button type="button" onClick={() => setCuentas((prev) => [...prev, emptyCuenta()])} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Agregar correo
                  </button>
                </div>
                <div className="space-y-2.5">
                  {cuentas.map((row, i) => (
                    <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                      <div>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="email"
                            placeholder="correo@empresa.com"
                            className={`w-full pl-9 pr-3 py-2.5 border rounded-lg bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all ${
                              fieldErrors[`email_${i}`] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                            }`}
                            value={row.email}
                            onChange={(e) => updateCuenta(i, 'email', e.target.value)}
                          />
                        </div>
                        {fieldErrors[`email_${i}`] && <p className="text-red-500 text-xs mt-1">{fieldErrors[`email_${i}`]}</p>}
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type={showPasswords[i] ? 'text' : 'password'}
                            placeholder="Contraseña del correo"
                            className={`w-full pl-9 pr-10 py-2.5 border rounded-lg bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all ${
                              fieldErrors[`password_${i}`] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                            }`}
                            value={row.password}
                            onChange={(e) => updateCuenta(i, 'password', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords((prev) => ({ ...prev, [i]: !prev[i] }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            {showPasswords[i] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {cuentas.length > 1 && (
                          <button type="button" onClick={() => setCuentas((prev) => prev.filter((_, x) => x !== i))} className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors" title="Quitar correo">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {fieldErrors[`password_${i}`] && <p className="text-red-500 text-xs">{fieldErrors[`password_${i}`]}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 active:scale-95">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {submitting ? 'Guardando...' : modal.mode === 'edit' ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!dialog}
        variant={dialog?.variant || 'info'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        confirmText={dialog?.confirmText}
        onConfirm={runDialogAction}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}