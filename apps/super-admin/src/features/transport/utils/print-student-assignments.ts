export function printStudentTransportAssignments(assignments: any[]): boolean {
  if (assignments.length === 0) return false;

  const groupedByRoute: Record<string, any[]> = {};
  assignments.forEach((assignment) => {
    const routeKey = String(assignment.route_id);
    if (!groupedByRoute[routeKey]) groupedByRoute[routeKey] = [];
    groupedByRoute[routeKey].push(assignment);
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student Transport Assignments - Route Wise</title>
      <style>
        @media print { @page { margin: 2mm; } body { margin: 0; } .page-break { page-break-before: always; } }
        body { font-family: Arial, sans-serif; padding: 4px; color: #000; }
        .header { text-align: center; margin-bottom: 6px; border-bottom: 3px solid #333; padding-bottom: 3px; }
        .header h1 { margin: 0; font-size: 24px; color: #333; }
        .header p { margin: 1px 0; color: #666; font-size: 14px; }
        .route-section { margin-bottom: 8px; page-break-inside: avoid; }
        .route-header { background: #f3f4f6; padding: 2px; border-left: 4px solid #2563eb; margin-bottom: 3px; }
        .route-header h2 { margin: 0; font-size: 18px; color: #1f2937; }
        .route-header p { margin: 1px 0 0 0; font-size: 12px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        th { background: #e5e7eb; padding: 2px; text-align: left; font-size: 12px; font-weight: bold; border: 1px solid #d1d5db; text-transform: uppercase; }
        td { padding: 2px; border: 1px solid #d1d5db; font-size: 12px; }
        tr:nth-child(even) { background: #f9fafb; }
        .footer { margin-top: 6px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 3px; }
        .summary { background: #fef3c7; padding: 2px; border-left: 4px solid #f59e0b; margin-bottom: 4px; }
        .summary p { margin: 2px 0; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Student Transport Assignments - Route Wise</h1>
        <p>Shribi Edufy School Management System</p>
        <p>Generated on: ${currentDate}</p>
      </div>
      <div class="summary">
        <p><strong>Total Students:</strong> ${assignments.length}</p>
        <p><strong>Total Routes:</strong> ${Object.keys(groupedByRoute).length}</p>
      </div>
  `;

  Object.keys(groupedByRoute).forEach((routeKey, index) => {
    const routeAssignments = groupedByRoute[routeKey];
    const firstAssignment = routeAssignments[0];
    if (index > 0) printContent += '<div class="page-break"></div>';

    printContent += `
      <div class="route-section">
        <div class="route-header">
          <h2>${firstAssignment.route_name}</h2>
          <p>Route Number: ${firstAssignment.route_number || 'N/A'} | Total Students: ${routeAssignments.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 8%">S.No.</th>
              <th style="width: 20%">Student Name</th>
              <th style="width: 15%">Admission No.</th>
              <th style="width: 12%">Class</th>
              <th style="width: 20%">Pickup Point</th>
              <th style="width: 10%">Pickup Time</th>
              <th style="width: 15%">Contact Number</th>
            </tr>
          </thead>
          <tbody>
    `;

    routeAssignments.forEach((assignment, idx) => {
      const time = assignment.arrival_time
        ? assignment.arrival_time.length > 5
          ? assignment.arrival_time.substring(0, 5)
          : assignment.arrival_time
        : 'N/A';
      printContent += `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${assignment.first_name} ${assignment.last_name}</strong></td>
          <td>${assignment.admission_number}</td>
          <td>${assignment.class_name || 'N/A'}${assignment.section_name ? ` - ${assignment.section_name}` : ''}</td>
          <td>${assignment.stop_name || 'Not specified'}</td>
          <td>${time}</td>
          <td>${assignment.parent_phone || 'N/A'}</td>
        </tr>
      `;
    });

    printContent += '</tbody></table></div>';
  });

  printContent += `
      <div class="footer">
        <p>This document is computer generated and does not require a signature.</p>
        <p>Printed on ${currentDate}</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
  return true;
}
