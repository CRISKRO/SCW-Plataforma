import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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
      <main className="min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}



