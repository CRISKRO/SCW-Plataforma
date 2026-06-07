import Link from 'next/link';
import Image from 'next/image';

export default function FloatingLogo() {
  return (
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
  );
}
