import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="inline-block">
              <Image 
                src="/images/logo-scw.jpg" 
                alt="SCW Logo" 
                width={80} 
                height={80} 
                className="object-contain rounded-md"
              />
            </Link>
            <p className="mt-4 text-zinc-500 text-sm">
              Somos la empresa de lucha libre profesional de Morelia, dedicada a crear espectáculos emocionantes y a formar el talento luchístico del futuro a través del SCW Dojo.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Navegación</h3>
            <ul className="space-y-3 text-zinc-400 text-sm">
              <li><Link href="/eventos" className="hover:text-white transition-colors">Eventos</Link></li>
              <li><Link href="/roster" className="hover:text-white transition-colors">Luchadores</Link></li>
              <li><Link href="/escuela" className="hover:text-white transition-colors">SCW Dojo</Link></li>
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
