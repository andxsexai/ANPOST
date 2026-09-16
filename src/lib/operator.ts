export function operatorSecret() {
  return process.env.ANPOST_OPERATOR_SECRET || "";
}

export function isPublicDeploy() {
  return Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
}

export function authorizeOperator(request: Request) {
  const secret = operatorSecret();
  if (!secret) {
    if (isPublicDeploy()) {
      return { ok: false as const, status: 401, error: "Задай ANPOST_OPERATOR_SECRET на сервере" };
    }
    return { ok: true as const };
  }
  const header =
    request.headers.get("x-anpost-secret") ||
    request.headers.get("x-telegram-bot-api-secret-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (header !== secret) {
    return { ok: false as const, status: 401, error: "Нужен ключ оператора" };
  }
  return { ok: true as const };
}

export function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET || operatorSecret();
  if (!secret) {
    if (isPublicDeploy()) {
      return { ok: false as const, status: 401, error: "Задай CRON_SECRET на сервере" };
    }
    return { ok: true as const };
  }
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (header !== secret) {
    return { ok: false as const, status: 401, error: "Неверный cron secret" };
  }
  return { ok: true as const };
}

export function assertPublicHttpUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Нужна http(s) ссылка");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Только http и https");
  }
  const host = parsed.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === "metadata.google.internal";
  if (blocked) throw new Error("Внутренние адреса не забираем");
  return parsed;
}
