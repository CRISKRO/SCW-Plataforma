"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X, User, ShoppingCart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

const navItems = [
  { name: 'Eventos', href: '/eventos' },
  { name: 'Roster', href: '/roster' },
  { name: 'Premium', href: '/premium' },
  { name: 'Escuela', href: '/escuela' },
  { name: 'Tienda', href: '/tienda' },
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
        isScrolled ? 'bg-black/70 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center h-full py-2">
            <Link href="/" className="flex items-center h-full">
              <Image 
                src="/images/logo-scw.jpg" 
                alt="SCW Logo" 
                width={64} 
                height={64} 
                className="object-contain h-full w-auto rounded-md"
                priority
              />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium uppercase tracking-widest transition-colors relative group"
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
            <div className="hidden md:flex items-center space-x-6">
              {isAuthenticated ? (
                <div className="flex items-center gap-6">
                  {(user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
                    <Link href="/admin" className="text-red-500 hover:text-red-400 text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-1">
                      [Panel Admin]
                    </Link>
                  )}
                  <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-white hover:text-zinc-300 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
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
                  <Link href="/register" className="bg-white text-black hover:bg-zinc-200 px-5 py-2.5 text-sm font-bold uppercase tracking-widest transition-all hover:scale-105">
                    Unirse
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
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
          className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10"
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
            {!isAuthenticated && (
              <div className="pt-4 flex flex-col gap-3 px-3">
                <Link href="/login" className="text-center text-white border border-white/20 py-3 uppercase tracking-widest font-medium">
                  Login
                </Link>
                <Link href="/register" className="text-center bg-white text-black py-3 uppercase tracking-widest font-bold">
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
