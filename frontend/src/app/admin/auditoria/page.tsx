"use client";

import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import api from '@/services/api';

type AuditRow = {
  id: number;
  created_at: string;
  category: string;
  action: string;
  actor: { id: number | null; label: string };
  visitor_id: string;
  source_hash: string;
  method: string;
  path: string;
  resource_id: string;
  status_code: number | null;
  details: Record<string, unknown>;
};
type AuditResponse = {
  total: number;
  page: number;
  pages: number;
  page_size: number;
  results: AuditRow[];
};

const CATEGORIES = [
  { value: '', label: 'Todas las categorías' },
  { value: 'NAVEGACION', label: 'Navegación' },
  { value: 'ACCESOS', label: 'Accesos' },
  { value: 'ASIENTOS', label: 'Asientos y mapa' },
  { value: 'PEDIDOS', label: 'Pedidos' },
  { value: 'PAGOS', label: 'Pagos' },
  { value: 'USUARIOS', label: 'Usuarios' },
  { value: 'CONTENIDO', label: 'Eventos y contenido' },
  { value: 'ADMINISTRACION', label: 'Administración' },
];
const ACTION_LABELS: Record<string, string> = {
  VISITA_PAGINA: 'Visitó una página',
  INICIO_SESION: 'Inició sesión',
  LOGIN_RECHAZADO: 'Inicio de sesión rechazado',
  INICIO_SESION_GOOGLE: 'Acceso con Google',
  RESERVAR_ASIENTOS: 'Apartó asientos',
  LIBERAR_ASIENTOS: 'Liberó asientos',
  MODIFICAR_MAPA: 'Modificó el mapa o zonas',
  CREAR_PEDIDO: 'Creó un pedido',
  NOTIFICACION_PAGO: 'Notificación de pago',
  OPERACION_PAGO: 'Operación de pagos o pedidos',
  ADMINISTRAR_USUARIO: 'Modificación de usuario',
  OPERACION_CUENTA: 'Gestión de cuenta',
  GESTION_EVENTOS: 'Gestión de eventos',
  OPERACION_API: 'Acción administrativa',
};

const timeLabel = (value: string) => new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date(value));

