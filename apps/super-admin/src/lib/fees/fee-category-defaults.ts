/** Default fee type + frequency when an admin picks a category in Add Fee Structure. */
export const FEE_CATEGORY_DEFAULTS: Record<
  string,
  { fee_type: string; frequency: string; description?: string }
> = {
  'Tuition Fee': {
    fee_type: 'Tuition Fee',
    frequency: 'monthly',
    description: 'Regular tuition fees for academic instruction',
  },
  'Transport Fee': {
    fee_type: 'Transport Fee',
    frequency: 'monthly',
    description: 'Bus or van transportation charges',
  },
  'Registration Fee': {
    fee_type: 'Registration Fee',
    frequency: 'yearly',
    description: 'New student registration and admission charges',
  },
  'Library Fee': {
    fee_type: 'Library Fee',
    frequency: 'yearly',
    description: 'Library maintenance and book lending charges',
  },
  'Laboratory Fee': {
    fee_type: 'Laboratory Fee',
    frequency: 'yearly',
    description: 'Science lab and computer lab charges',
  },
  'Sports Fee': {
    fee_type: 'Sports Fee',
    frequency: 'yearly',
    description: 'Sports facilities and equipment charges',
  },
  'Examination Fee': {
    fee_type: 'Examination Fee',
    frequency: 'yearly',
    description: 'Exam paper and evaluation charges',
  },
  'Activity Fee': {
    fee_type: 'Activity Fee',
    frequency: 'monthly',
    description: 'Extra-curricular activities charges',
  },
  'Late Fee': {
    fee_type: 'Late Fee',
    frequency: 'one_time',
    description: 'Penalty for late payment',
  },
  'Other Charges': {
    fee_type: 'Other Charges',
    frequency: 'yearly',
    description: 'Miscellaneous charges',
  },
};

export function getDefaultsForCategoryName(categoryName: string | undefined | null) {
  if (!categoryName) return null;
  return FEE_CATEGORY_DEFAULTS[categoryName] ?? null;
}
