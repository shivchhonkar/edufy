'use client'

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export interface VirtualizedTableColumn<T> {
  key: string
  header: React.ReactNode
  headerClassName?: string
  cellClassName?: string
  width?: string
  render: (item: T) => React.ReactNode
}

interface VirtualizedTableProps<T> {
  rows: T[]
  columns: VirtualizedTableColumn<T>[]
  getRowKey: (item: T, index: number) => string | number
  rowHeight?: number
  maxHeight?: number | string
  minWidth?: number | string
  emptyMessage?: string
  rowClassName?: string
}

export default function VirtualizedTable<T>({
  rows,
  columns,
  getRowKey,
  rowHeight = 52,
  maxHeight = 'min(70vh, 720px)',
  minWidth = 960,
  emptyMessage = 'No records found.',
  rowClassName = 'hover:bg-gray-50',
}: VirtualizedTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridTemplateColumns = columns.map((column) => column.width ?? '1fr').join(' ')

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  })

  if (rows.length === 0) {
    return <div className="text-center py-16 text-gray-500 text-sm">{emptyMessage}</div>
  }

  return (
    <div ref={scrollRef} className="overflow-auto" style={{ maxHeight }}>
      <div style={{ minWidth }}>
        <div
          className="sticky top-0 z-10 grid bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 border-b border-gray-200"
          style={{ gridTemplateColumns }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className={`px-6 py-3 ${column.headerClassName ?? 'text-left'}`}
            >
              {column.header}
            </div>
          ))}
        </div>

        <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            return (
              <div
                key={getRowKey(row, virtualRow.index)}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className={`absolute left-0 grid w-full border-b border-gray-100 bg-white text-sm ${rowClassName}`}
                style={{
                  gridTemplateColumns,
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={`px-6 py-3 flex items-center min-w-0 ${column.cellClassName ?? 'text-left'}`}
                  >
                    {column.render(row)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
