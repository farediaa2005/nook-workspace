/**
 * Extracts a human-readable message from an HttpErrorResponse (or anything thrown).
 * Backend errors use the ApiResponse envelope: { message, messageAr, messageEn, errors }.
 */
export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as any;
  const body = anyErr?.error;
  if (body && typeof body === 'object') {
    const msg = body.messageAr || body.message || body.messageEn || body.title;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    const errors = body.errors;
    if (Array.isArray(errors) && errors.length) return String(errors[0]);
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors).flat()[0];
      if (first) return String(first);
    }
  }
  if (typeof body === 'string' && body.trim() && body.length < 300) return body.trim();
  if (anyErr?.status === 0) return 'تعذّر الاتصال بالخادم';
  return fallback;
}
