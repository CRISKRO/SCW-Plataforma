"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Mail, Ticket, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'approved' | 'pending' | 'failed'>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);
  const [hasTickets, setHasTickets] = useState(true); // Default true for direct access without data
  const [hasMerch, setHasMerch] = useState(false);

  useEffect(() => {
    const payment_id = searchParams.get('payment_id');
    const external_reference = searchParams.get('external_reference');
    const status = searchParams.get('status');

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
          {hasTickets && (
            <>
              <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-6 flex items-start gap-4 text-left">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Revisa tu correo</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Te hemos enviado un correo con tus <strong className="text-white">boletos QR</strong>. Preséntalo en la entrada del evento para que el personal escanee tu código y te dé acceso.
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
            <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-6 flex items-start gap-4 text-left">
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link href="/eventos" className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 font-bold uppercase tracking-widest transition-colors rounded-xl">
            Ver más Eventos
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
