const {execSync} = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("\n>>> WORLDNOWXXI IDENTITY PHASE 1 — SAFE SESSION BRIDGE");

// Always start from the last green identity/security layer.
execSync('node "worldnow_identity_core.cjs"', {stdio:"inherit"});

function must(file){
  if(!fs.existsSync(file)){
    console.error("IDENTITY PHASE 1 FAILED: missing", file);
    process.exit(201);
  }
}
function write(file, content){
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, content);
  console.log("written:", file);
}

// Server endpoint maps the authenticated Neon Auth user to the internal users row.
// The browser does not get to choose the numeric id.
write("app/api/auth/profile/route.js", `export const dynamic="force-dynamic";

const DATA_API=process.env.NEXT_PUBLIC_NEON_DATA_API_URL||process.env.NEON_DATA_API_URL||"";

export async function GET(req){
  const origin=new URL(req.url).origin;
  const sessionRes=await fetch(origin+"/api/auth/secure-session",{
    headers:{cookie:req.headers.get("cookie")||""},
    cache:"no-store"
  });
  const session=await sessionRes.json().catch(()=>null);

  if(!session?.authenticated||!session?.user?.id){
    return Response.json({authenticated:false,profile:null},{
      status:401,
      headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}
    });
  }

  if(!DATA_API){
    return Response.json({authenticated:true,profile:null,error:"DATA_API_NOT_CONFIGURED"},{
      status:503,
      headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}
    });
  }

  const url=new URL(DATA_API.replace(/\\/$/,"")+"/users");
  url.searchParams.set("auth_user_id","eq."+session.user.id);
  url.searchParams.set("select","id,username,display_name,bio,country,city,role,auth_user_id");
  url.searchParams.set("limit","1");

  const headers={
    "accept":"application/json",
    "cookie":req.headers.get("cookie")||""
  };
  const key=process.env.NEXT_PUBLIC_NEON_DATA_API_KEY||process.env.NEON_DATA_API_KEY;
  if(key){
    headers.apikey=key;
    headers.authorization="Bearer "+key;
  }

  const r=await fetch(url,{headers,cache:"no-store"});
  const rows=await r.json().catch(()=>[]);
  if(!r.ok){
    return Response.json({authenticated:true,profile:null,error:"PROFILE_LOOKUP_FAILED"},{
      status:502,
      headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}
    });
  }

  return Response.json({
    authenticated:true,
    profile:Array.isArray(rows)?(rows[0]||null):null
  },{
    headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}
  });
}
`);

// Canonical client hook. This is the only supported identity source for new/rewritten pages.
write("lib/use-current-user.js", `"use client";
import {useEffect,useState} from "react";

export function useCurrentUser(){
  const [state,setState]=useState({loading:true,authenticated:false,profile:null,error:null});

  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const r=await fetch("/api/auth/profile",{credentials:"include",cache:"no-store"});
        const j=await r.json().catch(()=>null);
        if(!alive)return;
        setState({
          loading:false,
          authenticated:!!j?.authenticated,
          profile:j?.profile||null,
          error:r.ok?null:(j?.error||"SESSION_ERROR")
        });
      }catch{
        if(alive)setState({loading:false,authenticated:false,profile:null,error:"SESSION_ERROR"});
      }
    })();
    return()=>{alive=false};
  },[]);

  return state;
}
`);

// Runtime guard: flag identity stored in localStorage. This does not break preferences.
// It creates one source-of-truth report for the next exact rewrite stage.
const targets=[
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

const report=[];
for(const file of targets){
  must(file);
  const s=fs.readFileSync(file,"utf8");
  const lines=s.split(/\r?\n/);
  const hits=[];
  lines.forEach((line,i)=>{
    if(
      line.includes('localStorage.getItem("worldnow_user_id")') ||
      line.includes('localStorage.getItem("user_id")') ||
      line.includes("localStorage.getItem('worldnow_user_id')") ||
      line.includes("localStorage.getItem('user_id')")
    ){
      hits.push({line:i+1,text:line.trim()});
    }
  });
  report.push({file,hits});
}

fs.writeFileSync("worldnow_identity_phase1_report.json",JSON.stringify(report,null,2));
console.log("\n>>> Remaining browser identity reads");
let total=0;
for(const row of report){
  if(row.hits.length){
    console.log(row.file+": "+row.hits.length);
    total+=row.hits.length;
  }
}
console.log("Total direct localStorage identity reads:",total);

// Hard security invariant: no server auth API may accept a client-supplied user_id.
const serverAuthFiles=[
  "app/api/auth/me/route.js",
  "app/api/auth/profile/route.js"
];
for(const f of serverAuthFiles){
  must(f);
  const s=fs.readFileSync(f,"utf8");
  if(/body\.user_id|searchParams\.get\(["']user_id["']\)/.test(s)){
    console.error("IDENTITY SERVER GATE FAILED:",f,"accepts client user_id");
    process.exit(202);
  }
}

console.log("\n>>> npm audit gate");
let raw="";
try{
  raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
}catch(e){raw=(e.stdout||"").toString();}
const audit=JSON.parse(raw||"{}");
const v=audit.metadata?.vulnerabilities||{};
console.log("Total:",v.total||0);
if((v.total||0)!==0){
  console.error("SECURITY GATE FAILED: dependency vulnerabilities detected");
  process.exit(203);
}

console.log("\n>>> Production build gate");
execSync("npm run build",{stdio:"inherit"});

console.log("\nWORLDNOWXXI IDENTITY PHASE 1 applied successfully");
console.log("SERVER IDENTITY: authenticated session -> internal profile");
console.log("CLIENT IDENTITY HOOK: ready");
console.log("SECURITY GATE: 0 dependency vulnerabilities");
console.log("BUILD GATE: production build passed");
console.log("NEXT: exact page rewrites using useCurrentUser(); no regex component deletion.");
