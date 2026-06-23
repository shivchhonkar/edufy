export const STATUS_TO_REGISTER_CODE: Record<string, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  on_leave: 'LV',
  half_day: 'HD',
  holiday: 'H',
}

export const REGISTER_CODE_STYLES: Record<string, string> = {
  P: 'bg-green-100 text-green-800 font-semibold',
  A: 'bg-red-100 text-red-800 font-semibold',
  L: 'bg-yellow-100 text-yellow-800 font-semibold',
  LV: 'bg-blue-100 text-blue-800 font-semibold',
  H: 'bg-purple-100 text-purple-800 font-semibold',
  HD: 'bg-orange-100 text-orange-800 font-semibold',
  '-': 'bg-gray-50 text-gray-400',
}

export const REGISTER_LEGEND = [
  { code: 'P', label: 'Present', style: REGISTER_CODE_STYLES.P },
  { code: 'A', label: 'Absent', style: REGISTER_CODE_STYLES.A },
  { code: 'L', label: 'Late', style: REGISTER_CODE_STYLES.L },
  { code: 'LV', label: 'Leave', style: REGISTER_CODE_STYLES.LV },
  { code: 'H', label: 'Holiday', style: REGISTER_CODE_STYLES.H },
  { code: '-', label: 'Not Marked', style: REGISTER_CODE_STYLES['-'] },
] as const

export function statusToRegisterCode(status: string) {
  return STATUS_TO_REGISTER_CODE[status] ?? '-'
}

export const REGISTER_CODE_TO_STATUS: Record<string, string> = {
  P: 'present',
  A: 'absent',
  L: 'late',
  LV: 'on_leave',
  HD: 'half_day',
}

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'present', code: 'P', label: 'Present', style: REGISTER_CODE_STYLES.P },
  { value: 'absent', code: 'A', label: 'Absent', style: REGISTER_CODE_STYLES.A },
  { value: 'late', code: 'L', label: 'Late', style: REGISTER_CODE_STYLES.L },
  { value: 'on_leave', code: 'LV', label: 'Leave', style: REGISTER_CODE_STYLES.LV },
  { value: 'half_day', code: 'HD', label: 'Half Day', style: REGISTER_CODE_STYLES.HD },
] as const

export function registerCodeToStatus(code: string, fallback = 'present') {
  if (REGISTER_CODE_TO_STATUS[code]) return REGISTER_CODE_TO_STATUS[code]
  return fallback
}

export interface RegisterCellClick {
  personId: number
  personName: string
  day: number
  date: string
  code: string
}

export function getRegisterCellStyle(code: string) {
  return REGISTER_CODE_STYLES[code] ?? REGISTER_CODE_STYLES['-']
}

export function getMonthDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end, daysInMonth: lastDay }
}

export function getMonthLabel(month: number) {
  return new Date(2000, month - 1).toLocaleString('default', { month: 'long' })
}

export function getSundayDayNumbers(month: number, year: number, daysInMonth: number) {
  const sundays = new Set<number>()
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, month - 1, day).getDay() === 0) {
      sundays.add(day)
    }
  }
  return sundays
}

export function getHolidayDayNumbers(month: number, year: number, holidayDates: Set<string>) {
  const holidays = new Set<number>()
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  for (const date of holidayDates) {
    if (date.startsWith(prefix)) {
      const day = parseInt(date.slice(prefix.length), 10)
      if (!Number.isNaN(day)) holidays.add(day)
    }
  }
  return holidays
}

/** Dark grey column background for Sundays and school holidays in the register grid. */
export const REGISTER_NON_WORKING_COLUMN_CLASS = 'bg-gray-400'
export const REGISTER_NON_WORKING_HEADER_CLASS = 'bg-gray-500 text-white'

export interface RegisterPerson {
  id: number
  name: string
}

export interface DailyAttendanceRecord {
  personId: number
  date: string
  status: string
}

export interface RegisterRow {
  id: number
  name: string
  days: string[]
}

export function buildMonthlyRegisterRows(
  people: RegisterPerson[],
  records: DailyAttendanceRecord[],
  month: number,
  year: number,
  holidayDates: Set<string>,
): RegisterRow[] {
  const { daysInMonth } = getMonthDateRange(month, year)
  const byPerson = new Map<number, Map<number, string>>()

  for (const record of records) {
    const parsed = new Date(record.date)
    if (Number.isNaN(parsed.getTime())) continue
    if (parsed.getMonth() + 1 !== month || parsed.getFullYear() !== year) continue
    const day = parsed.getDate()
    const byDay = byPerson.get(record.personId) ?? new Map<number, string>()
    byDay.set(day, statusToRegisterCode(record.status))
    byPerson.set(record.personId, byDay)
  }

  return people.map((person) => {
    const byDay = byPerson.get(person.id)
    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const marked = byDay?.get(day)
      if (marked) return marked
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (holidayDates.has(dateStr)) return 'H'
      return '-'
    })
    return { id: person.id, name: person.name, days }
  })
}
