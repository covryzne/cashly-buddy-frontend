/** Format only; this does not verify that a number belongs to a WhatsApp account. */
export function whatsappNumber(value: string | undefined) {
  const raw = value?.trim() ?? "";
  if (!/^\+?[\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/[\s().-]/g, "").replace(/^\+/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Cashly's local phone format is Indonesian. Other countries use their code.
  if (digits.startsWith("08")) digits = `62${digits.slice(1)}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
