import React from 'react';
import Link from 'next/link';

interface AdminPageHeaderProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  actionIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export default function AdminPageHeader({
  title,
  subtitle,
  icon,
  actionLabel,
  actionHref,
  actionOnClick,
  actionIcon,
  children
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 flex items-center gap-3">
          {icon && <span className="text-red-500 flex items-center">{icon}</span>}
          {title}
        </h1>
        <p className="text-zinc-400 mt-2 text-sm md:text-base">
          {subtitle}
        </p>
      </div>
      
      {actionLabel && (actionHref || actionOnClick) && (
        actionHref ? (
          <Link 
            href={actionHref} 
            className="flex items-center justify-center w-full md:w-auto gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg hover:from-red-500 hover:to-red-700 transition-all shadow-lg shadow-red-950/20 active:scale-95 transform whitespace-nowrap"
          >
            {actionIcon}
            {actionLabel}
          </Link>
        ) : (
          <button 
            onClick={actionOnClick}
            className="flex items-center justify-center w-full md:w-auto gap-2 bg-gradient-to-r from-red-600 to-red-800 text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg hover:from-red-500 hover:to-red-700 transition-all shadow-lg shadow-red-950/20 active:scale-95 transform whitespace-nowrap"
          >
            {actionIcon}
            {actionLabel}
          </button>
        )
      )}
      {children}
    </div>
  );
}
