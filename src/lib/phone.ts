export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length <= 10) {
    return digitsOnly;
  }
  // Use last 10 digits to handle numbers stored with country/STD codes
  return digitsOnly.slice(-10);
}

export function buildPhoneWhereFilters(rawPhone: string) {
  const normalized = normalizePhone(rawPhone);
  const filters: Array<Record<string, any>> = [];

  if (rawPhone) {
    filters.push({ phone: rawPhone });
  }

  if (normalized) {
    filters.push({ phone: normalized });
    filters.push({ phone: { endsWith: normalized } });
    filters.push({ phone: { contains: normalized } });
    filters.push({ phone: `+91${normalized}` });
    filters.push({ phone: `91${normalized}` });
    filters.push({ phone: `0${normalized}` });
  }

  return filters;
}

