export async function disconnectCdpBrowser(browser) {
  if (!browser) {
    return;
  }

  // For connectOverCDP sessions we want to drop the local websocket without
  // sending Browser.close to the repo-owned Chrome instance.
  if (typeof browser._connection?.close === 'function') {
    browser._connection.close();
    return;
  }

  if (typeof browser.close === 'function') {
    await browser.close();
  }
}
