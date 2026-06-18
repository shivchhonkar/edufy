const STORAGE_PREFIX = 'edufy_read_transaction_ids'

function storageKey(userId: string | number): string {
  return `${STORAGE_PREFIX}_${userId}`
}

function readStorage(userId: string | number): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id)))
  } catch {
    return new Set()
  }
}

function writeStorage(userId: string | number, ids: Set<number>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey(userId), JSON.stringify(Array.from(ids)))
}

export function getReadTransactionIds(userId: string | number | null | undefined): Set<number> {
  if (userId == null || userId === '') return new Set()
  return readStorage(userId)
}

export function markTransactionRead(userId: string | number, transactionId: number): Set<number> {
  const ids = readStorage(userId)
  ids.add(transactionId)
  writeStorage(userId, ids)
  return ids
}

export function markAllTransactionsRead(
  userId: string | number,
  transactionIds: number[],
): Set<number> {
  const ids = readStorage(userId)
  for (const id of transactionIds) ids.add(id)
  writeStorage(userId, ids)
  return ids
}
