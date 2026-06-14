const fs = require('fs');
const path = require('path');

// Import mapping for moved files
const importMappings = {
  // Fees components
  '@/features/fees/components/AddFeeStructureModal': '@/features/fees/components/AddFeeStructureModal',
  '@/features/fees/components/RecordPaymentModal': '@/features/fees/components/RecordPaymentModal',
  '@/features/fees/components/SimpleRecordPaymentModal': '@/features/fees/components/SimpleRecordPaymentModal',
  '@/features/fees/components/ViewStudentFeesModal': '@/features/fees/components/ViewStudentFeesModal',
  '@/features/fees/components/ReceiptModal': '@/features/fees/components/ReceiptModal',
  '@/features/fees/components/PrintableReceipt': '@/features/fees/components/PrintableReceipt',
  
  // Student components
  '@/features/students/components/AddStudentModal': '@/features/students/components/AddStudentModal',
  '@/features/students/components/ViewStudentModal': '@/features/students/components/ViewStudentModal',
  
  // Transport components
  '@/features/transport/components/AddRouteModal': '@/features/transport/components/AddRouteModal',
  '@/features/transport/components/AddTransportAssignmentModal': '@/features/transport/components/AddTransportAssignmentModal',
  '@/features/transport/components/AddVehicleModal': '@/features/transport/components/AddVehicleModal',
  '@/features/transport/components/AssignVehicleToRouteModal': '@/features/transport/components/AssignVehicleToRouteModal',
  '@/features/transport/components/ViewRouteModal': '@/features/transport/components/ViewRouteModal',
  '@/features/transport/components/ViewVehicleModal': '@/features/transport/components/ViewVehicleModal',
  
  // Staff components
  '@/features/staff/components/AddStaffModal': '@/features/staff/components/AddStaffModal',
  '@/features/staff/components/ViewStaffModal': '@/features/staff/components/ViewStaffModal',
  
  // Attendance components
  '@/features/attendance/components/RecordAttendanceModal': '@/features/attendance/components/RecordAttendanceModal',
  '@/features/attendance/components/AttendanceReportsModal': '@/features/attendance/components/AttendanceReportsModal',
  '@/features/attendance/components/PunchMachineModal': '@/features/attendance/components/PunchMachineModal',
  
  // Settings components
  '@/features/settings/components/AddHolidayModal': '@/features/settings/components/AddHolidayModal',
  '@/features/settings/components/EditHolidayModal': '@/features/settings/components/EditHolidayModal',
  
  // Layout components
  '@/shared/components/layout/DashboardLayout': '@/shared/components/layout/DashboardLayout',
  '@/shared/components/layout/Header': '@/shared/components/layout/Header',
  '@/shared/components/layout/Sidebar': '@/shared/components/layout/Sidebar',
  
  // Common components
  '@/shared/components/common/StatCard': '@/shared/components/common/StatCard',
  '@/shared/components/common/ConfirmDialog': '@/shared/components/common/ConfirmDialog',
  
  // Context
  '@/shared/SettingsContext': '@/shared/SettingsContext',
  
  // Types
  '@/shared/types': '@/shared/types',
  
  // Constants
  '@/shared/constants/constants': '@/shared/constants/constants',
  
  // Utils (moved to features)
  '@/features/fees/utils/autoFeeSync': '@/features/fees/utils/autoFeeSync',
  '@/features/fees/utils/paymentSync': '@/features/fees/utils/paymentSync',
};

// Function to recursively find all files
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Skip node_modules and .next directories
      if (!['node_modules', '.next', '.git'].includes(file)) {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Function to update imports in a file
function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Update imports
    Object.entries(importMappings).forEach(([oldImport, newImport]) => {
      const regex = new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.includes(oldImport)) {
        content = content.replace(regex, newImport);
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated imports in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function updateAllImports() {
  console.log('🔄 Updating import statements...');
  
  const srcDir = path.join(__dirname);
  const files = findFiles(srcDir);
  
  let updatedCount = 0;
  
  files.forEach(file => {
    if (updateImportsInFile(file)) {
      updatedCount++;
    }
  });
  
  console.log(`\n🎉 Import update completed!`);
  console.log(`   📁 Files processed: ${files.length}`);
  console.log(`   ✅ Files updated: ${updatedCount}`);
  console.log(`   📝 Import mappings applied: ${Object.keys(importMappings).length}`);
}

// Run the update
updateAllImports();

