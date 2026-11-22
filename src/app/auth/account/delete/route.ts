import { cookies } from "next/headers";
import { authConfig, sameOrigin } from "@/lib/auth/config";
import { verifiedSession } from "@/lib/auth/server";

const headers={"Cache-Control":"private, no-store"};
export async function POST(request:Request) {
  try {
    if(!sameOrigin(request)) return Response.json({error:"Permintaan tidak diizinkan."},{status:403,headers});
    const raw=await request.text();
    if(new TextEncoder().encode(raw).length>4096) return Response.json({error:"Permintaan terlalu besar."},{status:413,headers});
    let body:Record<string,unknown>;
    try {body=JSON.parse(raw);} catch {return Response.json({error:"Periksa konfirmasi penghapusan."},{status:422,headers});}
    if(!body || typeof body!=="object" || Array.isArray(body) || body.confirmation!=="HAPUS AKUN" || Object.keys(body).some(key=>!["confirmation","current_password"].includes(key)) || (body.current_password!==undefined && (typeof body.current_password!=="string" || body.current_password.length>128))) return Response.json({error:"Ketik HAPUS AKUN untuk melanjutkan."},{status:422,headers});
    const session=await verifiedSession(true);
    if(!session) return Response.json({error:"Silakan masuk kembali."},{status:401,headers});
    const response=await fetch(`${authConfig().api}/api/v1/me/account`,{method:"DELETE",headers:{Authorization:`Bearer ${session.token}`,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(45000)});
    const result=await response.json();
    if(!response.ok) return Response.json({error:result.error?.message ?? "Akun belum dapat dihapus."},{status:response.status,headers});
    if(result.data?.status!=="account_deleted") throw new Error("Invalid response");
    const jar=await cookies();
    for(const item of jar.getAll()) if(item.name.startsWith("sb-") || item.name.startsWith("cashly-password-") || item.name==="cashly-google-link") jar.set(item.name,"",{maxAge:0,path:"/",httpOnly:true,sameSite:"lax",secure:authConfig().site.startsWith("https:")});
    return Response.json({status:"account_deleted"},{headers});
  } catch {return Response.json({error:"Penghapusan belum dapat dipastikan. Coba masuk kembali untuk memeriksa akun."},{status:503,headers});}
}
