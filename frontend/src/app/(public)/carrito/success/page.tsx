"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Mail, Ticket, ArrowLeft, Loader2, Share2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import QRCode from 'react-qr-code';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'approved' | 'pending' | 'failed' | 'transfer_pending'>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);
  const [hasTickets, setHasTickets] = useState(true); // Default true for direct access without data
  const [hasMerch, setHasMerch] = useState(false);
  const [hasRaffles, setHasRaffles] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    const payment_id = searchParams.get('payment_id');
    const external_reference = searchParams.get('external_reference');
    const status = searchParams.get('status');
    const payment_method = searchParams.get('payment_method');
    const order_id_param = searchParams.get('order_id');

    if (payment_method === 'transfer') {
      setState('transfer_pending');
      setOrderId(order_id_param);
      return;
    }

    // If no payment_id in URL, it's a direct access (no MP payment made yet)
    if (!payment_id || !external_reference) {
      // Still show success if it's a direct success redirect (dev mode)
      setState('approved');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.post('/payments/verify/', {
          payment_id,
          external_reference,
          status
        });
        setOrderId(res.data.order_id?.toString() || external_reference);
        setAlreadyProcessed(res.data.already_processed || false);

        if (res.data.status === 'approved') {
          setState('approved');
          // Guardar tipo de compra para mostrar el mensaje correcto
          if (res.data.has_tickets !== undefined) {
            setHasTickets(res.data.has_tickets);
          }
          if (res.data.has_merch !== undefined) {
            setHasMerch(res.data.has_merch);
          }
          if (res.data.has_raffles !== undefined) {
            setHasRaffles(res.data.has_raffles);
          }
          if (res.data.tickets) {
            setTickets(res.data.tickets);
          }
        } else if (res.data.status === 'in_process' || res.data.status === 'pending') {
          setState('pending');
        } else {
          setState('failed');
        }
      } catch {
        setState('failed');
      }
    };

    verify();
  }, [searchParams]);

  const shareQRImage = async (item: any) => {
    try {
      const svg = document.getElementById(`qr-${item.id}`);
      if (!svg) return;
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
      });
      
      // Añadir margen blanco alrededor del QR
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
      }
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      
      const file = new File([blob], `Boleto-SCW-${item.id}.png`, { type: "image/png" });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Boleto SCW - ${item.event_name}`,
          text: `¡Aquí está mi boleto de SCW para ${item.event_name}! Este código es mi acceso al evento.`,
          files: [file]
        });
      } else {
        // Fallback: Descargar la imagen
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Intentar abrir Whatsapp de todos modos sin la imagen
        const textToShare = encodeURIComponent(`¡Aquí está mi boleto de SCW para ${item.event_name}! Acabo de descargar la imagen en mi dispositivo para enviarla.`);
        window.open(`https://wa.me/?text=${textToShare}`, '_blank');
      }
    } catch (error) {
      console.error("Error sharing QR:", error);
      alert("Hubo un error al intentar compartir la imagen. Asegúrate de darle permisos a tu navegador.");
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#009EE3] animate-spin mx-auto" />
          <p className="text-white font-bold text-lg">Verificando tu pago...</p>
          <p className="text-zinc-500 text-sm">Espera un momento</p>
        </div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-black uppercase mb-3">Pago no completado</h1>
          <p className="text-zinc-400 mb-8">Tu pago no fue procesado. Puedes intentarlo de nuevo.</p>
          <Link href="/carrito" className="bg-white text-black px-8 py-3 font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver al Carrito
          </Link>
        </motion.div>
      </div>
    );
  }

  if (state === 'transfer_pending') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-blue-500" />
          </div>
          <h1 className="text-2xl font-black uppercase mb-3">Comprobante en Revisión</h1>
          <p className="text-zinc-400 mb-3">Tu comprobante de pago está en revisión. Una vez confirmado por un administrador, recibirás tus accesos o recibos por correo.</p>
          {orderId && <p className="text-zinc-500 text-sm mb-8">Orden #{orderId}</p>}
          <Link href="/" className="bg-white text-black px-8 py-3 font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors inline-block rounded-xl">Volver al inicio</Link>
        </motion.div>
      </div>
    );
  }

  if (state === 'pending') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-black uppercase mb-3">Pago en Proceso</h1>
          <p className="text-zinc-400 mb-3">Tu pago está siendo verificado. Una vez confirmado recibirás tus boletos por correo.</p>
          <p className="text-zinc-500 text-sm mb-8">Orden #{orderId}</p>
          <Link href="/" className="text-[#009EE3] hover:underline">Volver al inicio</Link>
        </motion.div>
      </div>
    );
  }

  // APPROVED
  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4 text-center">

        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 120 }}>
          {/* Success Icon */}
          <div className="w-28 h-28 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-500/30">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </div>

          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">¡Pago Exitoso!</h1>
          {orderId && <p className="text-zinc-500 text-sm mb-8">Orden #{orderId}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Ticket Notice */}
          {hasTickets && tickets.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold uppercase tracking-widest mb-6">Tus Códigos de Acceso</h2>
              
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex items-start gap-4 text-left mb-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">¡Aquí están tus boletos!</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    También te hemos enviado una copia a tu correo electrónico. Puedes tomar captura de pantalla o presionar en "Compartir" para mandarlos por WhatsApp a tus acompañantes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center">
                    <p className="font-bold text-lg text-white mb-1 text-center">{ticket.event_name}</p>
                    {ticket.seat_name && <p className="text-zinc-400 text-sm mb-4">{ticket.seat_name}</p>}
                    
                    <div className="bg-white p-3 rounded-xl">
                      <QRCode
                        id={`qr-${ticket.id}`}
                        value={JSON.stringify({ scw: true, order: orderId, item: ticket.id, code: ticket.ticket_hash })}
                        size={180}
                      />
                    </div>
                    
                    <button
                      onClick={() => shareQRImage(ticket)}
                      className="mt-6 flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#128C7E] transition-colors w-full shadow-lg shadow-green-900/20"
                    >
                      <Share2 className="w-5 h-5" /> Compartir en WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasTickets && tickets.length === 0 && (
            <>
              <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-6 flex items-start gap-4 text-left">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Revisa tu correo</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Te hemos enviado un correo con tus <strong className="text-white">boletos QR</strong>. Preséntalo en la entrada del evento para que el personal escanee tu código y te dé acceso. (Puedes verlos en la sección "Mis Compras").
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex items-start gap-4 text-left">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Instrucciones de acceso</h3>
                  <ul className="text-zinc-400 text-sm space-y-1">
                    <li>• Cada QR es único y de un solo uso</li>
                    <li>• Muéstralo en tu teléfono o impreso</li>
                    <li>• Llega con tiempo antes del evento</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Merch Notice */}
          {hasMerch && (
            <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-6 flex items-start gap-4 text-left mt-6">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Tu pedido está en camino</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Te hemos enviado un correo con el <strong className="text-white">recibo de tu compra</strong>. Te mantendremos informado sobre el estado de tu envío.
                </p>
              </div>
            </div>
          )}

          {/* Raffles Notice */}
          {hasRaffles && (
            <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl p-6 flex items-start gap-4 text-left mt-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Ticket className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">¡Boletos de Rifa Adquiridos!</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Tus números para la rifa han sido registrados exitosamente. Te hemos enviado un <strong className="text-white">recibo a tu correo electrónico</strong> con los detalles. ¡Mucha suerte!
                </p>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link href="/dashboard" className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 font-bold uppercase tracking-widest transition-colors rounded-xl">
            Ver Mis Compras
          </Link>
          <Link href="/" className="bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white px-8 py-3 font-bold uppercase tracking-widest transition-colors rounded-xl">
            Ir al Inicio
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function CartSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
