/**
 * Sanitizes text content to prevent XML/HTML tag injection breaks in system/user prompts.
 * Escapes tag-like constructs so malicious inputs cannot fake prompt boundary tags.
 */
export function sanitizeXmlData(content: string): string {
  if (!content) return '';
  // Replace tag-like patterns matching any <...>-style text with escaped equivalents
  return content.replace(/<\/?\s*[a-zA-Z_][a-zA-Z0-9_\-\s]*\/?>/gi, (match) => {
    return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });
}

/**
 * Sanitizes identifiers like agent names or model names to prevent prompt injection or formatting corruption.
 */
export function sanitizeIdentifier(identifier: string, maxLength: number = 100): string {
  if (!identifier) return '';
  const sanitized = identifier.replace(/[<>\r\n]/g, '').trim();
  return sanitized.slice(0, maxLength);
}

/**
 * Formats error objects safely without leaking raw internal traces or sensitive API keys to end user.
 */
export function sanitizeErrorMessage(reason: unknown): string {
  if (typeof reason === 'string') {
    return reason.replace(/sk-[a-zA-Z0-9_-]+/g, '[MASKED_KEY]');
  }
  if (reason instanceof Error) {
    const msg = reason.message || 'Bilinmeyen hata';
    return msg.replace(/sk-[a-zA-Z0-9_-]+/g, '[MASKED_KEY]');
  }
  return 'İşlem sırasında beklenmeyen bir hata oluştu';
}
