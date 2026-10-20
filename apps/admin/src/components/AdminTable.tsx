'use client';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export default function AdminTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  loading,
  emptyMessage = 'لا توجد بيانات',
  onRowClick,
}: Props<T>) {
  if (loading) {
    return (
      <div className="card p-0 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b border-[var(--bg-border)] last:border-0">
            <div className="skeleton h-6 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card text-center py-16">
        <p className="text-5xl mb-4">📭</p>
        <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg-elevated)] border-b border-[var(--bg-border)]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 text-right font-black text-xs uppercase tracking-wider ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={String(row[keyField])}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-[var(--bg-border)] last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-[var(--bg-card-hover)]' : ''} transition`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
