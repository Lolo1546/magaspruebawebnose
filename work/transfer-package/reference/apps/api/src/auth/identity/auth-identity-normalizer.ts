export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeAuthUsername(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[._-]+/g, '_');
}
