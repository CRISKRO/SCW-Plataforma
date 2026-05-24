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
  Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState } from 'react';

const sidebarItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Eventos', href: '/admin/events', icon: CalendarDays },
  { name: 'Luchadores', href: '/admin/fighters', icon: Trophy },
  { name: 'Usuarios', href: '/admin/users', icon: Users },
  { name: 'Finanzas', href: '/admin/finances', icon: CreditCard },
  { name: 'Escuela', href: '/admin/school', icon: GraduationCap },
  { name: 'Premium', href: '/admin/premium', icon: Video },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated || (user?.role !== 'SUPERADMIN' && user?.role !== 'ADMIN')) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

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
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-zinc-950 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <h1 className="text-xl font-bold tracking-widest uppercase">SCW Admin</h1>
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-white text-black font-medium' 
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

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-zinc-950/50 backdrop-blur-md">
          <h2 className="text-lg font-medium text-zinc-200">Panel de Control</h2>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center">
              <span className="text-xs font-bold">AD</span>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
