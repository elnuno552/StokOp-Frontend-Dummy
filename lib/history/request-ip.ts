import { headers } from "next/headers";
import { getClientIp } from "./log";

/** Client IP of the current request, or null outside a request scope. */
export async function currentRequestIp(): Promise<string | null> {
  try {
    return getClientIp(await headers());
  } catch {
    return null;
  }
}
