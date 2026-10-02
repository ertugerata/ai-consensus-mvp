/**
 * Sanitizes text content to prevent XML/HTML tag injection breaks in system/user prompts.
 * Strips zero-width characters, normalizes full-width angle brackets, and escapes all < and >.
 */
export function sanitizeXmlData(content: string): string {
  if (!content) return '';

  return content
    // Remove zero-width characters used to bypass filters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize unicode full-width angle brackets (＜ and ＞) to standard < and >
    .replace(/＜/g, '<')
    .replace(/＞/g, '>')
    // Escape all angle brackets to prevent XML/HTML delimiter injections
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitizes identifiers like agent names or model names to prevent prompt injection or formatting corruption.
 */
export function sanitizeIdentifier(identifier: string, maxLength: number = 100): string {
  if (!identifier) return '';
  const sanitized = identifier
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/＜/g, '')
    .replace(/＞/g, '')
    .replace(/[<>\r\n]/g, '')
    .trim();
  return sanitized.slice(0, maxLength);
}

/**
 * Formats error objects safely without leaking raw internal traces or sensitive API keys / internal hosts to end user.
 */
export function sanitizeErrorMessage(reason: unknown): string {
  let rawMsg = 'İşlem sırasında beklenmeyen bir hata oluştu';
  if (typeof reason === 'string') {
    rawMsg = reason;
  } else if (reason instanceof Error) {
    rawMsg = reason.message || rawMsg;
  }

  return rawMsg
    // Mask OpenAI & OpenRouter API keys
    .replace(/sk-[a-zA-Z0-9_-]+/g, '[MASKED_KEY]')
    // Mask Anthropic API keys
    .replace(/sk-ant-[a-zA-Z0-9_-]+/g, '[MASKED_KEY]')
    // Mask Google Gemini API keys
    .replace(/AIza[a-zA-Z0-9_-]+/g, '[MASKED_KEY]')
    // Mask internal docker/localhost addresses with ports
    .replace(/host\.docker\.internal(:\d+)?/gi, '[INTERNAL_HOST]')
    .replace(/127\.0\.0\.1(:\d+)?/gi, '[INTERNAL_HOST]')
    .replace(/localhost(:\d+)?/gi, '[INTERNAL_HOST]');
}
