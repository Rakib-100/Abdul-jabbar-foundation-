const bengaliDigits = "০১২৩৪৫৬৭৮৯";

export function toMemberLoginId(value: string) {
  const normalized = value
    .replace(/[০-৯]/g, (digit) => String(bengaliDigits.indexOf(digit)))
    .replace(/[\s()-]/g, "");
  return /^\d{11}$/.test(normalized) ? normalized : null;
}

export function toMemberAuthEmail(value: string) {
  const loginId = toMemberLoginId(value);
  return loginId ? `member-${loginId}@login.abduljabbarfoundation.invalid` : null;
}

export function formatMemberLoginId(value: string | null | undefined) {
  if (!value) return "—";
  return toMemberLoginId(value) ?? value;
}
