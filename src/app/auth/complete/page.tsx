import Link from "next/link";
import { AuthShell } from "@/features/auth/auth-shell";

export default function CompleteLogin() {
  return <AuthShell mode="login">
    <p role="status">Login belum selesai. Jika akunmu sudah terautentikasi, coba siapkan akun Cashly kembali. Bila sesi berakhir, masuk lagi.</p>
    <form action="/auth/bootstrap" method="post"><button className="button button-primary" type="submit">Coba siapkan akun lagi</button></form>
    <p><Link href="/login">Kembali ke login</Link></p>
  </AuthShell>;
}
