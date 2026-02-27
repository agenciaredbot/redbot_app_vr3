/**
 * Generate a short, unique, URL-safe referral code.
 * Uses unambiguous characters (no 0/O, 1/I/L).
 */
export function generateReferralCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
