import { verificationAction } from "@/lib/auth/verification-action";
export const POST = (request: Request) => verificationAction(request, "verify");
