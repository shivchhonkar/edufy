import type { Class } from '@/shared/types';

export type FeeFrequency = 'monthly' | 'yearly' | 'one_time';
export type OptionalFeeFrequency = 'monthly' | 'yearly';

export const CORE_FEE_COLUMNS = [
  {
    key: 'tuition',
    label: 'Monthly Tuition',
    shortLabel: 'Tuition',
    fee_type: 'Tuition Fee',
    frequency: 'monthly' as FeeFrequency,
    defaultAmount: 3500,
    description: 'Charged every month for all enrolled students',
  },
  {
    key: 'registration',
    label: 'Registration',
    shortLabel: 'Registration',
    fee_type: 'Registration Fee',
    frequency: 'one_time' as FeeFrequency,
    defaultAmount: 500,
    description: 'One-time fee when a student joins the school',
  },
] as const;

export const OPTIONAL_FEE_COLUMNS = [
  {
    key: 'library',
    label: 'Library',
    fee_type: 'Library Fee',
    defaultAmount: 200,
    defaultFrequency: 'yearly' as OptionalFeeFrequency,
    description: 'Books and library resources',
  },
  {
    key: 'laboratory',
    label: 'Laboratory',
    fee_type: 'Laboratory Fee',
    defaultAmount: 500,
    defaultFrequency: 'yearly' as OptionalFeeFrequency,
    description: 'Science and computer lab usage',
  },
  {
    key: 'sports',
    label: 'Sports',
    fee_type: 'Sports Fee',
    defaultAmount: 300,
    defaultFrequency: 'yearly' as OptionalFeeFrequency,
    description: 'Sports facilities and equipment',
  },
  {
    key: 'examination',
    label: 'Examination',
    fee_type: 'Examination Fee',
    defaultAmount: 100,
    defaultFrequency: 'yearly' as OptionalFeeFrequency,
    description: 'Exam papers and evaluation',
  },
  {
    key: 'activity',
    label: 'Activity',
    fee_type: 'Activity Fee',
    defaultAmount: 150,
    defaultFrequency: 'monthly' as OptionalFeeFrequency,
    description: 'Extra-curricular activities',
  },
] as const;

export type CoreFeeKey = (typeof CORE_FEE_COLUMNS)[number]['key'];
export type OptionalFeeKey = (typeof OPTIONAL_FEE_COLUMNS)[number]['key'];
export type FeeColumnKey = CoreFeeKey | OptionalFeeKey;

export type FeeCell = { amount: string; structureId?: number };

export type ClassFeeRow = {
  classId: number;
  className: string;
  fees: Record<FeeColumnKey, FeeCell>;
};

export type OptionalFeeConfig = {
  enabled: boolean;
  frequency: OptionalFeeFrequency;
  bulkAmount: string;
};

export type ActiveFeeColumn = {
  key: FeeColumnKey;
  label: string;
  shortLabel: string;
  fee_type: string;
  frequency: FeeFrequency;
};

export function defaultTuitionForClass(className: string): number {
  if (/class\s*[1-3]|^1$|^2$|^3$/i.test(className) || /\b(1|2|3)\b/.test(className)) return 3000;
  if (/class\s*[4-6]|^4$|^5$|^6$/i.test(className) || /\b(4|5|6)\b/.test(className)) return 3500;
  if (/class\s*[7-9]|^7$|^8$|^9$/i.test(className) || /\b(7|8|9)\b/.test(className)) return 4000;
  return 4500;
}

export function buildEmptyFeeRow(cls: Class): ClassFeeRow {
  const fees = {} as Record<FeeColumnKey, FeeCell>;

  for (const col of CORE_FEE_COLUMNS) {
    const amount =
      col.key === 'tuition'
        ? String(defaultTuitionForClass(cls.name))
        : String(col.defaultAmount);
    fees[col.key] = { amount };
  }

  for (const col of OPTIONAL_FEE_COLUMNS) {
    fees[col.key] = { amount: String(col.defaultAmount) };
  }

  return { classId: cls.id, className: cls.name, fees };
}

export function buildDefaultOptionalConfig(): Record<OptionalFeeKey, OptionalFeeConfig> {
  return OPTIONAL_FEE_COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = {
        enabled: false,
        frequency: col.defaultFrequency,
        bulkAmount: String(col.defaultAmount),
      };
      return acc;
    },
    {} as Record<OptionalFeeKey, OptionalFeeConfig>,
  );
}

export function formatFeeFrequency(frequency: FeeFrequency): string {
  if (frequency === 'monthly') return 'Monthly';
  if (frequency === 'yearly') return 'Yearly';
  return 'One-time';
}

export function getActiveFeeColumns(
  optionalConfig: Record<OptionalFeeKey, OptionalFeeConfig>,
): ActiveFeeColumn[] {
  const core = CORE_FEE_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    shortLabel: col.shortLabel,
    fee_type: col.fee_type,
    frequency: col.frequency,
  }));

  const optional = OPTIONAL_FEE_COLUMNS.filter((col) => optionalConfig[col.key]?.enabled).map(
    (col) => ({
      key: col.key,
      label: col.label,
      shortLabel: col.label,
      fee_type: col.fee_type,
      frequency: optionalConfig[col.key].frequency as FeeFrequency,
    }),
  );

  return [...core, ...optional];
}

/** @deprecated Use CORE_FEE_COLUMNS + OPTIONAL_FEE_COLUMNS */
export const SETUP_FEE_COLUMNS = [...CORE_FEE_COLUMNS, ...OPTIONAL_FEE_COLUMNS];
