const {execSync} = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("\n>>> WORLDNOWXXI IDENTITY CORE — SERVER SESSION FIRST");

// Start from the current clean/security-green chain.
execSync('node "worldnow_security_fix_dynamic.cjs"', {stdio:"inherit"});

function write(file, content){
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, content);
  console.log("written:", file);
}

// One canonical client helper: browser never chooses its own numeric user id.
// It asks the server for the authenticated Neon Auth user, then maps auth_user_id -> users.id.
write("lib/current-user-client.js", `"use client";
import { getNeonClient } from "./neon-client";

export async function getCurrentUserProfile(){
  const r=await fetch("/api/auth/secure-session",{
    credentials:"include",
    cache:"no-store",
    headers:{"accept":"application/json"}
  });
  if(!r.ok) return null;
  const s=await r.json().catch(()=>null);
  const authId=s?.authenticated?s?.user?.id:null;
  if(!authId) return null;

  const db=getNeonClient();
  const q=await db.from("users")
    .select("id,username,display_name,bio,country,city,role,auth_user_id")
    .eq("auth_user_id",authId)
    .limit(1);

  if(q?.error) throw q.error;
  return q?.data?.[0]||null;
}

export async function getCurrentUserId(){
  const p=await getCurrentUserProfile();
  return p?.id?String(p.id):"";
}
`);

// A server-only identity endpoint for future sensitive API mutations.
// It never accepts user_id from query/body/localStorage.
write("app/api/auth/me/route.js", `export const dynamic="force-dynamic";

export async function GET(req){
  const origin=new URL(req.url).origin;
  const r=await fetch(origin+"/api/auth/secure-session",{
    headers:{cookie:req.headers.get("cookie")||""},
    cache:"no-store"
  });
  const s=await r.json().catch(()=>null);
  if(!s?.authenticated||!s?.user?.id){
    return Response.json({authenticated:false,user:null},{
      status:401,
      headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}
    });
  }
  return Response.json({
    authenticated:true,
    user:{auth_user_id:s.user.id,email:s.user.email||null}
  },{
    headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}
  });
}
`);

// Disable the obsolete demo identity path in AuthBox.
// This does NOT touch preferences/localStorage unrelated to authentication.
const authBox="components/AuthBox.js";
if(fs.existsSync(authBox)){
  let s=fs.readFileSync(authBox,"utf8");
  if(s.includes("localStorage.setItem('wn_demo_user'")){
    s=s.replace(
      /if\(!url\|\|!key\)\{localStorage\.setItem\('wn_demo_user'[\s\S]*?return;\}/,
      `if(!url||!key){setMsg("Autenticación no configurada.");return;}`
    );
    fs.writeFileSync(authBox,s);
    console.log("removed obsolete demo identity storage from AuthBox");
  }
}

// Gate: the 10 sensitive application pages identified by the audit must still exist.
// We deliberately do NOT regex-rewrite their component bodies in this block.
const sensitive=[
  "app/crear/page.js",
  "app/guardados/page.js",
  "app/mensajes/page.js",
  "app/notificaciones/page.js",
  "app/page.js",
  "app/perfil/bloqueados/page.js",
  "app/perfil/page.js",
  "app/post/[id]/page.js",
  "app/seguridad/usuario/[id]/page.js",
  "app/usuario/[id]/page.js"
];
for(const f of sensitive){
  if(!fs.existsSync(f)){
    console.error("IDENTITY GATE FAILED: missing",f);
    process.exit(101);
  }
}

console.log("\n>>> Identity core verification");
console.log("Server session endpoint: present");
console.log("Canonical current-user helper: present");
console.log("Sensitive pages preserved:", sensitive.length);
console.log("Obsolete AuthBox demo identity storage: disabled when present");

console.log("\n>>> npm audit");
let raw="";
try{
  raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
}catch(e){raw=(e.stdout||"").toString();}
const report=JSON.parse(raw||"{}");
const v=report.metadata?.vulnerabilities||{};
console.log(`Total: ${v.total||0}`);
if((v.total||0)!==0){
  console.error("SECURITY GATE FAILED: dependency vulnerabilities detected");
  process.exit(102);
}

console.log("\n>>> Production build");
execSync("npm run build",{stdio:"inherit"});

console.log("\nWORLDNOWXXI IDENTITY CORE applied successfully");
console.log("SECURITY GATE: 0 dependency vulnerabilities");
console.log("BUILD GATE: production build passed");
console.log("NEXT: migrate the 10 audited pages to getCurrentUserId() with exact per-file edits.");
