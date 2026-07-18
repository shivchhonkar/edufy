/** Strip values that break JSON.stringify (BigInt, Date, pg extras). */
export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') return Number(val);
      if (val instanceof Date) return val.toISOString();
      return val;
    }),
  ) as T;
}
