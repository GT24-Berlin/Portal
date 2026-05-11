export function isDatabaseUnavailableError(error: unknown) {
  const anyError = error as any;
  const code = String(anyError?.code ?? '');
  const message = String(anyError?.message ?? error ?? '');

  return (
    code === 'P1001' ||
    message.includes('DatabaseNotReachable') ||
    message.includes("Can't reach database server") ||
    message.includes('Error opening a TLS connection') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND')
  );
}
