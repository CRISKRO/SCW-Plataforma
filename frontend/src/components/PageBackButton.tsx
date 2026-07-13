"use client";

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  href?: string;
  label?: string;
  className?: string;
}

export default function PageBackButton({ href, label = "Volver", className = "" }: Props) {
  const router = useRouter();

  const content = (
    <>
      <ArrowLeft className="w-4 h-4" />
      {label}
    </>
  );

  const baseClassName = `flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-white transition-colors w-fit mb-6 ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={() => router.back()} className={baseClassName}>
      {content}
    </button>
  );
}
