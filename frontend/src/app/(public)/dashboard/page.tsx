"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { LogOut, User, Ticket, Star, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function UserDashboard() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Perfil */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-zinc-900/50 p-8 rounded-2xl border border-white/10 mb-8">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-4xl font-black text-zinc-500 border-2 border-white/20">
            {user?.first_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold uppercase tracking-tight">{user?.first_name} {user?.last_name}</h1>
            <p className="text-zinc-400 mt-1">{user?.email}</p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-3 py-1 bg-white/10 rounded text-xs font-bold uppercase tracking-widest text-zinc-300">
                Rol: {user?.role}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {(user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
              <Link 
                href="/admin"
                className="flex items-center justify-center gap-2 bg-white text-black font-bold uppercase text-sm tracking-widest px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors w-full"
              >
                Ir a Panel Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 text-red-500 hover:text-red-400 font-bold uppercase text-sm tracking-widest px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors w-full border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Grid de Secciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Tarjeta Premium */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-950 border border-red-900/50 p-6 rounded-xl relative overflow-hidden group hover:border-red-500 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-900/20 blur-2xl rounded-full -mr-10 -mt-10"></div>
            <Star className="w-8 h-8 text-red-500 mb-4" />
            <h3 className="text-xl font-bold uppercase tracking-tight mb-2">SCW Premium</h3>
            {user?.role === 'PREMIUM' || user?.role === 'SUPERADMIN' ? (
              <p className="text-zinc-400 text-sm mb-4">Tu suscripción está activa. Disfruta del catálogo VOD.</p>
            ) : (
              <p className="text-zinc-400 text-sm mb-4">Sube de nivel y accede al contenido exclusivo y backstage.</p>
            )}
            <Link href="/premium" className="text-white text-sm font-bold uppercase tracking-widest hover:text-red-400 transition-colors inline-flex items-center gap-1">
              Ver Catálogo <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Tarjeta Mis Boletos */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-950 border border-white/10 p-6 rounded-xl hover:border-white/30 transition-colors">
            <Ticket className="w-8 h-8 text-zinc-400 mb-4" />
            <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Mis Boletos</h3>
            <p className="text-zinc-400 text-sm mb-4">No tienes próximos eventos agendados.</p>
            <Link href="/eventos" className="text-white text-sm font-bold uppercase tracking-widest hover:text-zinc-400 transition-colors inline-flex items-center gap-1">
              Comprar Boletos <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Tarjeta Tienda */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-950 border border-white/10 p-6 rounded-xl hover:border-white/30 transition-colors">
            <ShoppingBag className="w-8 h-8 text-zinc-400 mb-4" />
            <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Mis Compras</h3>
            <p className="text-zinc-400 text-sm mb-4">Historial de tus compras en la tienda oficial.</p>
            <Link href="/tienda" className="text-white text-sm font-bold uppercase tracking-widest hover:text-zinc-400 transition-colors inline-flex items-center gap-1">
              Ir a la Tienda <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

        </div>

      </div>
    </div>
  );
}

// Simple ChevronRight component for inline use if lucide icon isn't imported above
function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}
