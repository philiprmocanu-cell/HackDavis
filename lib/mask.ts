// Phone masking helper. Shows last 4 digits, redacts the middle.
// e.g. "+919876543210" -> "+91 XXXXXX3210"
//      "+15555550100"  -> "+1 XXXXXX0100"
// If the input is too short to mask, returns it unchanged.

export function maskPhone(phone: string): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  // Find a leading "+<countryCode>" — assume 1-3 digit country code.
  const match = trimmed.match(/^(\+\d{1,3})(\d+)$/);
  if (!match) {
    // No leading +: just mask all but last 4.
    if (trimmed.length <= 4) return trimmed;
    const last4 = trimmed.slice(-4);
    const xCount = Math.max(trimmed.length - 4, 6);
    return `${"X".repeat(xCount)}${last4}`;
  }
  const [, cc, rest] = match;
  if (rest.length <= 4) return `${cc} ${rest}`;
  const last4 = rest.slice(-4);
  // Use a fixed 6 X's for visual consistency, regardless of true length.
  return `${cc} XXXXXX${last4}`;
}
