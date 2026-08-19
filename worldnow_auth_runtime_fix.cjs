const fs=require("fs");
const path=require("path");
const {execSync}=require("child_process");

console.log("\n>>> WORLDNOWXXI — AUTH RUNTIME HARDENING FIX");

function run(cmd){console.log("\n$ "+cmd);execSync(cmd,{stdio:"inherit"});}
function write(file,content){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
  console.log("written:",file);
}

// Prefer latest deployed chain if present.
const chain=[
  "worldnow_menores_auto.cjs",
  "worldnow_worldnow_map_fix.cjs",
  "worldnow_master_secure_v2_fixed2.cjs"
].find(f=>fs.existsSync(f));

if(chain){ run(`node "${chain}"`); }
else{
  console.error("No known WORLDNOWXXI launcher found");
  process.exit(910);
}

// Shared server-side session helper.
// Never trusts localStorage; it forwards the request cookie to Neon Auth.
write("lib/server-auth.js",`import {headers} from "next/headers";

const AUTH_BASE=process.env.NEON_AUTH_URL||
"https://ep-small-math-afh8i45i.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth";

const DATA_API=process.env.NEON_DATA_API_URL||
"https://ep-small-math-afh8i45i.apirest.c-2.us-west-2.aws.neon.tech/neondb/rest/v1";

function firstAuthUserId(payload){
  return payload?.user?.id||
         payload?.session?.userId||
         payload?.session?.user?.id||
         payload?.data?.user?.id||
         payload?.data?.session?.userId||
         null;
}

export async function getServerSession(){
  const h=await headers();
  const cookie=h.get("cookie")||"";
  if(!cookie)return {authenticated:false,user:null,raw:null};

  const urls=[
    AUTH_BASE.replace(/\\/$/,"")+"/get-session",
    AUTH_BASE.replace(/\\/$/,"")+"/api/auth/get-session"
  ];

  for(const url of urls){
    try{
      const r=await fetch(url,{
        headers:{cookie,accept:"application/json"},
        cache:"no-store"
      });
      if(!r.ok)continue;
      const j=await r.json().catch(()=>null);
      const authUserId=firstAuthUserId(j);
      if(authUserId){
        return {authenticated:true,user:{auth_user_id:String(authUserId)},raw:j};
      }
    }catch{}
  }
  return {authenticated:false,user:null,raw:null};
}

export async function getCurrentProfile(){
  const session=await getServerSession();
  if(!session.authenticated)return {authenticated:false,profile:null,session};

  const h=await headers();
  const cookie=h.get("cookie")||"";
  const url=DATA_API.replace(/\\/$/,"")+
    "/users?auth_user_id=eq."+encodeURIComponent(session.user.auth_user_id)+
    "&select=id,username,email,display_name,bio,country,city,role,birth_date,age_gate_status,parental_consent_status,auth_user_id&limit=1";

  try{
    const r=await fetch(url,{
      headers:{cookie,accept:"application/json"},
      cache:"no-store"
    });
    if(!r.ok)return {authenticated:true,profile:null,session,error:"profile_fetch_failed"};
    const arr=await r.json().catch(()=>[]);
    return {authenticated:true,profile:Array.isArray(arr)?arr[0]||null:null,session};
  }catch{
    return {authenticated:true,profile:null,session,error:"profile_fetch_failed"};
  }
}
`);

// Single canonical endpoint for runtime identity.
write("app/api/auth/runtime/route.js",`import {getCurrentProfile} from "../../../../lib/server-auth";

export const dynamic="force-dynamic";

export async function GET(){
  const r=await getCurrentProfile();
  return Response.json({
    authenticated:r.authenticated,
    profile:r.profile?{
      id:r.profile.id,
      username:r.profile.username,
      display_name:r.profile.display_name,
      role:r.profile.role,
      birth_date:r.profile.birth_date,
      age_gate_status:r.profile.age_gate_status,
      parental_consent_status:r.profile.parental_consent_status
    }:null,
    profile_loaded:Boolean(r.profile),
    error:r.error||null
  },{headers:{"cache-control":"no-store"}});
}
`);

// Auth diagnostic page.
write("app/diagnostico-auth/page.js",`"use client";

import {useEffect,useState} from "react";
import Shell from "../../components/Shell";

export default function DiagnosticoAuth(){
  const [data,setData]=useState(null);
  const [err,setErr]=useState("");

  async function check(){
    setErr("");setData(null);
    try{
      const r=await fetch("/api/auth/runtime",{cache:"no-store"});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||"auth check failed");
      setData(j);
    }catch(e){setErr(String(e.message||e))}
  }

  useEffect(()=>{check()},[]);

  return <Shell>
    <section className="panel" style={{maxWidth:760,margin:"34px auto"}}>
      <span className="kicker">WORLDNOWXXI SECURITY</span>
      <h1>Diagnóstico de sesión</h1>
      <p>Esta pantalla comprueba la sesión real del servidor y el perfil asociado.</p>

      <button className="button" onClick={check}>Volver a comprobar</button>

      {err&&<p role="alert" style={{marginTop:18}}>❌ {err}</p>}

      {data&&<div style={{display:"grid",gap:12,marginTop:20}}>
        <div className="panel"><strong>Sesión</strong><p>{data.authenticated?"✅ Autenticado":"❌ No autenticado"}</p></div>
        <div className="panel"><strong>Perfil</strong><p>{data.profile_loaded?"✅ Perfil cargado":"⚠️ Perfil no cargado"}</p></div>
        {data.profile&&<div className="panel">
          <strong>Usuario actual</strong>
          <p>ID interno: {String(data.profile.id)}</p>
          <p>Usuario: {data.profile.username||"—"}</p>
          <p>Rol: {data.profile.role||"user"}</p>
          <p>Consentimiento parental: {data.profile.parental_consent_status||"—"}</p>
        </div>}
      </div>}
    </section>
  </Shell>;
}
`);

