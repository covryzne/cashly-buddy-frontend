import "server-only";

export function localEmailEnabled(): boolean {
  return process.env.CASHLY_ENV === "dev";
}