export default function AuditoriaPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  const filters = useMemo(() => ({ search, category, from, to }), [search, category, from, to]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<AuditResponse>('/audit/logs/', {
          params: {
            page, page_size: 40,
            q: filters.search || undefined,
            category: filters.category || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
          },
        });
        if (active) setData(response.data);
      } catch (err: unknown) {
        if (active) {
          setData(null);
          const code = (err as { response?: { status?: number } })?.response?.status;
          setError(code === 403 ? 'Acceso restringido: se requiere una cuenta superusuario.' :
            'No se pudieron consultar los registros. Comprueba que el backend y sus migraciones estén actualizados.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 240);
    return () => { active = false; clearTimeout(timer); };
  }, [page, filters, refresh]);

  const updateCategory = (value: string) => { setCategory(value); setPage(1); };
  const updateSearch = (value: string) => { setSearch(value); setPage(1); };
  const updateFrom = (value: string) => { setFrom(value); setPage(1); };
  const updateTo = (value: string) => { setTo(value); setPage(1); };

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-wrap justify-between gap-4 items-start">
        <div>
          <p className="flex items-center gap-2 text-red-400 text-xs uppercase tracking-[.2em] font-bold">
            <ShieldCheck size={16} /> Solo superusuario
          </p>
          <h1 className="text-3xl font-black mt-2">Auditoría de actividad</h1>
          <p className="text-zinc-400 text-sm mt-2 max-w-3xl">
            Historial de visitas y operaciones registradas desde la instalación de esta función.
            Los visitantes anónimos no pueden identificarse por su nombre.
          </p>
        </div>
        <button onClick={() => setRefresh(n => n + 1)}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 flex items-center gap-2">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Buscar</span>
          <div className="flex items-center gap-2 rounded-xl bg-black border border-white/10 px-3">
            <Search size={16} className="text-zinc-500" />
            <input type="search" aria-label="Buscar actividad" value={search} onChange={e => updateSearch(e.target.value)}
              placeholder="Usuario, ruta o acción" className="w-full bg-transparent outline-none py-2.5 text-sm text-white" />
          </div>
        </label>
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Categoría</span>
          <div className="relative">
            <select value={category} onChange={e => updateCategory(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm appearance-none">
              {CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-3 pointer-events-none text-zinc-500" />
          </div>
        </label>
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Desde</span>
          <input type="date" value={from} onChange={e => updateFrom(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm [color-scheme:dark]" />
        </label>
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Hasta</span>
          <input type="date" value={to} onChange={e => updateTo(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm [color-scheme:dark]" />
        </label>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-wrap gap-3 justify-between items-center">
          <p className="flex items-center gap-2 text-sm text-zinc-300">
            <Activity size={17} className="text-red-400" /> {data?.total ?? 0} movimientos registrados
          </p>
          <span className="flex items-center gap-2 text-xs text-zinc-500"><CalendarClock size={15}/> Zona horaria: Morelia / Ciudad de México</span>
        </div>
        {error && <div role="alert" className="p-5 text-red-300 bg-red-500/10">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-4 whitespace-nowrap">Fecha y hora</th>
                <th className="py-4 px-4">Movimiento</th>
                <th className="py-4 px-4">Quién</th>
                <th className="py-4 px-4">Recurso / Ruta</th>
                <th className="py-4 px-4">Estado</th>
                <th className="py-4 px-4">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-zinc-400">Consultando actividad...</td></tr>
              ) : (data?.results.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-zinc-400">No se encontraron movimientos.</td></tr>
              ) : data?.results.map(log => (
                <tr key={log.id} className="border-t border-white/5 align-top hover:bg-white/[.03]">
                  <td className="px-4 py-4 whitespace-nowrap text-zinc-300">{timeLabel(log.created_at)}</td>
                  <td className="px-4 py-4">
                    <span className="font-semibold">{ACTION_LABELS[log.action] || log.action.replaceAll('_', ' ')}</span>
                    <p className="text-xs text-zinc-500 mt-1">{log.category}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="break-all">{log.actor.label}</span>
                    {log.actor.id ? <p className="text-xs text-zinc-500 mt-1">Usuario #{log.actor.id}</p> :
                      <p className="text-xs text-zinc-500 mt-1">Anónimo {log.visitor_id ? '(sesión identificada)' : ''}</p>}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-zinc-300 break-all">{log.path || '—'}</span>
                    {log.resource_id && <p className="text-xs text-zinc-500 mt-1">ID: {log.resource_id}</p>}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`text-xs font-semibold rounded-full px-2 py-1 ${(log.status_code || 200) >= 400
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-emerald-500/10 text-emerald-400'}`}>{log.status_code ?? '—'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => setSelectedId(current => current === log.id ? null : log.id)}
                      aria-expanded={selectedId === log.id}
                      className="text-red-300 text-xs font-semibold underline underline-offset-4">Detalles</button>
                    {selectedId === log.id && (
                      <div className="mt-3 p-3 rounded-lg bg-black border border-white/10 text-xs min-w-[220px] max-w-sm space-y-1">
                        <p>Método: {log.method || '—'}</p>
                        <p>Registro #{log.id}</p>
                        {log.visitor_id && <p className="break-all">Visitante: {log.visitor_id}</p>}
                        {log.source_hash && <p className="break-all">Origen técnico: {log.source_hash}</p>}
                        <pre className="mt-2 whitespace-pre-wrap break-words text-zinc-400">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">Página {data?.page ?? page} de {data?.pages ?? 1}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={loading || page <= 1}
              className="border border-white/10 p-2 rounded-lg disabled:opacity-30 hover:bg-white/10" aria-label="Página anterior">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setPage(p => Math.min(data?.pages ?? p, p + 1))}
              disabled={loading || page >= (data?.pages ?? 1)}
              className="border border-white/10 p-2 rounded-lg disabled:opacity-30 hover:bg-white/10" aria-label="Página siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Se registran operaciones de API y cambios de página posteriores al despliegue.
        No se almacenan contraseñas, tokens, contenido de formularios ni datos de tarjetas.
        El identificador de origen técnico no demuestra la identidad de un visitante.
      </p>
    </div>
  );
}
