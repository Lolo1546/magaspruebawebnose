export function getLocalTodayBounds(now = new Date()): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function getLocalWeekBounds(now = new Date()): { from: string; to: string } {
  // Monday 00:00 to next Monday 00:00
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = from.getDay();
  const diff = from.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  from.setDate(diff);

  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function getLocalMonthBounds(now = new Date()): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}
