'use client';

import type { InquiryStatus } from '@/lib/admission-inquiry-api';
import type { Inquiry } from '@/features/admissions/components/InquiryDetailModal';
import {
  PIPELINE_STATUSES,
  STATUS_COLUMN_META,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  formatInquiryDate,
  formatInquiryNumber,
  formatInquiryRelativeTime,
  getInquiryCardTags,
  inquiryClassDisplay,
  inquiryStudentName,
} from '@/features/admissions/utils/inquiry-labels';
import { FiAlertCircle, FiMoreVertical, FiPlus } from 'react-icons/fi';

const CLOSED_PREVIEW_LIMIT = 3;

interface InquiryKanbanBoardProps {
  boardColumns: Record<string, Inquiry[]>;
  terminalColumns: Record<string, Inquiry[]>;
  draggingId: number | null;
  dragOverColumn: InquiryStatus | null;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onDragOverColumn: (status: InquiryStatus | null) => void;
  onDrop: (inquiryId: number, status: InquiryStatus) => void;
  onOpenInquiry: (id: number) => void;
  onAddInquiry: (status?: InquiryStatus) => void;
  onViewAllClosed: (status: InquiryStatus) => void;
  needsStudentConversion: (inquiry: Inquiry) => boolean;
}

function InquiryCard({
  inquiry,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
  compact = false,
}: {
  inquiry: Inquiry;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
  compact?: boolean;
}) {
  const tags = getInquiryCardTags(inquiry);
  const classInfo = inquiryClassDisplay(inquiry);
  const pendingConversion =
    inquiry.status === 'registered' && !inquiry.converted_student_id;
  const timeLabel =
    inquiry.status === 'visit_scheduled' && inquiry.follow_up_date
      ? formatInquiryDate(inquiry.follow_up_date)
      : formatInquiryRelativeTime(inquiry.updated_at || inquiry.created_at);

  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left rounded-md border border-gray-200 bg-white px-2.5 py-2 hover:border-gray-300 hover:shadow-sm transition-all"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {inquiryStudentName(inquiry)}
            </p>
            <p className="text-[10px] text-gray-500 truncate">
              {formatInquiryNumber(inquiry.inquiry_number)}
              {classInfo.name ? ` · Class ${classInfo.name}` : ''}
            </p>
          </div>
          {tags[0] && (
            <span
              className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${tags[0].className}`}
            >
              {tags[0].label}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-1 truncate">
          {inquiry.parent_name} · {inquiry.parent_phone}
        </p>
      </button>
    );
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('inquiryId', String(inquiry.id));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`w-full text-left rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-grab active:cursor-grabbing ${
        dragging ? 'opacity-40 ring-2 ring-primary-300' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-sm font-semibold text-gray-900 leading-snug">
          {inquiryStudentName(inquiry)}
        </p>
        {pendingConversion && (
          <FiAlertCircle className="shrink-0 text-amber-500" size={14} aria-label="Conversion pending" />
        )}
      </div>

      <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
        {formatInquiryNumber(inquiry.inquiry_number)}
      </p>

      <p className="text-[11px] text-gray-500 mt-1 truncate">{inquiry.parent_name}</p>
      <p className="text-[11px] text-gray-400 truncate">{inquiry.parent_phone}</p>

      {timeLabel && (
        <p className="text-[10px] text-gray-400 mt-1.5">
          {inquiry.status === 'visit_scheduled' && inquiry.follow_up_date
            ? `Visit: ${timeLabel}`
            : timeLabel}
        </p>
      )}

      {(tags.length > 0 || classInfo.name) && (
        <div className="flex flex-wrap items-center gap-1 mt-2">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${tag.className}`}
            >
              {tag.label}
            </span>
          ))}
          {classInfo.name && (
            <span className="ml-auto text-[10px] text-gray-500 font-medium">
              Class: {classInfo.name}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function KanbanColumn({
  status,
  inquiries,
  draggingId,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenInquiry,
  onAddInquiry,
  showAddButton = true,
}: {
  status: InquiryStatus;
  inquiries: Inquiry[];
  draggingId: number | null;
  isDragOver: boolean;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (inquiryId: number) => void;
  onOpenInquiry: (id: number) => void;
  onAddInquiry: () => void;
  showAddButton?: boolean;
}) {
  const meta = STATUS_COLUMN_META[status];

  return (
    <div
      className={`shrink-0 w-[17rem] flex flex-col max-h-[calc(100vh-18rem)] min-h-[20rem] rounded-lg border border-gray-200 bg-gray-50/80 border-t-[3px] ${meta.borderClass} ${
        isDragOver ? 'ring-2 ring-primary-400 bg-primary-50/30' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const id = parseInt(e.dataTransfer.getData('inquiryId'), 10);
        if (id) onDrop(id);
      }}
    >
      <div className="px-2.5 pt-2.5 pb-2 border-b border-gray-200/80">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-gray-800">{STATUS_LABELS[status]}</h3>
              <span className="text-[10px] font-semibold bg-gray-200/80 text-gray-600 px-1.5 py-0.5 rounded-full">
                {inquiries.length}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{meta.subtitle}</p>
          </div>
          <button
            type="button"
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200/60"
            aria-label="Column options"
          >
            <FiMoreVertical size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
        {inquiries.map((inquiry) => (
          <InquiryCard
            key={inquiry.id}
            inquiry={inquiry}
            dragging={draggingId === inquiry.id}
            onDragStart={() => onDragStart(inquiry.id)}
            onDragEnd={onDragEnd}
            onOpen={() => onOpenInquiry(inquiry.id)}
          />
        ))}
        {inquiries.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 py-6 text-center text-[10px] text-gray-400">
            Drop inquiries here
          </div>
        )}
      </div>

      {showAddButton && (
        <div className="p-2 border-t border-gray-200/80">
          <button
            type="button"
            onClick={onAddInquiry}
            className="w-full flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium text-gray-600 hover:bg-white hover:text-primary-700 border border-transparent hover:border-gray-200 transition-colors"
          >
            <FiPlus size={12} />
            Add Inquiry
          </button>
        </div>
      )}
    </div>
  );
}

export default function InquiryKanbanBoard({
  boardColumns,
  terminalColumns,
  draggingId,
  dragOverColumn,
  onDragStart,
  onDragEnd,
  onDragOverColumn,
  onDrop,
  onOpenInquiry,
  onAddInquiry,
  onViewAllClosed,
  needsStudentConversion,
}: InquiryKanbanBoardProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-max">
          {PIPELINE_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              inquiries={boardColumns[status] || []}
              draggingId={draggingId}
              isDragOver={dragOverColumn === status}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={() => onDragOverColumn(status)}
              onDragLeave={() => onDragOverColumn(null)}
              onDrop={(id) => onDrop(id, status)}
              onOpenInquiry={onOpenInquiry}
              onAddInquiry={() => onAddInquiry(status)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <h3 className="text-xs font-bold text-gray-700 mb-3">Closed pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TERMINAL_STATUSES.map((status) => {
            const items = terminalColumns[status] || [];
            const meta = STATUS_COLUMN_META[status];
            const preview = items.slice(0, CLOSED_PREVIEW_LIMIT);

            return (
              <div
                key={status}
                className={`rounded-lg border border-gray-200 border-t-[3px] ${meta.borderClass} p-2.5`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = parseInt(e.dataTransfer.getData('inquiryId'), 10);
                  if (id) onDrop(id, status);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{STATUS_LABELS[status]}</h4>
                    <p className="text-[10px] text-gray-400">{meta.subtitle}</p>
                  </div>
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-1.5 min-h-[4rem]">
                  {preview.map((inquiry) => (
                    <InquiryCard
                      key={inquiry.id}
                      inquiry={inquiry}
                      dragging={false}
                      compact
                      onDragStart={() => {}}
                      onDragEnd={() => {}}
                      onOpen={() => onOpenInquiry(inquiry.id)}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-3">None yet</p>
                  )}
                </div>

                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onViewAllClosed(status)}
                    className="mt-2 text-[10px] font-medium text-primary-600 hover:text-primary-800"
                  >
                    View all {STATUS_LABELS[status].toLowerCase()} ({items.length}) →
                  </button>
                )}

                {status === 'registered' &&
                  (boardColumns.registered?.some(needsStudentConversion) ?? false) && (
                    <p className="mt-2 text-[10px] text-amber-700 flex items-center gap-1">
                      <FiAlertCircle size={11} />
                      Some registered leads need student conversion
                    </p>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
