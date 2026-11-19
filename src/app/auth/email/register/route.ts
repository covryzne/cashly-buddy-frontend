import { emailAction } from "@/lib/auth/email-action";
export async function POST(request: Request) { return emailAction(request, "register"); }
