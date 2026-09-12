/**
 * Ids for records created on the phone. `Date.now()` alone collides if both
 * phones create a record in the same millisecond, which would silently merge
 * two different pins into one when the backups are combined. The random
 * suffix makes that effectively impossible without needing a device registry.
 */
export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}
