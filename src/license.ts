export const PRODUCT_SLUG = 'meal-list-boundaries';
export const PRICE = '$12';
export const BILLING_BASE = import.meta.env.VITE_BILLING_BASE ?? 'https://api.sociobot.in';
export const BUY_URL = `${BILLING_BASE}/api/v1/products/${PRODUCT_SLUG}/checkout`;

const LICENSE_KEY = `sb_license:${PRODUCT_SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${PRODUCT_SLUG}`;
const DAY = 86_400_000;

type Verdict = { valid: boolean; checkedAt: number; reason?: string };

export function captureLicenseFromUrl(): string | null {
  const url = new URL(location.href);
  const incoming = url.searchParams.get('license');
  if (!incoming) return localStorage.getItem(LICENSE_KEY);
  localStorage.setItem(LICENSE_KEY, incoming.trim());
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return incoming.trim();
}

export function saveLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function cachedLicenseValid(): boolean {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token) return false;
  try {
    const verdict = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '') as Verdict;
    return verdict.valid;
  } catch {
    return false;
  }
}

export async function verifyLicense(force = false): Promise<{ valid: boolean; reason?: string; offline?: boolean }> {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token) return { valid: false, reason: 'missing' };
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '') as Verdict;
    if (!force && Date.now() - cached.checkedAt < DAY) return cached;
  } catch { /* Verify below. */ }
  try {
    const url = `${BILLING_BASE}/api/v1/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Verification service unavailable');
    const result = await response.json() as { valid: boolean; reason?: string };
    const verdict: Verdict = { valid: Boolean(result.valid), reason: result.reason, checkedAt: Date.now() };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return verdict;
  } catch {
    return { valid: cachedLicenseValid(), offline: true };
  }
}
