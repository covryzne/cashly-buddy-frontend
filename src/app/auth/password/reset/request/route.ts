import { passwordResetAction } from "@/lib/auth/password-reset";
export async function POST(request: Request) { return passwordResetAction(request, false); }
