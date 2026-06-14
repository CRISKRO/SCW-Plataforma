"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ShoppingBag, CreditCard, ShieldCheck, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Shipping states
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [shippingCost, setShippingCost] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState<'MERCADOPAGO' | 'TRANSFER'>('MERCADOPAGO');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems, clearCart } = useCartStore();

  const hasMerch = items.some(i => {
    if (i.requires_shipping !== undefined) {
      return i.requires_shipping;
    }
    return !i.name.toLowerCase().includes('boleto') && !i.name.toLowerCase().includes('entrada');
  });

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
    if (user?.email) setEmail(user.email);
    if (user?.phone_number) setPhone(user.phone_number);
    if (user?.address) setAddress(user.address);
    if (user?.city) setCity(user.city);
    if (user?.state) setState(user.state);
    if (user?.zipcode) setZipcode(user.zipcode);

    // Fetch shipping cost from config
    const fetchConfig = async () => {
      try {
        const res = await api.get('/payments/public-key/');
        if (res.data.shipping_cost) {
          setShippingCost(parseFloat(res.data.shipping_cost));
        }
      } catch (error) {
        console.error("Error fetching config:", error);
      }
    };
    fetchConfig();
  }, [user]);

  const handleCheckout = async () => {
    if (!user) {
      alert("Por favor inicia sesión o regístrate para poder procesar tu compra.");
      router.push('/login?redirect=/carrito');
      return;
    }

    if (!email) {
      alert("Por favor ingresa tu correo electrónico.");
      return;
    }
    if (hasMerch && (!address || !city || !state || !zipcode || !phone)) {
      alert("Por favor completa todos los datos de envío y teléfono de contacto.");
      return;
    }

    if (paymentMethod === 'TRANSFER' && !receiptFile) {
      alert("Por favor sube tu comprobante de pago para la transferencia.");
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        product_id: item.id,
        seat_id: item.seat_id,
        event_id: item.event_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || ''
      }));

      const payload: any = {
        contact_email: email,
        contact_phone: phone,
        items: JSON.stringify(orderItems),
        payment_method: paymentMethod
      };

      if (hasMerch) {
        payload.shipping_address = address;
        payload.shipping_city = city;
        payload.shipping_state = state;
        payload.shipping_zipcode = zipcode;
        payload.shipping_cost = shippingCost.toString();
      }

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value as string);
      });

      if (paymentMethod === 'TRANSFER' && receiptFile) {
        formData.append('transfer_receipt', receiptFile);
      }

      const response = await api.post('/payments/create-order/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.init_point && paymentMethod === 'MERCADOPAGO') {
        clearCart();
        window.location.href = response.data.init_point;
      } else {
        clearCart();
        router.push(`/carrito/success?payment_method=transfer&order_id=${response.data.order_id}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un problema al procesar tu orden. Intenta nuevamente.");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center gap-3 mb-12 border-b border-white/10 pb-6">
          <ShoppingBag className="w-8 h-8" />
          <h1 className="text-4xl font-black uppercase tracking-tight">Tu Carrito</h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold uppercase text-zinc-400">El carrito está vacío</h2>
            <Link href="/tienda" className="inline-block mt-8 bg-white text-black px-8 py-3 font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors">
              Ir a la Tienda
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-12">

            {/* Lista de Productos */}
            <div className="lg:w-3/5 space-y-4">
              {items.map((item) => (
                <motion.div
                  key={`${item.id}-${item.size}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-5 p-4 border border-white/10 bg-zinc-900/50 rounded-xl"
                >
                  <div className="w-24 h-24 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-zinc-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-base font-bold uppercase tracking-tight leading-tight truncate">{item.name}</h3>
                      <p className="font-bold text-base flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    {item.size && <p className="text-zinc-500 text-xs mt-1">{item.size}</p>}

                    <div className="flex justify-between items-center mt-3">
                      {item.seat_id || item.name.toLowerCase().includes('boleto') || item.name.toLowerCase().includes('entrada') ? (
                        <div className="text-sm font-bold text-zinc-500 bg-black border border-white/10 rounded-lg px-3 py-1">
                          Cantidad: {item.quantity}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-black border border-white/10 rounded-lg px-2 py-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)} className="text-zinc-400 hover:text-white w-6 text-center font-bold">−</button>
                          <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)} className="text-zinc-400 hover:text-white w-6 text-center font-bold">+</button>
                        </div>
                      )}
                      <button onClick={() => removeItem(item.id, item.size)} className="text-red-500 hover:text-red-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Panel de Pago */}
            <div className="lg:w-2/5">
              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 sticky top-28 space-y-6">

                {/* Resumen */}
                <div>
                  <h2 className="text-xl font-bold uppercase mb-4">Resumen</h2>
                  <div className="space-y-3 text-sm text-zinc-300">
                    <div className="flex justify-between">
                      <span>Subtotal ({getTotalItems()} artículo{getTotalItems() !== 1 ? 's' : ''})</span>
                      <span>${getTotalPrice().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Envío</span>
                      {hasMerch ? (
                        <span className="text-white">${shippingCost.toFixed(2)}</span>
                      ) : (
                        <span className="text-zinc-500">No aplica</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-4 mt-4 flex justify-between items-end">
                    <span className="font-bold">Total</span>
                    <span className="text-3xl font-black">${(getTotalPrice() + (hasMerch ? shippingCost : 0)).toFixed(2)} <span className="text-sm font-normal text-zinc-500">MXN</span></span>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Correo para confirmación</label>
                  <input
                    type="email"
                    placeholder="tucorreo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black border border-white/20 p-3 rounded-xl text-white focus:outline-none focus:border-[#009EE3] transition-colors text-sm"
                  />
                </div>

                {hasMerch && (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h3 className="font-bold uppercase text-sm">Datos de Envío</h3>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Teléfono de contacto</label>
                      <input type="tel" placeholder="10 dígitos" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-xl text-white focus:outline-none focus:border-[#009EE3] transition-colors text-sm" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Dirección (Calle y Número)</label>
                      <input type="text" placeholder="Ej. Av. Siempre Viva 123" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-xl text-white focus:outline-none focus:border-[#009EE3] transition-colors text-sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Ciudad</label>
                        <input type="text" placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-xl text-white focus:outline-none focus:border-[#009EE3] transition-colors text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Estado</label>
                        <input type="text" placeholder="Estado" value={state} onChange={(e) => setState(e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-xl text-white focus:outline-none focus:border-[#009EE3] transition-colors text-sm" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Código Postal</label>
                      <input type="text" placeholder="C.P." value={zipcode} onChange={(e) => setZipcode(e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-xl text-white focus:outline-none focus:border-[#009EE3] transition-colors text-sm" />
                    </div>
                  </div>
                )}

                {/* Opciones de pago */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h3 className="font-bold uppercase text-sm">Método de Pago</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod('MERCADOPAGO')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'MERCADOPAGO' ? 'bg-[#009EE3]/10 border-[#009EE3] text-[#009EE3]' : 'bg-black border-white/20 text-zinc-400 hover:border-white/40'}`}
                    >
                      <CreditCard className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase text-center">Mercado Pago</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('TRANSFER')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'TRANSFER' ? 'bg-zinc-800 border-white text-white' : 'bg-black border-white/20 text-zinc-400 hover:border-white/40'}`}
                    >
                      <ShoppingBag className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase text-center">Transferencia</span>
                    </button>
                  </div>

                  {paymentMethod === 'TRANSFER' && (
                    <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl space-y-4">
                      <p className="text-sm text-zinc-300">
                        Realiza la transferencia a la siguiente cuenta y sube tu comprobante. Tu pedido será aprobado manualmente en breve.
                      </p>
                      <div className="bg-black p-3 rounded border border-white/10 font-mono text-sm text-white">
                        Banco: BBVA<br />
                        Cuenta: 1234567890<br />
                        CLABE: 012345678901234567<br />
                        Nombre: SCW Pro Wrestling
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Comprobante de Pago</label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón de Pago */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleCheckout}
                    disabled={loading || !email || (paymentMethod === 'TRANSFER' && !receiptFile)}
                    className={`w-full ${paymentMethod === 'TRANSFER' ? 'bg-white hover:bg-zinc-200 text-black' : 'bg-[#009EE3] hover:bg-[#0088cc] text-white'} disabled:bg-zinc-800 disabled:text-zinc-500 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        {paymentMethod === 'TRANSFER' ? <ShoppingBag className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                        {paymentMethod === 'TRANSFER' ? 'Enviar Comprobante' : `Pagar $${(getTotalPrice() + (hasMerch ? shippingCost : 0)).toFixed(2)} con Mercado Pago`}
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs">
                    <Lock className="w-3 h-3" />
                    <span>Pago seguro. Acepta tarjeta, OXXO y transferencia.</span>
                  </div>

                  <div className="flex items-start gap-2 bg-zinc-900 border border-[#009EE3]/20 rounded-xl p-3 text-xs text-zinc-400">
                    <ShieldCheck className="w-4 h-4 text-[#009EE3] flex-shrink-0 mt-0.5" />
                    <span>Serás redirigido a la pasarela oficial de <strong className="text-[#009EE3]">Mercado Pago</strong>. Tu tarjeta es procesada de forma encriptada y el dinero va directamente a la cuenta de SCW.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
