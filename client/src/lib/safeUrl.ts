/** Dozwolone są tylko ścieżki lokalne ("/...") oraz adresy HTTPS. */
export function safeUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ((value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\")) ||
      value.startsWith("https://"))
  );
}
