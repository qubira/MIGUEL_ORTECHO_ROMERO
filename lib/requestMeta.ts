type HeaderSource = Headers | Record<string, any> | undefined | null;

function readHeader(headers: HeaderSource, key: string): string | undefined {
  if (!headers) return undefined;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(key) || undefined;
  }
  const value = (headers as Record<string, any>)[key];
  return Array.isArray(value) ? value[0] : value || undefined;
}

// x-forwarded-for puede traer varias IPs separadas por coma (cliente, proxies
// intermedios); la primera es la del cliente original.
export function getClientIp(headers: HeaderSource): string {
  const forwarded = readHeader(headers, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = readHeader(headers, "x-real-ip");
  if (real) return real.trim();
  return "desconocida";
}

export function getUserAgent(headers: HeaderSource): string | undefined {
  return readHeader(headers, "user-agent");
}
