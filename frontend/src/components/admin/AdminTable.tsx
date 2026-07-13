import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Column {
  key: string;
  label: string;
  render?: (value: any, item: any) => React.ReactNode;
}

interface AdminTableProps {
  columns: Column[];
  data: any[];
  onDelete?: (id: number) => void;
  editUrlPrefix?: string;
  extraActions?: (item: any) => React.ReactNode;
}

export default function AdminTable({ columns, data, onDelete, editUrlPrefix, extraActions }: AdminTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-8 text-center text-zinc-500">
        No hay datos disponibles.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/50 border-b border-white/10">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-4 font-medium tracking-widest">
                  {col.label}
                </th>
              ))}
              {(editUrlPrefix || onDelete || extraActions) && (
                <th className="px-6 py-4 font-medium tracking-widest text-right">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr 
                key={item.id || index} 
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                {columns.map((col) => (
                  <td key={`${item.id}-${col.key}`} className="px-6 py-4">
                    {col.render ? col.render(item[col.key], item) : item[col.key]}
                  </td>
                ))}
                {(editUrlPrefix || onDelete || extraActions) && (
                  <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                    {extraActions && extraActions(item)}
                    {editUrlPrefix && (
                      <Link 
                        href={`${editUrlPrefix}/${item.id}`}
                        className="text-zinc-400 hover:text-white transition-colors inline-block p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(item.id)}
                        className="text-red-500/70 hover:text-red-500 transition-colors p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {data.map((item, index) => (
          <div key={item.id || index} className="bg-zinc-950 border border-white/5 rounded-xl p-4 shadow-xl shadow-black/50 space-y-3">
            {/* Show first column as Title */}
            {columns.length > 0 && (
              <div className="pb-2 border-b border-white/5 font-bold text-white text-lg">
                {columns[0].render ? columns[0].render(item[columns[0].key], item) : item[columns[0].key]}
              </div>
            )}
            
            {/* Show remaining columns */}
            <div className="space-y-2">
              {columns.slice(1).map((col) => (
                <div key={`${item.id}-${col.key}`} className="flex justify-between items-center text-sm gap-2">
                  <span className="text-zinc-500 uppercase tracking-wider text-xs font-semibold">{col.label}</span>
                  <span className="text-zinc-300 text-right">
                    {col.render ? col.render(item[col.key], item) : item[col.key]}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            {(editUrlPrefix || onDelete || extraActions) && (
              <div className="pt-3 border-t border-white/5 flex gap-2">
                {extraActions && extraActions(item)}
                {editUrlPrefix && (
                  <Link 
                    href={`${editUrlPrefix}/${item.id}`}
                    className="flex flex-1 items-center justify-center gap-2 text-zinc-300 bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg transition-colors text-sm font-semibold"
                  >
                    <Edit className="w-4 h-4" /> Editar
                  </Link>
                )}
                {onDelete && (
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="flex items-center justify-center text-red-500 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
}
