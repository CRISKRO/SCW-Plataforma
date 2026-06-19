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
  Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';

const sidebarItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Eventos', href: '/admin/events', icon: CalendarDays },
  { name: 'Luchadores', href: '/admin/fighters', icon: Trophy },
  { name: 'Usuarios', href: '/admin/users', icon: Users },
  { name: 'Productos', href: '/admin/products', icon: ShoppingBag },
  { name: 'Pedidos', href: '/admin/orders', icon: Package },
  { name: 'Galería', href: '/admin/gallery', icon: Camera },
  { name: 'Finanzas', href: '/admin/finances', icon: CreditCard },
  { name: 'Escuela', href: '/admin/school', icon: GraduationCap },
  { name: 'Resultados', href: '/admin/chronicles', icon: Newspaper },
  { name: 'Patrocinadores', href: '/admin/sponsors', icon: Star },
  { name: 'Premium', href: '/admin/premium', icon: Video },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || (user?.role !== 'SUPERADMIN' && user?.role !== 'ADMIN')) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  // Cerrar sidebar al cambiar de ruta en móviles
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted || !isAuthenticated || (user?.role !== 'SUPERADMIN' && user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-t-2 border-red-500 rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-400 uppercase tracking-widest font-bold text-sm">Verificando Credenciales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white relative overflow-hidden">
      {/* Backdrop oscuro para dispositivos móviles */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Oculto con animación de traslación en móviles y visible en escritorio */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-zinc-950 flex flex-col transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:relative md:flex transition-transform duration-300 ease-in-out`}>
        
        {/* Encabezado lateral */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 flex-shrink-0">
          <h1 className="text-xl font-bold tracking-widest uppercase bg-clip-text bg-gradient-to-r from-white to-zinc-400">
            SCW Admin
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white md:hidden rounded-lg hover:bg-white/5 transition-all"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
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
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black">
        {/* Barra superior con botón hamburguesa móvil */}
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b border-white/10 bg-zinc-950/50 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-zinc-400 hover:text-white md:hidden rounded-lg hover:bg-white/5 transition-all"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-medium text-zinc-200">Panel de Control</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center">
              <span className="text-xs font-bold">AD</span>
            </div>
          </div>
        </header>
        
        {/* Contenido Dinámico de la Página con paddings responsivos */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
