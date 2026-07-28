import React from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import type { AdminCrudTableProps } from '../../types';

type AccentKey = 'primary' | 'blue' | 'purple' | 'green';

const accentClasses: Record<AccentKey, { searchFocus: string; btnBg: string; btnHover: string }> = {
  primary: { searchFocus: 'focus:border-primary/50', btnBg: 'bg-primary', btnHover: 'hover:bg-primary-dark' },
  blue: { searchFocus: 'focus:border-blue-500/50', btnBg: 'bg-blue-500', btnHover: 'hover:bg-blue-600' },
  purple: { searchFocus: 'focus:border-purple-500/50', btnBg: 'bg-purple-500', btnHover: 'hover:bg-purple-600' },
  green: { searchFocus: 'focus:border-green-500/50', btnBg: 'bg-green-500', btnHover: 'hover:bg-green-600' },
};

function getAccent(color?: string) {
  const key = (color || 'primary') as AccentKey;
  return accentClasses[key] || accentClasses.primary;
}

export default function AdminCrudTable<T>({
  data,
  columns,
  renderRow,
  keyExtractor,
  title,
  itemCount,
  loading,
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  accentColor,
  emptyIcon = '📋',
  emptyMessage = 'No hay elementos',
  emptyActionLabel,
  onEmptyAction,
  newButtonLabel,
  onNewClick,
}: AdminCrudTableProps<T>) {
  const accent = getAccent(accentColor);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{title}</h1>
          <p className="text-gray-500 text-sm">{itemCount} elementos</p>
        </div>
        {onNewClick && newButtonLabel && (
          <button
            onClick={onNewClick}
            className={`flex items-center gap-2 px-4 py-2.5 ${accent.btnBg} ${accent.btnHover} text-white rounded-xl font-medium transition-colors`}
          >
            <Plus className="w-5 h-5" />
            {newButtonLabel}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-12 pr-4 py-3 bg-[#141414] border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-hidden ${accent.searchFocus} transition-colors`}
        />
      </div>

      {/* Content */}
      {data.length > 0 ? (
        <>
          {/* Table mode (columns provided) */}
          {columns && (
            <div className="overflow-x-auto rounded-2xl border border-white/5">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0d0d0d]">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-[#141414]">
                  {data.map((item) => (
                    <tr key={keyExtractor(item)} className="hover:bg-white/5 transition-colors">
                      {renderRow(item)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Card mode (no columns) OR mobile fallback for table mode */}
          {!columns && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((item) => (
                <div key={keyExtractor(item)}>
                  {renderRow(item)}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-[#141414] rounded-2xl border border-white/5">
          <div className="text-6xl mb-4">{emptyIcon}</div>
          <h3 className="text-xl font-bold text-white mb-2">{emptyMessage}</h3>
          {emptyActionLabel && onEmptyAction && (
            <button
              onClick={onEmptyAction}
              className={`inline-flex items-center gap-2 px-4 py-2 ${accent.btnBg} ${accent.btnHover} text-white rounded-xl font-medium transition-colors`}
            >
              <Plus className="w-5 h-5" />
              {emptyActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
