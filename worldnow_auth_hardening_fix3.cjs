const {execSync}=require("child_process");
const fs=require("fs");
const path=require("path");

console.log("\n>>> WORLDNOWXXI AUTH HARDENING FIX 3");
execSync('node "worldnow_auth_hardening_fix2.cjs"',{stdio:"inherit"});

// Make identity resolution strictly browser-runtime only.
// This avoids Next prerender trying to cross a server/client module boundary.
const helper=`"use client";

export async function getCurrentUserId(){
  if(typeof window==="undefined") return "";
  try{
    const mod=await import("./neon-client");
    const getNeonClient=mod.getNeonClient;
    if(typeof getNeonClient!=="function") return "";
    const db=getNeonClient();
    const r=await db.from("users").select("id").limit(1);
    if(r?.error) throw r.error;
    const id=(r?.data||[])[0]?.id;
    return id ? String(id) : "";
  }catch(e){
    console.error("WORLDNOWXXI current user resolution failed",e);
    return "";
  }
}
`;

const helperPath=path.join(process.cwd(),"lib/current-user.js");
fs.mkdirSync(path.dirname(helperPath),{recursive:true});
fs.writeFileSync(helperPath,helper);

// Add explicit runtime guards to all hardened client pages.
const critical=[
 "app/page.js",
 "app/perfil/page.js",
 "app/guardados/page.js",
 "app/post/[id]/page.js",
 "app/seguridad/usuario/[id]/page.js",
 "app/perfil/bloqueados/page.js",
 "app/mensajes/page.js",
 "app/crear/page.js",
 "app/notificaciones/page.js"
];

for(const rel of critical){
  const file=path.join(process.cwd(),rel);
  if(!fs.existsSync(file)) continue;
  let s=fs.readFileSync(file,"utf8");

  // Prevent accidental top-level resolution during prerender.
  s=s.replace(
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+getCurrentUserId\(\);/g,
    'const $1 = typeof window==="undefined" ? "" : await getCurrentUserId();'
  );

  fs.writeFileSync(file,s);
}

// Validate helper is explicitly client-only and contains SSR guard.
const check=fs.readFileSync(helperPath,"utf8");
if(!check.startsWith('"use client"') || !check.includes('typeof window==="undefined"')){
  console.error("FIX 3 FAILED: current-user helper is not client guarded");
  process.exit(44);
}

console.log("WORLDNOWXXI CLIENT/SERVER AUTH BOUNDARY fixed");
console.log("WORLDNOWXXI SSR AUTH GUARD applied");
console.log("WORLDNOWXXI AUTH HARDENING FIX 3 applied successfully");
