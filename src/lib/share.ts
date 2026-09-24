export type ShareResult = "shared" | "copied" | "cancelled" | "error"

export async function shareText(text: string, title = "Task habits"): Promise<ShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text })
      return "shared"
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled"
    }
  }
  try {
    await copyToClipboard(text)
    return "copied"
  } catch {
    return "error"
  }
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  try {
    textarea.select()
    document.execCommand("copy")
  } finally {
    textarea.remove()
  }
}