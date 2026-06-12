"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Target, Grid, Image as ImageIcon, Star } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'Tienda', href: '/tienda', icon: Grid },
    { name: 'Dojo', href: '/escuela', icon: Target },
    { name: 'Roster', href: '/roster', icon: ImageIcon },
    { name: 'Premium', href: '/premium', icon: Star },
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
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
