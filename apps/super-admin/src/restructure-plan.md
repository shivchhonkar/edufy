# Code Restructuring Plan

## Current Issues
1. All components in a single folder (hard to find related components)
2. API routes mixed together without clear grouping
3. No clear separation between domain logic
4. Utility files scattered
5. No clear feature-based organization

## Proposed New Structure

```
src/
├── app/                          # Next.js app router (keep as is)
│   ├── api/                      # API routes (reorganized by feature)
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── [feature-pages]/
│
├── features/                     # Feature-based organization
│   ├── auth/
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   ├── dashboard/
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   ├── students/
│   │   ├── components/
│   │   ├── api/
│   │   ├── hooks/
│   │   └── types/
│   ├── fees/
│   │   ├── components/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   ├── transport/
│   │   ├── components/
│   │   ├── api/
│   │   ├── hooks/
│   │   └── types/
│   ├── staff/
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   ├── attendance/
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   ├── inventory/
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   └── settings/
│       ├── components/
│       ├── api/
│       └── types/
│
├── shared/                       # Shared utilities and components
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   ├── layout/               # Layout components
│   │   └── common/               # Common components
│   ├── hooks/                    # Shared hooks
│   ├── utils/                    # Shared utilities
│   ├── types/                    # Shared types
│   └── constants/                # Shared constants
│
├── lib/                          # Core libraries (keep existing)
│   ├── auth.ts
│   ├── db.ts
│   ├── utils.ts
│   └── ...
│
└── middleware.ts                 # Keep as is
```

## Migration Steps
1. Create new folder structure
2. Move components to appropriate feature folders
3. Reorganize API routes by feature
4. Move shared utilities to shared folder
5. Update all import statements
6. Remove unused files
7. Test functionality

## Benefits
- Better code organization by feature
- Easier to find related code
- Clearer separation of concerns
- Better maintainability
- Easier for new developers to understand

