/**
 * Sanitizes text content to prevent XML tag injection breaks in system/user prompts.
 */
export function sanitizeXmlData(content: string): string {
  if (!content) return '';
  return content
    .replace(/<\/user_prompt>/gi, '&lt;/user_prompt&gt;')
    .replace(/<\/memory_context>/gi, '&lt;/memory_context&gt;')
    .replace(/<\/agent_[a-c]_response>/gi, '&lt;/agent_response&gt;')
    .replace(/<\/cross_review>/gi, '&lt;/cross_review&gt;');
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
