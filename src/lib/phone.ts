export function toBangladeshAuthPhone(value: string) {
  const digits = value.trim().replace(/[^\d০-৯]/g, "").replace(/[০-৯]/g, (digit) =>
    String("০১২৩৪৫৬৭৮৯".indexOf(digit)),
  );
  const localNumber = digits.startsWith("880") ? `0${digits.slice(3)}` : digits;
  if (!/^01[3-9]\d{8}$/.test(localNumber)) return null;
  return `+880${localNumber.slice(1)}`;
}

export function formatBangladeshPhone(value: string | null | undefined) {
  if (!value) return "—";
  const normalized = toBangladeshAuthPhone(value);
  if (!normalized) return value;
  return `0${normalized.slice(3)}`;
}
