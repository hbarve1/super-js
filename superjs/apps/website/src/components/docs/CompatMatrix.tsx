'use client'

import { useMemo, useState } from 'react'
import type { CompatRow } from '@/lib/compat-matrix'

type SortKey = keyof Pick<
  CompatRow,
  'package' | 'wrapper' | 'coverage' | 'status' | 'version' | 'licenseCompat'
>

const COLUMNS: { key: SortKey | 'esm' | 'cjs'; label: string; sortable: boolean }[] = [
  { key: 'package', label: 'Package', sortable: true },
  { key: 'wrapper', label: 'Wrapper', sortable: true },
  { key: 'coverage', label: 'Coverage', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'version', label: 'Tested version', sortable: true },
  { key: 'esm', label: 'ESM', sortable: true },
  { key: 'cjs', label: 'CJS', sortable: true },
  { key: 'licenseCompat', label: 'License', sortable: true },
]

function cellValue(row: CompatRow, key: (typeof COLUMNS)[number]['key']): string {
  if (key === 'esm') return row.esm ? '✓' : '—'
  if (key === 'cjs') return row.cjs ? '✓' : '—'
  if (key === 'coverage') return row.coverage > 0 ? `${row.coverage}%` : '—'
  return String(row[key])
}

function compareRows(a: CompatRow, b: CompatRow, key: (typeof COLUMNS)[number]['key'], asc: boolean) {
  if (key === 'coverage') {
    const diff = a.coverage - b.coverage
    return asc ? diff : -diff
  }
  const av = cellValue(a, key)
  const bv = cellValue(b, key)
  const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
  return asc ? cmp : -cmp
}

interface CompatMatrixProps {
  rows: CompatRow[]
  generatedAt: string
}

export default function CompatMatrix({ rows, generatedAt }: CompatMatrixProps) {
  const [sortKey, setSortKey] = useState<(typeof COLUMNS)[number]['key']>('package')
  const [asc, setAsc] = useState(true)

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => compareRows(a, b, sortKey, asc))
    return copy
  }, [rows, sortKey, asc])

  function onHeaderClick(key: (typeof COLUMNS)[number]['key']) {
    if (sortKey === key) setAsc((v) => !v)
    else {
      setSortKey(key)
      setAsc(true)
    }
  }

  return (
    <div className="my-6">
      <p className="text-sm text-text-subtle mb-3">
        {rows.length} packages · last generated {generatedAt}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-2 text-text-primary font-semibold bg-surface-2 border border-border cursor-pointer select-none"
                  onClick={() => col.sortable && onHeaderClick(col.key)}
                  aria-sort={sortKey === col.key ? (asc ? 'ascending' : 'descending') : 'none'}
                >
                  {col.label}
                  {sortKey === col.key ? (asc ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.wrapper} className="hover:bg-surface-2/50">
                {COLUMNS.map((col) => (
                  <td key={col.key} className="px-4 py-2 text-text-muted border border-border">
                    {col.key === 'wrapper' ? (
                      <code className="text-amber font-mono text-xs">{row.wrapper}</code>
                    ) : (
                      cellValue(row, col.key)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
