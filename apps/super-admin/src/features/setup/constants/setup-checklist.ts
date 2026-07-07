export type SetupChecklistKey =
  | 'school_profile'
  | 'academic_year'
  | 'classes_sections'
  | 'subjects'
  | 'fee_setup';

export type SetupChecklist = Record<SetupChecklistKey, boolean>;

export const SETUP_CHECKLIST_ITEMS: {
  id: SetupChecklistKey;
  label: string;
  href: string;
}[] = [
  {
    id: 'school_profile',
    label: 'School Profile',
    href: '/settings/setup',
  },
  {
    id: 'academic_year',
    label: 'Academic Session',
    href: '/settings/setup',
  },
  {
    id: 'classes_sections',
    label: 'Classes & Sections',
    href: '/academics/classes',
  },
  {
    id: 'subjects',
    label: 'Subjects',
    href: '/academics/subjects',
  },
  {
    id: 'fee_setup',
    label: 'Fees Assigned',
    href: '/fees/setup/structures',
  },
];
