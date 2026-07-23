"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  Search, 
  Tag, 
  Percent, 
  DollarSign, 
  Calendar,
  Layers,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import api from '@/services/api';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface Coupon {
  id: number;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: string;
  min_purchase_amount: string;
  max_discount_amount: string | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  is_valid_now?: boolean;
  created_at: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('0.00');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payments/coupons/');
      setCoupons(res.data.results || res.data || []);
    } catch (err) {
      console.error("Error al cargar cupones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setMinPurchase('0.00');
    setMaxDiscount('');
    setMaxUses('');
    setValidFrom('');
    setValidUntil('');
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value);
    setMinPurchase(coupon.min_purchase_amount || '0.00');
    setMaxDiscount(coupon.max_discount_amount || '');
    setMaxUses(coupon.max_uses !== null ? coupon.max_uses.toString() : '');
    
    // Format dates for datetime-local input if present
    setValidFrom(coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : '');
    setValidUntil(coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : '');
    
    setIsActive(coupon.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setFormError('El código del cupón es obligatorio.');
      return;
    }
    if (!discountValue || parseFloat(discountValue) <= 0) {
      setFormError('Ingresa un valor de descuento válido mayor a 0.');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    const payload: any = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      min_purchase_amount: minPurchase ? parseFloat(minPurchase) : 0,
      max_discount_amount: maxDiscount ? parseFloat(maxDiscount) : null,
      max_uses: maxUses ? parseInt(maxUses) : null,
      valid_from: validFrom ? new Date(validFrom).toISOString() : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      is_active: isActive,
    };

    try {
      if (editingCoupon) {
        await api.put(`/payments/coupons/${editingCoupon.id}/`, payload);
      } else {
        await api.post('/payments/coupons/', payload);
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      console.error("Error al guardar cupón:", err);
      const msg = err.response?.data?.code?.[0] || err.response?.data?.detail || 'Error al guardar el cupón. Revisa los datos.';
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await api.patch(`/payments/coupons/${coupon.id}/`, {
        is_active: !coupon.is_active
      });
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
    } catch (err) {
      console.error("Error al cambiar estado del cupón:", err);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deletingCoupon) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/payments/coupons/${deletingCoupon.id}/`);
      setCoupons(prev => prev.filter(c => c.id !== deletingCoupon.id));
      setDeletingCoupon(null);
    } catch (err) {
      console.error("Error al eliminar cupón:", err);
      alert("No se pudo eliminar el cupón.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCoupons = coupons.filter(c => {
    const matchesQuery = c.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStatus === 'ACTIVE') return matchesQuery && c.is_active;
    if (filterStatus === 'INACTIVE') return matchesQuery && !c.is_active;
    return matchesQuery;
  });

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.is_active).length;
  const totalUses = coupons.reduce((acc, c) => acc + (c.uses_count || 0), 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Gestión de Cupones" 
        subtitle="Crea y administra los códigos promocionales y descuentos para la tienda" 
      />

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-950 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total de Cupones</p>
            <p className="text-3xl font-black text-white mt-1">{totalCoupons}</p>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
            <Ticket className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-950 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Cupones Activos</p>
            <p className="text-3xl font-black text-green-400 mt-1">{activeCoupons}</p>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
            <Check className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-950 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Usos Totales</p>
            <p className="text-3xl font-black text-white mt-1">{totalUses}</p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda, Filtro y Botón Nuevo */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-zinc-950 border border-white/10 p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-white/10 pl-10 pr-4 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition-colors uppercase font-mono"
            />
          </div>

          <div className="flex gap-2">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors ${
                  filterStatus === st 
                    ? 'bg-white text-black' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                }`}
              >
                {st === 'ALL' ? 'Todos' : st === 'ACTIVE' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
        >
          <Plus className="w-4 h-4" /> Nuevo Cupón
        </button>
      </div>

      {/* Lista de Cupones */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-12 text-center">
          <Ticket className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white uppercase">No se encontraron cupones</h3>
          <p className="text-zinc-400 text-sm mt-1">Crea tu primer cupón de descuento con el botón "Nuevo Cupón".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => {
            const isExpired = coupon.valid_until && new Date() > new Date(coupon.valid_until);
            const maxedOut = coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses;

            return (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-zinc-950 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  coupon.is_active && !isExpired && !maxedOut 
                    ? 'border-white/10 hover:border-white/30' 
                    : 'border-red-500/20 opacity-75'
                }`}
              >
                <div>
                  {/* Encabezado de la tarjeta */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-black tracking-widest text-red-400 bg-red-950/50 border border-red-500/30 px-3 py-1 rounded-lg uppercase">
                        {coupon.code}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleActive(coupon)}
                      title={coupon.is_active ? 'Desactivar cupón' : 'Activar cupón'}
                      className="text-zinc-400 hover:text-white transition-colors p-1"
                    >
                      {coupon.is_active ? (
                        <ToggleRight className="w-7 h-7 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-zinc-600" />
                      )}
                    </button>
                  </div>

                  {/* Valor del descuento */}
                  <div className="mb-4">
                    <span className="text-2xl font-extrabold text-white">
                      {coupon.discount_type === 'PERCENTAGE' 
                        ? `${parseFloat(coupon.discount_value)}% DE DESCUENTO` 
                        : `$${parseFloat(coupon.discount_value).toFixed(2)} MXN OFF`}
                    </span>
                    {coupon.max_discount_amount && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Topado a mox: ${parseFloat(coupon.max_discount_amount).toFixed(2)} MXN
                      </p>
                    )}
                  </div>

                  {/* Detalles y Reglas */}
                  <div className="space-y-2 text-xs text-zinc-300 border-t border-white/5 pt-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-semibold">Compra mínima:</span>
                      <span className="font-bold text-zinc-200">
                        {parseFloat(coupon.min_purchase_amount) > 0 
                          ? `$${parseFloat(coupon.min_purchase_amount).toFixed(2)} MXN` 
                          : 'Sin mínimo'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-semibold">Usos:</span>
                      <span className="font-bold text-zinc-200">
                        {coupon.uses_count} {coupon.max_uses !== null ? `/ ${coupon.max_uses}` : 'usos (sin límite)'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-semibold">Vigencia:</span>
                      <span className="font-bold text-zinc-200">
                        {coupon.valid_until 
                          ? new Date(coupon.valid_until).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'Indefinida'}
                      </span>
                    </div>
                  </div>

                  {/* Badges de estado */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/5">
                    {!coupon.is_active && (
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded uppercase">
                        Inactivo
                      </span>
                    )}
                    {isExpired && (
                      <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800/40 text-[10px] font-bold rounded uppercase">
                        Expirado
                      </span>
                    )}
                    {maxedOut && (
                      <span className="px-2 py-0.5 bg-orange-950 text-orange-400 border border-orange-800/40 text-[10px] font-bold rounded uppercase">
                        Límite alcanzado
                      </span>
                    )}
                    {coupon.is_active && !isExpired && !maxedOut && (
                      <span className="px-2 py-0.5 bg-green-950 text-green-400 border border-green-800/40 text-[10px] font-bold rounded uppercase">
                        Vigente y listo
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 justify-end mt-5 pt-3 border-t border-white/10">
                  <button
                    onClick={() => handleOpenEditModal(coupon)}
                    className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-white/10 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setDeletingCoupon(coupon)}
                    className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors border border-red-800/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Cupón */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold uppercase text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-red-500" />
                  {editingCoupon ? 'Editar Cupón' : 'Crear Nuevo Cupón'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveCoupon} className="space-y-4">
                {/* Código */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Código Promocional</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. SCW10, VERANO2026"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-black border border-white/20 p-3 rounded-xl text-white font-mono uppercase text-sm focus:outline-none focus:border-red-500 tracking-widest"
                  />
                </div>

                {/* Tipo de Descuento & Valor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Tipo de Descuento</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                    >
                      <option value="PERCENTAGE">Porcentaje (%)</option>
                      <option value="FIXED">Monto Fijo ($ MXN)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      {discountType === 'PERCENTAGE' ? 'Porcentaje de Descuento (%)' : 'Monto de Descuento ($ MXN)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder={discountType === 'PERCENTAGE' ? '10' : '50.00'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 font-bold"
                    />
                  </div>
                </div>

                {/* Compra Mínima & Descuento Máximo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Compra Mínima ($ MXN)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={minPurchase}
                      onChange={(e) => setMinPurchase(e.target.value)}
                      className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Descuento Máximo Topado ($ MXN)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Opcional (Ej. 200.00)"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Usos Máximos */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Límite Total de Usos</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Dejar en blanco para usos ilimitados"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Fechas de Vigencia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Válido Desde</label>
                    <input
                      type="datetime-local"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Válido Hasta</label>
                    <input
                      type="datetime-local"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full bg-black border border-white/20 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Checkbox Activo */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-black text-red-600 focus:ring-0"
                    />
                    <span className="text-sm font-bold text-white uppercase">Cupón Activo</span>
                  </label>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4 border-t border-white/10 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white font-bold text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-bold text-sm transition-all flex items-center gap-2"
                  >
                    {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cupón'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Eliminar */}
      <AnimatePresence>
        {deletingCoupon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold uppercase text-white">¿Eliminar Cupón?</h3>
              <p className="text-sm text-zinc-400">
                ¿Estás seguro de que deseas eliminar el cupón <strong className="text-white font-mono">{deletingCoupon.code}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 pt-3 justify-center">
                <button
                  onClick={() => setDeletingCoupon(null)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteCoupon}
                  disabled={deleteLoading}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
