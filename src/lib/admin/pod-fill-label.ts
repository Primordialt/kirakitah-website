/** Pod fill status label for qualification admin UI (server-safe). */
export function podFillLabel(memberCount: number, capacity: number): string {
  if (memberCount <= 0) return "EMPTY";
  if (memberCount >= capacity) return "FULL";
  return "PARTIAL";
}
