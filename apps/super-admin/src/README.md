# Shribi Edufy Source Code Structure

This document describes the organized structure of the Shribi Edufy application source code.

## 📁 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (organized by feature)
│   ├── [feature-pages]/          # Feature pages (dashboard, fees, students, etc.)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── features/                     # Feature-based organization
│   ├── auth/                     # Authentication
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   ├── dashboard/                # Dashboard
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   ├── students/                 # Student Management
│   │   ├── components/
│   │   ├── api/
│   │   ├── hooks/
│   │   └── types/
│   ├── fees/                     # Fee Management
│   │   ├── components/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   ├── transport/                # Transport Management
│   │   ├── components/
│   │   ├── api/
│   │   ├── hooks/
│   │   └── types/
│   ├── staff/                    # Staff Management
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   ├── attendance/               # Attendance Management
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   ├── inventory/                # Inventory Management
│   │   ├── components/
│   │   ├── api/
│   │   └── types/
│   └── settings/                 # System Settings
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
│   ├── constants/                # Shared constants
│   └── SettingsContext.tsx       # Global context
│
├── lib/                          # Core libraries
│   ├── auth.ts
│   ├── db.ts
│   ├── utils.ts
│   └── ...
│
└── middleware.ts                 # Next.js middleware
```

## 🎯 Benefits of This Structure

### 1. **Feature-Based Organization**
- Each feature has its own folder with all related code
- Easy to find and maintain feature-specific code
- Clear separation of concerns

### 2. **Scalability**
- New features can be added without affecting existing code
- Each feature is self-contained
- Easy to remove or refactor features

### 3. **Developer Experience**
- Intuitive folder structure
- Clear import paths
- Easy onboarding for new developers

### 4. **Code Reusability**
- Shared components and utilities in `/shared`
- Feature-specific utilities in feature folders
- Clear distinction between shared and feature-specific code

## 📦 Import Examples

### Feature Components
```typescript
// Import from features
import { AddStudentModal } from '@/features/students/components';
import { RecordPaymentModal } from '@/features/fees/components';
import { AddVehicleModal } from '@/features/transport/components';
```

### Shared Components
```typescript
// Import from shared
import { DashboardLayout, Header, Sidebar } from '@/shared/components/layout';
import { StatCard, ConfirmDialog } from '@/shared/components/common';
```

### Shared Utilities
```typescript
// Import shared utilities
import { SettingsContext } from '@/shared/SettingsContext';
import { constants } from '@/shared/constants';
import { types } from '@/shared/types';
```

## 🔧 Migration Notes

### What Was Moved
- **Components**: Moved from `/components` to feature-specific folders
- **Context**: Moved from `/context` to `/shared`
- **Types**: Moved from `/types` to `/shared/types`
- **Constants**: Moved from `/lib/constants` to `/shared/constants`
- **Feature Utils**: Moved to feature-specific `utils` folders

### Import Updates
- All import statements have been automatically updated
- New index files provide clean import paths
- Backward compatibility maintained where possible

## 🚀 Adding New Features

When adding a new feature:

1. Create a new folder in `/features/[feature-name]/`
2. Add subfolders: `components/`, `api/`, `hooks/`, `utils/`, `types/`
3. Create an `index.ts` file in each subfolder for clean exports
4. Add feature-specific pages in `/app/[feature-name]/`
5. Add API routes in `/app/api/[feature-name]/`

## 📝 Best Practices

1. **Keep features self-contained** - Don't import between features
2. **Use shared folder for common code** - Only put truly shared code in `/shared`
3. **Create index files** - For clean import statements
4. **Follow naming conventions** - Use kebab-case for folders, PascalCase for components
5. **Document feature APIs** - Add README files in feature folders for complex features

## 🔍 Finding Code

- **Student Management**: `/features/students/`
- **Fee Management**: `/features/fees/`
- **Transport Management**: `/features/transport/`
- **Staff Management**: `/features/staff/`
- **Attendance**: `/features/attendance/`
- **Settings**: `/features/settings/`
- **Shared Components**: `/shared/components/`
- **API Routes**: `/app/api/`
- **Pages**: `/app/[feature-name]/`

