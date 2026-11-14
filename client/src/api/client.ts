let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T = { ok: boolean }>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(method === "GET" ? {} : { "X-CSRF-Token": csrf }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res
    .json()
    .catch(() => ({ error: "Serwer jest niedostępny. Spróbuj ponownie." }));
  if (!res.ok)
    throw Error(data.error || "Coś poszło nie tak. Spróbuj ponownie.");
  return data;
}
