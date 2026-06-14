"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, ShoppingCart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export default function FloatingLogo() {
  const { isAuthenticated } = useAuthStore();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/images/logo-scw.png" 
            alt="SCW Logo" 
            width={44} 
            height={44} 
            className="rounded-full shadow-lg shadow-black/50 border border-white/20"
          />
          <div className="flex flex-col justify-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            <span className="text-white font-black uppercase tracking-widest text-[10px] leading-tight">
              Strong Classic
            </span>
            <span className="text-white font-black uppercase tracking-widest text-[10px] leading-tight">
              Wrestling
            </span>
          </div>
        </Link>
      </div>

      {mounted && (
        <div className="md:hidden fixed top-4 right-4 z-50 flex items-center gap-3">
          <Link href="/carrito" className="relative flex items-center justify-center w-12 h-12 bg-black/80 backdrop-blur-md rounded-full shadow-lg shadow-black/50 border border-white/20 text-zinc-300 hover:text-white transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full transform translate-x-1/4 -translate-y-1/4">
                {totalItems}
              </span>
            )}
          </Link>
          <Link href={isAuthenticated ? '/dashboard' : '/login'} className="flex items-center justify-center w-12 h-12 bg-black/80 backdrop-blur-md rounded-full shadow-lg shadow-black/50 border border-white/20 text-zinc-300 hover:text-white transition-colors">
            <User className="w-5 h-5" />
          </Link>
        </div>
      )}
    </>
  );
}
