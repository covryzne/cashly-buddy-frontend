import { backend, supabaseServer } from "@/lib/auth/server";

const headers={"Cache-Control":"private, no-store"};
export async function GET() {
  try {
    const supabase=await supabaseServer(true);
    const {data:{user},error}=await supabase.auth.getUser();
    if(error) return Response.json({authenticated:false},{status:[400,401,403,404].includes(error.status ?? 0) ? 401 : 503,headers});
    if(!user) return Response.json({authenticated:false},{status:401,headers});
    const {data:{session}}=await supabase.auth.getSession();
    if(!session) return Response.json({authenticated:false},{status:401,headers});
    const response=await backend("/me",session.access_token);
    if(!response.ok) return Response.json({authenticated:false},
      {status:[401,403,409].includes(response.status) ? response.status : 503,headers});
    const result=await response.json();
    return Response.json({authenticated:true,account_id:result.data.account_id},{headers});
  } catch {
    return Response.json({authenticated:false},{status:503,headers});
  }
}
