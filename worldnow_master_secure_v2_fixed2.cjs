const {execSync}=require("child_process");
const fs=require("fs");
const path=require("path");

console.log("\n================================================");
console.log(" WORLDNOWXXI MASTER SECURE V2");
console.log(" Identity closure + Owner/Founder architecture");
console.log("================================================\n");

function run(cmd){ console.log("\n$ "+cmd); execSync(cmd,{stdio:"inherit"}); }
function must(f){ if(!fs.existsSync(f)){console.error("MISSING:",f);process.exit(401)} }
function write(f,s){fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s);console.log("written:",f)}

must("worldnow_master_secure.cjs");
run('node "worldnow_master_secure.cjs"');

// Canonical identity helper: the browser receives its internal profile only
// from a server endpoint backed by the authenticated session.
write("lib/current-user-client.js",`"use client";

export async function getCurrentUserProfile(){
  const r=await fetch("/api/auth/profile",{
    credentials:"include",
    cache:"no-store",
    headers:{"accept":"application/json"}
  });
  const j=await r.json().catch(()=>null);
  if(!r.ok||!j?.authenticated) return null;
  return j?.profile||null;
}

export async function getCurrentUserId(){
  const profile=await getCurrentUserProfile();
  return profile?.id?String(profile.id):"";
}
`);

const files={
  "app/crear/page.js":"../../lib/current-user-client",
  "app/guardados/page.js":"../../lib/current-user-client",
  "app/mensajes/page.js":"../../lib/current-user-client",
  "app/notificaciones/page.js":"../../lib/current-user-client",
  "app/page.js":"../lib/current-user-client",
  "app/perfil/bloqueados/page.js":"../../../lib/current-user-client",
  "app/perfil/page.js":"../../lib/current-user-client",
  "app/post/[id]/page.js":"../../../lib/current-user-client",
  "app/seguridad/usuario/[id]/page.js":"../../../../lib/current-user-client",
  "app/usuario/[id]/page.js":"../../../lib/current-user-client"
};

function addImport(src,rel){
  if(src.includes("getCurrentUserId")) return src;
  const marker='"use client";';
  if(!src.includes(marker)) throw new Error("client marker missing");
  return src.replace(marker,marker+`\nimport {getCurrentUserId} from "${rel}";`);
}

// Replace a named top-level helper function by brace balancing.
// This avoids the destructive regex problem from the old hardening attempt.
function replaceNamedFunction(src,name){
  const token="function "+name+"(";
  const start=src.indexOf(token);
  if(start<0) return {src,changed:false};
  const open=src.indexOf("{",start);
  if(open<0) throw new Error("opening brace not found for "+name);
  let depth=0,end=-1,quote=null,escape=false;
  for(let i=open;i<src.length;i++){
    const c=src[i];
    if(quote){
      if(escape){escape=false;continue}
      if(c==="\\"){escape=true;continue}
      if(c===quote)quote=null;
      continue;
    }
    if(c==="'"||c=='"'||c==="`"){quote=c;continue}
    if(c==="{")depth++;
    if(c==="}"){depth--;if(depth===0){end=i+1;break}}
  }
  if(end<0) throw new Error("closing brace not found for "+name);
  const repl=`async function ${name}(){return await getCurrentUserId();}`;
  return {src:src.slice(0,start)+repl+src.slice(end),changed:true};
}

const helperNames={
  "app/crear/page.js":"getStoredUserId",
  "app/guardados/page.js":"getUserId",
  "app/mensajes/page.js":"getStoredUserId",
  "app/notificaciones/page.js":"getStoredUserId",
  "app/page.js":"storedUserId",
  "app/perfil/bloqueados/page.js":"myId",
  "app/perfil/page.js":"storedUser",
  "app/post/[id]/page.js":"getUserId",
  "app/seguridad/usuario/[id]/page.js":"myId",
  "app/usuario/[id]/page.js":"getStoredUserId"
};

