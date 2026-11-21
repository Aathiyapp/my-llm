export function whatsappShareUrl(url: string, message = "Take a look at this!") {
  return `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
}

export async function copyLink(url: string) {
  if (typeof navigator === "undefined") throw new Error("Clipboard is unavailable.");
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(url);
    return;
  }
  const field = document.createElement("textarea");
  field.value = url;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  field.style.pointerEvents = "none";
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, field.value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(field);
  if (!copied) throw new Error("Could not copy the link. Please copy it manually.");
}

export async function shareLink(url: string, title: string, text?: string) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ url, title, text });
      return "shared" as const;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled" as const;
      // Fall back to copy when native sharing is unavailable or fails.
    }
  }
  await copyLink(url);
  return "copied" as const;
}
