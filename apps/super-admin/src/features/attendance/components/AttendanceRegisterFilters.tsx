'use client'

import React, { useState } from 'react'
import { FiChevronDown, FiChevronUp, FiFilter } from 'react-icons/fi'

interface AttendanceRegisterFiltersProps {
  summary: string
  children: React.ReactNode
  expanded?: boolean
}

export default function AttendanceRegisterFilters({
  summary,
  children,
  expanded = false,
}: AttendanceRegisterFiltersProps) {
  

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
     
        {/* <div className="flex items-center gap-2 min-w-0">
          <FiFilter className="w-4 h-4 text-gray-400 shrink-0" />
          {/* <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Filters</p>
            {!expanded && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{summary}</p>
            )}
          </div> *
        </div> */}
        {/* {expanded ? (
          <FiChevronUp className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
        ) : (
          <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
        )} */}
      {/* </button> */}

      {expanded && <div className="px-3 pb-3 border-t border-gray-100 pt-3">{children}</div>}
    </div>
  )
}