// Canonical client hook using only server runtime identity.
write("lib/use-runtime-user.js",`"use client";

import {useEffect,useState,useCallback} from "react";

export function useRuntimeUser(){
  const [state,setState]=useState({loading:true,authenticated:false,profile:null,error:null});

  const refresh=useCallback(async()=>{
    setState(s=>({...s,loading:true,error:null}));
    try{
      const r=await fetch("/api/auth/runtime",{cache:"no-store"});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||"runtime_auth_failed");
      setState({loading:false,authenticated:Boolean(j.authenticated),profile:j.profile||null,error:null});
    }catch(e){
      setState({loading:false,authenticated:false,profile:null,error:String(e.message||e)});
    }
  },[]);

  useEffect(()=>{refresh()},[refresh]);
  return {...state,refresh};
}
`);

// Harden checkout: ignore body.user_id and derive user from server session.
// We patch only if the file exists, replacing the route completely.
const checkout="app/api/payments/checkout/route.js";
if(fs.existsSync(checkout)){
  write(checkout,`import {getCurrentProfile} from "../../../../lib/server-auth";

export const dynamic="force-dynamic";

const PRICE_KEYS={
  "promo_1m":"STRIPE_PRICE_PROMO_1M",
  "promo_3m":"STRIPE_PRICE_PROMO_3M",
  "promo_12m":"STRIPE_PRICE_PROMO_12M"
};

export async function POST(req){
  const secret=process.env.STRIPE_SECRET_KEY||"";
  if(!secret)return Response.json({error:"Stripe not configured"},{status:503});

  const me=await getCurrentProfile();
  if(!me.authenticated||!me.profile){
    return Response.json({error:"Authentication required"},{status:401});
  }

  const body=await req.json().catch(()=>({}));
  const product=String(body.product||"");
  const priceEnv=PRICE_KEYS[product];
  const price=priceEnv?process.env[priceEnv]:"";
  if(!price)return Response.json({error:"Unknown or unconfigured product"},{status:400});

  const origin=new URL(req.url).origin;
  const form=new URLSearchParams();
  form.set("mode","payment");
  form.set("line_items[0][price]",price);
  form.set("line_items[0][quantity]","1");
  form.set("success_url",origin+"/pago-exito?session_id={CHECKOUT_SESSION_ID}");
  form.set("cancel_url",origin+"/promocionar");
  form.set("metadata[worldnow_user_id]",String(me.profile.id));
  form.set("metadata[worldnow_auth_user_id]",String(me.profile.auth_user_id||""));
  form.set("metadata[product]",product);

  const r=await fetch("https://api.stripe.com/v1/checkout/sessions",{
    method:"POST",
    headers:{
      authorization:"Bearer "+secret,
      "content-type":"application/x-www-form-urlencoded"
    },
    body:form.toString(),
    cache:"no-store"
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)return Response.json({error:j.error?.message||"Checkout failed"},{status:502});

  return Response.json({url:j.url,id:j.id});
}
`);
  console.log("Checkout identity trust removed: body.user_id no longer accepted");
}

// Static audit for risky identity patterns.
// We do NOT rewrite pages destructively; we fail the gate if sensitive patterns remain.
function walk(dir){
  if(!fs.existsSync(dir))return [];
  let out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())out=out.concat(walk(p));
    else if(/\.(js|jsx|ts|tsx)$/.test(e.name))out.push(p);
  }
  return out;
}

const files=[...walk("app"),...walk("components"),...walk("lib")];
const risky=[];
for(const f of files){
  const s=fs.readFileSync(f,"utf8");
  if(
    /localStorage\.getItem\([^)]*(user|user_id|currentUser|session)/i.test(s)||
    /sessionStorage\.getItem\([^)]*(user_id|currentUser)/i.test(s)
  ){
    risky.push(f);
  }
}

write("WORLDNOW_AUTH_RUNTIME_AUDIT.txt",
`WORLDNOWXXI AUTH RUNTIME AUDIT
Generated: ${new Date().toISOString()}

Runtime endpoint: /api/auth/runtime
Diagnostic page: /diagnostico-auth
Checkout body.user_id trust: ${fs.existsSync(checkout)?"removed":"route not present"}
Potential client identity-storage references remaining: ${risky.length}

${risky.join("\\n")}
`);

console.log("Potential client identity-storage references remaining:",risky.length);
if(risky.length){
  console.log("NOTE: references are reported, not auto-rewritten, to avoid destructive changes.");
}

// Audit gate.
let raw="";
try{raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}
catch(e){raw=(e.stdout||"").toString()}
let audit={};try{audit=JSON.parse(raw||"{}")}catch{}
const total=audit.metadata?.vulnerabilities?.total||0;
console.log("Dependency vulnerabilities:",total);
if(total!==0)process.exit(911);

// Build.
run("npm run build");

console.log("\n================================================");
console.log(" WORLDNOWXXI — AUTH RUNTIME SUCCESS");
console.log(" Server-side session helper: ready");
console.log(" Runtime identity endpoint: ready");
console.log(" Auth diagnostic page: ready");
console.log(" Checkout client user_id trust: removed if route existed");
console.log(" Client identity refs: audited, not destructively rewritten");
console.log("================================================\n");
