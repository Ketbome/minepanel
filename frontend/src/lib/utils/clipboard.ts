// navigator.clipboard only exists on HTTPS or localhost, and most panels are opened over plain
// HTTP on a LAN address, so fall back to the legacy copy command there.
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Safari rejects the write when a request was awaited between the click and the copy.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  // Inside a modal the focus trap pulls focus back from anything outside it.
  const host = document.activeElement?.closest('[role="dialog"]') ?? document.body;
  host.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
