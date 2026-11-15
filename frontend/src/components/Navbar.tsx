"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X, User, ShoppingCart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

const navItems = [
  { name: 'Inicio', href: '/' },
  { name: 'Eventos', href: '/eventos' },
  { name: 'Roster', href: '/roster' },
  { name: 'Videos', href: '/premium' },
  { name: 'Resultados', href: '/#resultados' },
  { name: 'Dojo', href: '/escuela' },
  { name: 'Tienda', href: '/tienda' },
  { name: 'Patrocinadores', href: '/patrocinadores' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const { isAuthenticated, user } = useAuthStore();
  
  // To avoid hydration mismatch with persist
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    setIsScrolled(latest > 50);
  });

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled || isOpen ? 'bg-black/90 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center h-full py-2">
            <Link href="/" className="flex items-center h-full gap-3">
              <Image 
                src="/images/logo-scw.png" 
                alt="SCW Logo" 
                width={56} 
                height={56} 
                className="object-contain h-full w-auto rounded-md"
                priority
              />
              <div className="flex flex-col justify-center">
                <span className="text-white font-black uppercase tracking-widest text-xs md:text-sm leading-tight">
                  Strong Classic
                </span>
                <span className="text-white font-black uppercase tracking-widest text-xs md:text-sm leading-tight">
                  Wrestling
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:block">
            <div className="ml-2 lg:ml-4 2xl:ml-8 flex items-center space-x-1 lg:space-x-2 2xl:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-zinc-300 hover:text-white px-1.5 lg:px-2 2xl:px-3 py-2 text-[10px] lg:text-[11px] 2xl:text-sm font-medium uppercase tracking-widest transition-colors relative group whitespace-nowrap"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all group-hover:w-full"></span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4 md:space-x-6">
            
            {/* Always visible Cart */}
            <Link href="/carrito" className="relative text-zinc-300 hover:text-white transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Desktop Auth */}
            <div className="hidden lg:flex items-center space-x-2 2xl:space-x-6">
              {isAuthenticated ? (
                <div className="flex items-center gap-2 2xl:gap-6">
                  {['SUPERADMIN', 'ADMIN', 'STAFF', 'REPORTER'].includes(user?.role || '') && (
                    <Link href="/admin" className="rounded-xl bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600 hover:border-red-600 hover:text-white px-2.5 py-1.5 2xl:px-4 2xl:py-2 text-[10px] lg:text-[11px] 2xl:text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-1 whitespace-nowrap">
                      Panel Admin
                    </Link>
                  )}
                  <Link href="/dashboard" className="flex items-center gap-2 rounded-full bg-zinc-900 border border-white/10 hover:border-white/30 pl-1 pr-3 py-1 2xl:pr-4 text-[10px] lg:text-[11px] 2xl:text-sm font-bold text-white transition-colors whitespace-nowrap" title="Mi perfil">
                    <div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">
                      {user?.first_name?.charAt(0) || 'U'}
                    </div>
                    {user?.first_name}
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/login" className="text-zinc-300 hover:text-white text-sm font-medium uppercase tracking-widest transition-colors">
                    Login
                  </Link>
                  <Link href="/register" className="rounded-xl bg-white text-black hover:bg-zinc-200 px-5 py-2.5 text-sm font-black uppercase tracking-widest transition-colors">
                    Unirse
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-zinc-300 hover:text-white focus:outline-none"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-black/95 backdrop-blur-xl border-b border-white/10"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-zinc-300 hover:text-white block px-3 py-4 text-base font-medium uppercase tracking-widest border-b border-white/5"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
            {isAuthenticated ? (
              <div className="pt-4 flex flex-col gap-3 px-3">
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-3 rounded-xl bg-zinc-900 border border-white/10 text-white py-3 px-4 uppercase tracking-widest font-bold"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
                    {user?.first_name?.charAt(0) || 'U'}
                  </div>
                  Mi Perfil
                </Link>
                {['SUPERADMIN', 'ADMIN', 'STAFF', 'REPORTER'].includes(user?.role || '') && (
                  <Link 
                    href="/admin" 
                    className="text-center rounded-xl bg-red-600/10 border border-red-500/30 text-red-400 py-3 uppercase tracking-widest font-black"
                    onClick={() => setIsOpen(false)}
                  >
                    Panel Admin
                  </Link>
                )}
              </div>
            ) : (
              <div className="pt-4 flex flex-col gap-3 px-3">
                <Link href="/login" onClick={() => setIsOpen(false)} className="text-center rounded-xl bg-zinc-900 border border-white/10 text-white py-3 uppercase tracking-widest font-bold">
                  Login
                </Link>
                <Link href="/register" onClick={() => setIsOpen(false)} className="text-center rounded-xl bg-white text-black py-3 uppercase tracking-widest font-black">
                  Unirse
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
