import type { RequestDb } from '@/lib/request-db';

interface StructureLine {
  component_id: number;
  component_type: string;
  amount: number | null;
  percentage_of_basic: number | null;
}

export async function calculateStaffSalary(
  db: RequestDb,
  staffId: number,
  month: number,
  year: number
): Promise<{ basic: number; allowances: number; deductions: number; net: number; lopDays: number; structureId: number | null }> {
  const staff = await db.query('SELECT salary, designation_id FROM staff WHERE id = $1', [staffId]);
  const baseSalary = parseFloat(String(staff.rows[0]?.salary || 0));

  const structure = await db.query(
    `SELECT ss.id FROM salary_structures ss
     WHERE (ss.staff_id = $1 OR (ss.staff_id IS NULL AND ss.designation_id = $2))
       AND ss.is_active = true AND ss.effective_from <= $3
       AND (ss.effective_to IS NULL OR ss.effective_to >= $3)
     ORDER BY ss.staff_id NULLS LAST, ss.effective_from DESC LIMIT 1`,
    [staffId, staff.rows[0]?.designation_id, `${year}-${String(month).padStart(2, '0')}-01`]
  );

  let basic = baseSalary;
  let allowances = baseSalary * 0.1;
  let deductions = baseSalary * 0.05;
  let structureId: number | null = null;

  if (structure.rows.length) {
    structureId = (structure.rows[0] as { id: number }).id;
    const lines = await db.query<StructureLine>(
      `SELECT ssl.amount, ssl.percentage_of_basic, sc.component_type, sc.name
       FROM salary_structure_lines ssl
       JOIN salary_components sc ON ssl.component_id = sc.id
       WHERE ssl.structure_id = $1 AND sc.is_active = true`,
      [structureId]
    );

    basic = 0;
    allowances = 0;
    deductions = 0;

    for (const line of lines.rows) {
      let amt = parseFloat(String(line.amount || 0));
      if (line.percentage_of_basic && basic > 0) {
        amt = basic * (parseFloat(String(line.percentage_of_basic)) / 100);
      }
      if (line.component_type === 'earning') {
        if ((line as StructureLine & { name: string }).name === 'Basic Salary') {
          basic += amt;
        } else {
          allowances += amt;
        }
      } else {
        deductions += amt;
      }
    }

    if (basic === 0) basic = baseSalary;
  }

  const lopResult = await db.query(
    `SELECT COUNT(*)::int AS lop_days FROM staff_attendance
     WHERE staff_id = $1 AND EXTRACT(MONTH FROM attendance_date) = $2
       AND EXTRACT(YEAR FROM attendance_date) = $3 AND status = 'absent'`,
    [staffId, month, year]
  );
  const lopDays = lopResult.rows[0]?.lop_days || 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const lopDeduction = lopDays > 0 ? ((basic + allowances) / daysInMonth) * lopDays : 0;
  deductions += lopDeduction;

  const net = basic + allowances - deductions;
  return { basic, allowances, deductions, net, lopDays, structureId };
}
