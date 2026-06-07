"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function FloatingLogo() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Link href="/">
          <Image 
            src="/images/logo-scw.jpg" 
            alt="SCW Logo" 
            width={48} 
            height={48} 
            className="rounded-full shadow-lg shadow-black/50 border border-white/20"
          />
        </Link>
      </div>

      {mounted && (
        <div className="md:hidden fixed top-4 right-4 z-50 flex items-center justify-center w-12 h-12 bg-black/80 backdrop-blur-md rounded-full shadow-lg shadow-black/50 border border-white/20">
          <Link href={isAuthenticated ? '/dashboard' : '/login'} className="text-zinc-300 hover:text-white flex items-center justify-center w-full h-full">
            <User className="w-6 h-6" />
          </Link>
        </div>
      )}
    </>
  );
}
