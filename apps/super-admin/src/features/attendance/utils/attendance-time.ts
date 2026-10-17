export const DEFAULT_ATTENDANCE_WINDOW = {
  workStart: '09:00',
  workEnd: '17:00',
  lateToleranceMinutes: 15,
  halfDayHours: 4,
}

export type TimedAttendanceStatus = 'present' | 'late' | 'half_day' | 'on_leave'

export interface AttendanceWindow {
  workStart: string
  workEnd: string
  lateToleranceMinutes: number
  halfDayHours: number
}

export function clockInputValue(value?: string | null): string {
  if (!value) return ''
  const match = String(value).match(/(\d{1,2}):(\d{2})/)
  if (!match) return ''
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

export function minutesFromClock(value?: string | null): number | null {
  const clock = clockInputValue(value)
  if (!clock) return null
  const [hours, minutes] = clock.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function formatClockLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function deriveAttendanceFromTimes(input: {
  checkIn?: string | null
  checkOut?: string | null
  workStart?: string | null
  workEnd?: string | null
  lateToleranceMinutes?: number
  halfDayHours?: number
}): { status: TimedAttendanceStatus; reason: string } | null {
  const start = minutesFromClock(input.workStart) ?? minutesFromClock(DEFAULT_ATTENDANCE_WINDOW.workStart)!
  const end = minutesFromClock(input.workEnd) ?? minutesFromClock(DEFAULT_ATTENDANCE_WINDOW.workEnd)!
  const tolerance = input.lateToleranceMinutes ?? DEFAULT_ATTENDANCE_WINDOW.lateToleranceMinutes
  const halfDayHours = input.halfDayHours ?? DEFAULT_ATTENDANCE_WINDOW.halfDayHours
  const checkIn = minutesFromClock(input.checkIn)
  const checkOut = minutesFromClock(input.checkOut)

  if (checkIn == null && checkOut == null) return null

  const lateAfter = start + tolerance
  const windowLabel = `${formatClockLabel(start)}–${formatClockLabel(end)}`
  const lateLabel = formatClockLabel(lateAfter)

  if ((checkIn != null && checkIn >= end) || (checkOut != null && checkOut <= start && checkIn == null)) {
    return {
      status: 'on_leave',
      reason: `Times fall outside ${windowLabel}, so this day is leave.`,
    }
  }

  let workedMinutes: number | null = null
  if (checkIn != null && checkOut != null && checkOut > checkIn) {
    workedMinutes = checkOut - checkIn
  }

  const halfDayLimit = halfDayHours * 60
  if (workedMinutes != null && workedMinutes <= halfDayLimit) {
    return {
      status: 'half_day',
      reason: `Worked ${formatDuration(workedMinutes)}, which is within the ${halfDayHours} hour half-day limit.`,
    }
  }

  if (checkIn != null && checkIn > lateAfter) {
    return {
      status: 'late',
      reason: `Arrived after ${lateLabel}, so this day is late.`,
    }
  }

  if (checkOut != null && checkIn == null && checkOut < start + halfDayLimit) {
    return {
      status: 'half_day',
      reason: `Left before completing ${halfDayHours} hours, so this day is half day.`,
    }
  }

  return {
    status: 'present',
    reason: `Within ${windowLabel}, so this day is present.`,
  }
}
