/**
 * webBrowser — centralized wrapper around expo-web-browser for opening
 * external cooperative links in the in-app browser, styled with the brand
 * toolbar color.
 */
import * as WebBrowser from 'expo-web-browser';

export const BRAND_TOOLBAR_COLOR = '#002b49';

/** Open an external URL in the in-app browser with brand chrome. */
export async function openExternalLink(url) {
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: BRAND_TOOLBAR_COLOR,
      controlsColor: BRAND_TOOLBAR_COLOR,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
    });
  } catch (e) {
    console.warn('[webBrowser] could not open link:', e?.message);
  }
}