import { capturePasswordLink } from "@/lib/auth/password-reset";
export async function GET(request: Request) { return capturePasswordLink(request); }
