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
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
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
                      className="text-zinc-400 hover:text-white transition-colors inline-block"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  )}
                  {onDelete && (
                    <button 
                      onClick={() => onDelete(item.id)}
                      className="text-red-500/70 hover:text-red-500 transition-colors"
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
  );
}