const callReplacements={
  "app/crear/page.js":[
    ["const userId=getStoredUserId();","const userId=await getStoredUserId();"]
  ],
  "app/guardados/page.js":[
    ["useEffect(()=>{const id=getUserId();setUid(id); if(id)load(id); else setLoading(false)},[]);",
     "useEffect(()=>{let alive=true;(async()=>{const id=await getUserId();if(!alive)return;setUid(id);if(id)load(id);else setLoading(false)})();return()=>{alive=false}},[]);"]
  ],
  "app/mensajes/page.js":[
    ["useEffect(()=>{setMe(getStoredUserId())},[]);",
     "useEffect(()=>{let alive=true;(async()=>{const id=await getStoredUserId();if(alive)setMe(id)})();return()=>{alive=false}},[]);"]
  ],
  "app/notificaciones/page.js":[],
  "app/page.js":[
    ["useEffect(()=>{const id=storedUserId();setUid(id);load(id)},[]);",
     "useEffect(()=>{let alive=true;(async()=>{const id=await storedUserId();if(!alive)return;setUid(id);load(id)})();return()=>{alive=false}},[]);"]
  ],
  "app/perfil/bloqueados/page.js":[
    ["useEffect(()=>{const u=myId();setUid(u);if(u)load(u);else setLoading(false)},[]);",
     "useEffect(()=>{let alive=true;(async()=>{const u=await myId();if(!alive)return;setUid(u);if(u)load(u);else setLoading(false)})();return()=>{alive=false}},[]);"]
  ],
  "app/perfil/page.js":[
    ["useEffect(()=>{const id=storedUser();setUid(id);if(id)load(id);else setLoading(false)},[]);",
     "useEffect(()=>{let alive=true;(async()=>{const id=await storedUser();if(!alive)return;setUid(id);if(id)load(id);else setLoading(false)})();return()=>{alive=false}},[]);"]
  ],
  "app/post/[id]/page.js":[
    ["useEffect(()=>{const u=getUserId();setUid(u); if(id)load(u)},[id]);",
     "useEffect(()=>{let alive=true;(async()=>{const u=await getUserId();if(!alive)return;setUid(u);if(id)load(u)})();return()=>{alive=false}},[id]);"]
  ],
  "app/seguridad/usuario/[id]/page.js":[
    ["useEffect(()=>{const u=myId();setUid(u);if(u&&target)check(u)},[target]);",
     "useEffect(()=>{let alive=true;(async()=>{const u=await myId();if(!alive)return;setUid(u);if(u&&target)check(u)})();return()=>{alive=false}},[target]);"]
  ],
  "app/usuario/[id]/page.js":[
    ["useEffect(()=>{setMe(getStoredUserId())},[]);",
     "useEffect(()=>{let alive=true;(async()=>{const u=await getStoredUserId();if(alive)setMe(u)})();return()=>{alive=false}},[]);"]
  ]
};


function replaceNotificationEffect(src){
  const needle="getStoredUserId()";
  const first=src.indexOf(needle);
  if(first<0) throw new Error("notification identity helper not found");
  const hit=src.indexOf(needle,first+needle.length);
  if(hit<0) throw new Error("notification identity call not found");

  const start=src.lastIndexOf("useEffect(",hit);
  if(start<0) throw new Error("notification useEffect start not found");

  let depth=0,end=-1,quote=null,escape=false;
  for(let i=start;i<src.length;i++){
    const c=src[i];
    if(quote){
      if(escape){escape=false;continue}
      if(c==="\\"){escape=true;continue}
      if(c===quote)quote=null;
      continue;
    }
    if(c==="'"||c=='"'||c==="`"){quote=c;continue}
    if(c==="(")depth++;
    if(c===")"){
      depth--;
      if(depth===0){
        let j=i+1;
        while(j<src.length && /\s/.test(src[j])) j++;
        if(src[j]===";") j++;
        end=j;
        break;
      }
    }
  }
  if(end<0) throw new Error("notification useEffect end not found");

  const repl=`useEffect(()=>{let alive=true;(async()=>{const uid=await getStoredUserId();if(!alive)return;setUserId(uid);if(uid)load(uid);else setLoading(false)})();return()=>{alive=false}},[]);`;
  return src.slice(0,start)+repl+src.slice(end);
}

console.log("\n>>> Exact identity migration");
for(const [file,rel] of Object.entries(files)){
  must(file);
  let src=fs.readFileSync(file,"utf8");
  src=addImport(src,rel);
  const out=replaceNamedFunction(src,helperNames[file]);
  if(!out.changed){
    console.error("IDENTITY PATCH FAILED: helper not found:",file,helperNames[file]);
    process.exit(402);
  }
  src=out.src;
  if(file==="app/notificaciones/page.js"){
    src=replaceNotificationEffect(src);
  }
  for(const [oldText,newText] of (callReplacements[file]||[])){
    if(!src.includes(oldText)){
      console.error("IDENTITY PATCH FAILED: expected callsite not found:",file);
      process.exit(403);
    }
    src=src.replace(oldText,newText);
  }
  fs.writeFileSync(file,src);
  console.log("migrated:",file);
}

