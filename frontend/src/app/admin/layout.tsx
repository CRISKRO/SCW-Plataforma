"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Trophy, 
  CreditCard,
  GraduationCap,
  Video,
  LogOut,
  Settings,
  Menu,
  X,
  Home,
  ShoppingBag,
  Package,
  Camera,
  Newspaper,
  Star,
  Gift,
  Ticket
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const sidebarItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Eventos', href: '/admin/events', icon: CalendarDays },
  { name: 'Luchadores', href: '/admin/fighters', icon: Trophy },
  { name: 'Usuarios', href: '/admin/users', icon: Users },
  { name: 'Productos', href: '/admin/products', icon: ShoppingBag },
  { name: 'Cupones', href: '/admin/coupons', icon: Ticket },
  { name: 'Pedidos', href: '/admin/orders', icon: Package },
  { name: 'Finanzas', href: '/admin/finances', icon: CreditCard },
  { name: 'Escuela', href: '/admin/school', icon: GraduationCap },
  { name: 'Resultados', href: '/admin/chronicles', icon: Newspaper },
  { name: 'Patrocinadores', href: '/admin/sponsors', icon: Star },
  { name: 'Rifas', href: '/admin/raffles', icon: Gift },
  { name: 'Premium', href: '/admin/premium', icon: Video },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
];

const ALLOWED_ROLES = ['SUPERADMIN', 'ADMIN', 'STAFF', 'REPORTER'];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPERADMIN: ['*'],
  ADMIN: ['*'],
  STAFF: ['/admin', '/admin/events', '/admin/fighters', '/admin/school'],
  REPORTER: ['/admin', '/admin/chronicles'],
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, isLoading, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoading) {
      if (!isAuthenticated || !user || !ALLOWED_ROLES.includes(user.role)) {
        router.push('/login');
      } else {
        const permissions = ROLE_PERMISSIONS[user.role] || [];
        const isAllowed = permissions.includes('*') || permissions.some(path => pathname === path || (pathname.startsWith(`${path}/`) && path !== '/admin'));
        
        if (!isAllowed) {
          router.push('/admin');
        }
      }
    }
  }, [isAuthenticated, user, isLoading, router, pathname]);

  // Cerrar sidebar al cambiar de ruta en móviles
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted || isLoading || !isAuthenticated || !user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-t-2 border-red-500 rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-400 uppercase tracking-widest font-bold text-sm">Verificando Credenciales...</p>
        </div>
      </div>
    );
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  const filteredSidebarItems = sidebarItems.filter(item => {
    return permissions.includes('*') || permissions.includes(item.href);
  });

  return (
    <div className="flex min-h-screen bg-black text-white relative">
      {/* Sidebar - Solo en escritorio */}
      <aside className="hidden md:flex sticky top-0 h-screen w-64 flex-col border-r border-white/10 bg-zinc-950 z-50">
        
        {/* Encabezado lateral */}
        <div className="h-16 flex items-center px-6 border-b border-white/10 flex-shrink-0">
          <h1 className="text-xl font-bold tracking-widest uppercase bg-clip-text bg-gradient-to-r from-white to-zinc-400">
            SCW Admin
          </h1>
        </div>

        {/* Botón para regresar al sitio público / Inicio */}
        <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
          <Link 
            href="/" 
            className="flex items-center justify-center gap-2.5 w-full px-3 py-2.5 bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-sm font-bold transition-all duration-300"
          >
            <Home className="w-4 h-4" />
            Regresar al Inicio
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {filteredSidebarItems.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== '/admin');
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-white text-black font-semibold' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-left font-medium"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 flex flex-col min-w-0 bg-black">
        {/* Barra superior */}
        <header className="sticky top-0 z-40 w-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-200 md:hidden tracking-widest uppercase">SCW Admin</h2>
              <h2 className="text-lg font-medium text-zinc-200 hidden md:block">Panel de Control</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex w-8 h-8 rounded-full bg-zinc-800 border border-white/20 items-center justify-center">
                <span className="text-xs font-bold">{user?.role?.slice(0, 2).toUpperCase() || 'AD'}</span>
              </div>
              
              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="text-zinc-300 hover:text-white focus:outline-none p-1 -mr-2"
                >
                  {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden absolute top-16 left-0 w-full bg-black/95 backdrop-blur-xl border-b border-white/10 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto z-40"
            >
              <div className="px-2 pt-2 pb-6 space-y-1 sm:px-3">
                <Link 
                  href="/" 
                  className="flex items-center gap-3 text-red-400 block px-3 py-4 text-base font-medium uppercase tracking-widest border-b border-white/5"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Home className="w-5 h-5" /> Regresar al Inicio
                </Link>

                {filteredSidebarItems.map((item) => {
                  const isActive = pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== '/admin');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 block px-3 py-4 text-base font-medium uppercase tracking-widest border-b border-white/5 ${
                        isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <Icon className="w-5 h-5" /> {item.name}
                    </Link>
                  );
                })}

                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 w-full text-red-500 block px-3 py-4 text-base font-medium uppercase tracking-widest border-b border-white/5 text-left"
                >
                  <LogOut className="w-5 h-5" /> Cerrar Sesión
                </button>
              </div>
            </motion.div>
          )}
        </header>
        
        {/* Contenido Dinámico de la Página con paddings responsivos */}
        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
