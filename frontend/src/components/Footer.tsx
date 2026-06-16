import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 pt-16 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="inline-block">
              <Image 
                src="/images/logo-scw.png" 
                alt="SCW Logo" 
                width={80} 
                height={80} 
                className="object-contain rounded-md"
              />
            </Link>
            <p className="mt-4 text-zinc-500 text-sm">
              Somos la empresa de lucha libre profesional de Morelia, dedicada a crear espectáculos emocionantes y a formar el talento luchístico del futuro a través de SCW DOJO.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a href="https://www.facebook.com/scwmorelia/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-[#1877F2] hover:text-white transition-all duration-300" title="Facebook">
                <Facebook size={20} />
              </a>
              <a href="https://www.instagram.com/scwmorelia/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-[#E1306C] hover:text-white transition-all duration-300" title="Instagram">
                <Instagram size={20} />
              </a>
              <a href="https://www.youtube.com/@scwstrongclassicwrestling" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-[#FF0000] hover:text-white transition-all duration-300" title="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                </svg>
              </a>
              <a href="https://www.tiktok.com/@scwprowrestling" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black transition-all duration-300" title="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Navegación</h3>
            <ul className="space-y-3 text-zinc-400 text-sm">
              <li><Link href="/eventos" className="hover:text-white transition-colors">Eventos</Link></li>
              <li><Link href="/roster" className="hover:text-white transition-colors">Luchadores</Link></li>
              <li><Link href="/escuela" className="hover:text-white transition-colors">SCW DOJO</Link></li>
              <li><Link href="/tienda" className="hover:text-white transition-colors">Tienda Oficial</Link></li>
              <li><Link href="/premium" className="hover:text-white transition-colors">SCW Premium</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Contacto</h3>
            <ul className="space-y-3 text-zinc-400 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold text-white">Dir:</span> Av. Michoacán 614, Morelia, Mich.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-white">Tel:</span> 443 502 8658
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-white">Email:</span> scwdojo@gmail.com
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Legal</h3>
            <ul className="space-y-3 text-zinc-400 text-sm">
              <li><Link href="/terminos" className="hover:text-white transition-colors">Términos de Servicio</Link></li>
              <li><Link href="/privacidad" className="hover:text-white transition-colors">Aviso de Privacidad</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-zinc-500 text-sm">
          <p>© {new Date().getFullYear()} SCW Strong Classic Wrestling. Todos los derechos reservados. Morelia, Michoacán, México.</p>
        </div>
      </div>
    </footer>
  );
}