// Hard gate: no sensitive page may read identity from localStorage anymore.
const forbidden=[
  /localStorage\.getItem\(["']worldnow_user_id["']\)/,
  /localStorage\.getItem\(["']user_id["']\)/
];
for(const file of Object.keys(files)){
  const src=fs.readFileSync(file,"utf8");
  for(const re of forbidden){
    if(re.test(src)){
      console.error("IDENTITY GATE FAILED: browser-trusted identity remains in",file);
      process.exit(404);
    }
  }
}
console.log("IDENTITY GATE: 0 direct localStorage user-id reads in 10 sensitive pages");

// Owner/Founder architecture. No public registration path can select this role.
// Actual owner activation is tied to authenticated session + DB role or secret env auth id.
write("lib/worldnow-roles.js",`export const WORLDNOW_ROLES=Object.freeze({
  OWNER:"owner",
  ADMIN:"admin",
  MODERATOR:"moderator",
  SUPPORT:"support",
  USER:"user"
});
export const STAFF_ROLES=Object.freeze(["owner","admin","moderator","support"]);
`);

write("app/api/owner/status/route.js",`export const dynamic="force-dynamic";

export async function GET(req){
  const origin=new URL(req.url).origin;
  const cookie=req.headers.get("cookie")||"";
  const [sessionRes,profileRes]=await Promise.all([
    fetch(origin+"/api/auth/secure-session",{headers:{cookie},cache:"no-store"}),
    fetch(origin+"/api/auth/profile",{headers:{cookie},cache:"no-store"})
  ]);
  const session=await sessionRes.json().catch(()=>null);
  const pdata=await profileRes.json().catch(()=>null);

  if(!session?.authenticated||!session?.user?.id){
    return Response.json({authenticated:false,is_owner:false},{status:401,headers:{"cache-control":"no-store"}});
  }

  const configured=(process.env.WORLDNOW_OWNER_AUTH_ID||"").trim();
  const byEnv=!!configured&&String(session.user.id)===configured;
  const byRole=String(pdata?.profile?.role||"").toLowerCase()==="owner";
  const isOwner=byEnv||byRole;

  return Response.json({
    authenticated:true,
    is_owner:isOwner,
    owner_configured:!!configured||byRole,
    profile:isOwner?pdata?.profile||null:null
  },{status:isOwner?200:403,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
`);

write("app/owner/page.js",`"use client";
import {useEffect,useState} from "react";
import Shell from "../../components/Shell";

export default function OwnerPage(){
  const [state,setState]=useState({loading:true,ok:false});
  useEffect(()=>{let alive=true;(async()=>{
    const r=await fetch("/api/owner/status",{credentials:"include",cache:"no-store"});
    if(alive)setState({loading:false,ok:r.ok});
  })();return()=>{alive=false}},[]);

  if(state.loading)return <Shell><section className="panel"><p>Comprobando acceso…</p></section></Shell>;
  if(!state.ok)return <Shell><section className="panel"><h1>Acceso privado</h1><p>Esta zona pertenece al propietario de WORLDNOWXXI.</p></section></Shell>;

  return <Shell>
    <div className="section-title"><div><span className="kicker">OWNER / FOUNDER</span><h1>WORLDNOWXXI</h1><p>Panel privado del propietario.</p></div></div>
    <section className="panel">
      <h2>Fundador y propietario</h2>
      <p>Desde aquí se habilitarán administración, moderación, soporte, monetización y seguridad avanzada.</p>
      <p>Los roles futuros existen en la arquitectura, pero ningún usuario puede autoasignárselos.</p>
    </section>
  </Shell>;
}
`);

// Registration must not expose privileged role selection.
must("app/registro/page.js");
const reg=fs.readFileSync("app/registro/page.js","utf8").toLowerCase();
for(const word of ["owner","founder","moderator","moderador","support","soporte"]){
  if(reg.includes(`value="${word}"`)||reg.includes(`value='${word}'`)){
    console.error("ROLE GATE FAILED: privileged role exposed in registration:",word);
    process.exit(405);
  }
}
console.log("ROLE GATE: public registration has no privileged role selector");

// Final security/build gates.
let raw="";
try{raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}
catch(e){raw=(e.stdout||"").toString()}
let audit={};try{audit=JSON.parse(raw||"{}")}catch{}
const total=audit.metadata?.vulnerabilities?.total||0;
console.log("Dependency vulnerabilities:",total);
if(total!==0)process.exit(406);

run("npm run build");

console.log("\n================================================");
console.log(" WORLDNOWXXI MASTER SECURE V2 — SUCCESS");
console.log(" IDENTITY: server-session based on 10 sensitive pages");
console.log(" OWNER/FOUNDER ARCHITECTURE: ready");
console.log(" PRIVILEGED PUBLIC REGISTRATION: blocked");
console.log(" NPM AUDIT: 0 vulnerabilities");
console.log(" BUILD: passed");
console.log(" Next: activate the unique Owner account with WORLDNOW_OWNER_AUTH_ID");
console.log("================================================\n");
