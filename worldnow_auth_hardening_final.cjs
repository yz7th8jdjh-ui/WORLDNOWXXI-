const {execSync}=require("child_process");
const fs=require("fs");
const path=require("path");

console.log("\n>>> WORLDNOWXXI AUTH HARDENING — CLEAN FINAL");

// IMPORTANT: rebuild from the last clean master + security shield.
// Do NOT execute the old auth_hardening/fix/fix2/fix3 chain.
execSync('node "worldnow_security_shield.cjs"',{stdio:"inherit"});

function write(rel, data){
  const out=path.join(process.cwd(),rel);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,data);
}

/* Make the two Security Shield pages self-contained.
   This removes the bad Shell import introduced by the shield file. */
write("app/seguridad-sistema/page.js", `"use client";
import {useEffect,useState} from "react";

export default function SecuritySystem(){
 const [data,setData]=useState(null);
 useEffect(()=>{fetch("/api/security/health",{cache:"no-store"})
   .then(r=>r.json()).then(setData).catch(()=>setData({}))},[]);
 const rows=data?[
  ["Cabeceras de seguridad",data.security?.headers],
  ["Protección de origen API",data.security?.same_origin_api_guard],
  ["TRACE/TRACK bloqueados",data.security?.unsafe_http_methods_blocked],
  ["Límite básico de tamaño API",data.security?.api_size_guard],
  ["Neon Auth configurado",data.external_protection?.neon_auth],
  ["Cloudflare Turnstile",data.external_protection?.turnstile]
 ]:[];
 return <main style={{maxWidth:900,margin:"0 auto",padding:"24px 16px 110px"}}>
  <div className="section-title"><div><span className="kicker">WORLDNOWXXI SECURITY SHIELD</span>
  <h1>Estado de seguridad</h1><p>Defensas técnicas activas y servicios pendientes.</p></div></div>
  <section className="security-shield-grid">
   {!data&&<div className="panel">Comprobando protección…</div>}
   {rows.map(([name,ok])=><div className="panel security-shield-row" key={name}>
     <span>{name}</span><b className={ok?"shield-ok":"shield-pending"}>{ok?"ACTIVO":"PENDIENTE"}</b>
   </div>)}
  </section>
 </main>
}
`);

/* Server-side session status. No browser-stored numeric user id is accepted here. */
write("app/api/auth/secure-session/route.js", `export const dynamic="force-dynamic";

export async function GET(req){
 const authUrl=(process.env.NEON_AUTH_URL||process.env.NEXT_PUBLIC_NEON_AUTH_URL||"").replace(/\\/$/,"");
 if(!authUrl) return Response.json({authenticated:false,configured:false},{headers:{"cache-control":"no-store"}});
 const cookie=req.headers.get("cookie")||"";
 try{
  for(const suffix of ["/get-session","/api/auth/get-session"]){
   const r=await fetch(authUrl+suffix,{headers:{cookie},cache:"no-store"});
   if(!r.ok) continue;
   const data=await r.json().catch(()=>null);
   const user=data?.user||data?.session?.user||null;
   const session=data?.session||null;
   if(user||session){
    return Response.json({
      authenticated:true,
      configured:true,
      user:user?{id:user.id||null,email:user.email||null}:null
    },{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
   }
  }
  return Response.json({authenticated:false,configured:true},{headers:{"cache-control":"no-store"}});
 }catch{
  return Response.json({authenticated:false,configured:true,error:"auth_unreachable"},
   {headers:{"cache-control":"no-store"}});
 }
}
`);

write("app/seguridad-identidad/page.js", `"use client";
import {useEffect,useState} from "react";

export default function IdentitySecurity(){
 const [s,setS]=useState(null);
 useEffect(()=>{fetch("/api/auth/secure-session",{credentials:"include",cache:"no-store"})
   .then(r=>r.json()).then(setS).catch(()=>setS({authenticated:false}))},[]);
 return <main style={{maxWidth:900,margin:"0 auto",padding:"24px 16px 110px"}}>
  <div className="section-title"><div><span className="kicker">SECURITY SHIELD · IDENTITY</span>
  <h1>Identidad segura</h1><p>La sesión se valida contra Neon Auth desde servidor.</p></div></div>
  <section className="panel">
   <div className={"auth-status "+(s?.authenticated?"ok":"pending")}>
    {s?.authenticated?"● Sesión Neon Auth reconocida":"● Sesión pendiente de validación"}
   </div>
   <h2>{s?.authenticated?"Autenticación reconocida":"Neon Auth debe estar conectado"}</h2>
   <p>Las operaciones de datos siguen protegidas por las políticas RLS de Neon.</p>
  </section>
 </main>
}
`);

/* Critical integrity check:
   the previous broken patch accidentally truncated /perfil/bloqueados.
   Verify the clean master restored a real default page component. */
const blocked=path.join(process.cwd(),"app/perfil/bloqueados/page.js");
if(!fs.existsSync(blocked)){
  console.error("FINAL HARDENING FAILED: app/perfil/bloqueados/page.js missing");
  process.exit(51);
}
const blockedSrc=fs.readFileSync(blocked,"utf8");
if(!/export\s+default\s+function\s+BlockedUsers/.test(blockedSrc) || blockedSrc.length<1000){
  console.error("FINAL HARDENING FAILED: blocked-users page was truncated");
  process.exit(52);
}

/* Guard against reintroducing the exact broken client metadata condition. */
for(const rel of ["app/perfil/bloqueados/page.js","app/seguridad-sistema/page.js","app/seguridad-identidad/page.js"]){
 const src=fs.readFileSync(path.join(process.cwd(),rel),"utf8");
 if(/["']use client["'];?/.test(src) &&
    /export\s+(const\s+(metadata|viewport)|function\s+(generateMetadata|generateViewport))/.test(src)){
   console.error("FINAL HARDENING FAILED: client metadata export in "+rel);
   process.exit(53);
 }
}

console.log("WORLDNOWXXI CLEAN SECURITY BUILD restored");
console.log("WORLDNOWXXI BLOCKED USERS PAGE integrity verified");
console.log("WORLDNOWXXI SERVER SESSION CHECK applied");
console.log("WORLDNOWXXI AUTH HARDENING CLEAN FINAL applied successfully");
