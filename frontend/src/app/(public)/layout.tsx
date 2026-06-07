import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import FloatingLogo from '@/components/FloatingLogo';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <FloatingLogo />
      <main className="min-h-screen pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}



