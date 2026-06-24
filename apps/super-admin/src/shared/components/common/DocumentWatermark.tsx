'use client';

import { resolveAssetUrl } from '@/features/students/utils/school-document-utils';

export interface DocumentWatermarkProps {
  show?: boolean;
  imageUrl?: string;
  text?: string;
  schoolName?: string;
  color?: string;
  variant?: 'center' | 'tile';
  className?: string;
}

export function deriveWatermarkText(schoolName?: string, customText?: string): string {
  if (customText?.trim()) return customText.trim();
  if (!schoolName?.trim()) return 'SCH';
  return schoolName
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 6)
    .toUpperCase();
}

export default function DocumentWatermark({
  show = true,
  imageUrl,
  text,
  schoolName,
  color = '#1e40af',
  variant = 'center',
  className = '',
}: DocumentWatermarkProps) {
  if (!show) return null;

  const resolvedImage = resolveAssetUrl(imageUrl);
  const watermarkText = deriveWatermarkText(schoolName, text);

  if (variant === 'tile') {
    if (resolvedImage) {
      return (
        <div
          className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
          aria-hidden
        >
          <div className="grid h-full w-full grid-cols-3 grid-rows-4 place-items-center gap-4 opacity-[0.05]">
            {Array.from({ length: 12 }).map((_, index) => (
              <img
                key={index}
                src={resolvedImage}
                alt=""
                className="h-16 w-16 rotate-[-25deg] object-contain"
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center gap-8 overflow-hidden opacity-[0.04] ${className}`}
        aria-hidden
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className="text-4xl font-black uppercase rotate-[-25deg]"
            style={{ color }}
          >
            {watermarkText}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden ${className}`}
      aria-hidden
    >
      {resolvedImage ? (
        <div className="scale-[2.5] opacity-[0.06]">
          <img src={resolvedImage} alt="" className="h-32 w-32 object-contain" />
        </div>
      ) : (
        <div className="scale-[2] opacity-[0.04]">
          <span
            className="text-6xl font-black uppercase tracking-widest rotate-[-25deg]"
            style={{ color }}
          >
            {watermarkText}
          </span>
        </div>
      )}
    </div>
  );
}
