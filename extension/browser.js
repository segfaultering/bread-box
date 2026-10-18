// Identify the browser hosting the extension, never another installed browser.
export async function currentBrowser(environment = navigator) {
  const agent = environment.userAgent || '';
  const brands = (environment.userAgentData?.brands || []).map(item => item.brand);
  if (/\b(?:OPR|Vivaldi|SamsungBrowser)\//.test(agent)) throw new Error('Automatic companion setup currently supports Chrome, Chromium, Brave and Edge.');
  if (brands.includes('Microsoft Edge') || /\bEdg\//.test(agent)) return 'edge';
  if (brands.includes('Brave') || await environment.brave?.isBrave?.()) return 'brave';
  if (brands.includes('Google Chrome')) return 'chrome';
  if (brands.includes('Chromium') || /\bChromium\//.test(agent)) return 'chromium';
  if (/\bChrome\//.test(agent)) return 'chrome';
  throw new Error('Could not identify this browser for companion setup. Chrome, Chromium, Brave and Edge are supported.');
}
