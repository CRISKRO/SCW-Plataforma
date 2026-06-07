"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingCart, User, Grid } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const totalItems = useCartStore((state) => state.getTotalItems());

  const navItems = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'Categorías', href: '/tienda', icon: Grid },
    { name: 'Carrito', href: '/carrito', icon: ShoppingCart, badge: totalItems },
    { name: 'Videos', href: '/galeria', icon: Search },
    { name: 'Más', href: isAuthenticated ? '/dashboard' : '/login', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-zinc-950 border-t border-white/10 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2 : 1.5} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
