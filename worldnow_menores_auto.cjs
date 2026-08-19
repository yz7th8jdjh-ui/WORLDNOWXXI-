const fs=require("fs");
const path=require("path");
const {execSync}=require("child_process");

console.log("\n>>> WORLDNOWXXI — MENORES + AUTORIZACION AUTOMATICA");

function run(cmd){console.log("\n$ "+cmd);execSync(cmd,{stdio:"inherit"});}
function write(file,content){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
  console.log("written:",file);
}

// Chain from latest known deployed WORLDNOW MAP layer.
if(fs.existsSync("worldnow_worldnow_map_fix.cjs")){
  run('node "worldnow_worldnow_map_fix.cjs"');
}else if(fs.existsSync("worldnow_worldnow_map.cjs")){
  run('node "worldnow_worldnow_map.cjs"');
}else{
  console.error("Missing WORLDNOW MAP launcher");
  process.exit(901);
}

// Registration layout: direct visits to /registro are routed through age gate.
write("app/registro/layout.js",`"use client";

import {useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";

export default function RegistroLayout({children}){
  const router=useRouter();
  const pathname=usePathname();
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    if(pathname!=="/registro"){ setReady(true); return; }
    try{
      const ok=sessionStorage.getItem("worldnow_age_gate_ok");
      if(ok==="1"){ setReady(true); return; }
    }catch{}
    router.replace("/registro-edad");
  },[pathname,router]);

  if(!ready&&pathname==="/registro"){
    return <main style={{padding:24,maxWidth:620,margin:"0 auto"}}>
      <h1>Comprobando edad…</h1>
      <p>WORLDNOWXXI protege especialmente las cuentas de menores.</p>
    </main>;
  }
  return children;
}
`);

// Age gate.
write("app/registro-edad/page.js",`"use client";

import {useState} from "react";
import Shell from "../../components/Shell";

function yearsOld(iso){
  if(!iso)return null;
  const d=new Date(iso+"T12:00:00");
  if(Number.isNaN(d.getTime()))return null;
  const now=new Date();
  let age=now.getFullYear()-d.getFullYear();
  const m=now.getMonth()-d.getMonth();
  if(m<0||(m===0&&now.getDate()<d.getDate()))age--;
  return age;
}

export default function RegistroEdad(){
  const [birth,setBirth]=useState("");
  const [err,setErr]=useState("");

  function go(e){
    e.preventDefault();
    const age=yearsOld(birth);
    if(age===null||age<0||age>120){
      setErr("Introduce una fecha de nacimiento válida.");
      return;
    }
    try{
      sessionStorage.setItem("worldnow_birth_date",birth);
      sessionStorage.setItem("worldnow_age_gate_ok","0");
    }catch{}
    if(age<14){
      location.href="/autorizacion-parental";
    }else{
      try{sessionStorage.setItem("worldnow_age_gate_ok","1")}catch{}
      location.href="/registro";
    }
  }

  return <Shell>
    <section className="panel" style={{maxWidth:620,margin:"36px auto"}}>
      <span className="kicker">REGISTRO SEGURO</span>
      <h1>¿Cuál es tu fecha de nacimiento?</h1>
      <p>La usamos para aplicar las protecciones adecuadas según la edad.</p>

      <form onSubmit={go} style={{display:"grid",gap:14,marginTop:22}}>
        <label>
          <strong>Fecha de nacimiento</strong>
          <input
            type="date"
            value={birth}
            onChange={e=>setBirth(e.target.value)}
            required
            style={{display:"block",width:"100%",marginTop:8}}
          />
        </label>
        {err&&<p role="alert">{err}</p>}
        <button className="button" type="submit">Continuar</button>
      </form>

      <p style={{fontSize:12,opacity:.72,marginTop:18}}>
        Si eres menor de 14 años necesitaremos la autorización de tu padre, madre o tutor legal.
      </p>
    </section>
  </Shell>;
}
`);

// Parent/guardian form. No DNI is uploaded to WORLDNOWXXI.
write("app/autorizacion-parental/page.js",`"use client";

import {useEffect,useState} from "react";
import Shell from "../../components/Shell";

export default function AutorizacionParental(){
  const [birth,setBirth]=useState("");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [relation,setRelation]=useState("padre_madre");
  const [accepted,setAccepted]=useState(false);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");

  useEffect(()=>{
    try{
      const b=sessionStorage.getItem("worldnow_birth_date")||"";
      setBirth(b);
      if(!b)location.href="/registro-edad";
    }catch{}
  },[]);

  async function submit(e){
    e.preventDefault();
    setBusy(true);setMsg("");
    try{
      const r=await fetch("/api/parental-verification/start",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          birth_date:birth,
          guardian_name:name,
          guardian_email:email,
          guardian_relationship:relation,
          guardian_attestation:accepted
        })
      });
      const j=await r.json().catch(()=>({}));
      if(r.ok&&j.url){
        try{
          sessionStorage.setItem("worldnow_guardian_name",name);
          sessionStorage.setItem("worldnow_guardian_email",email);
          sessionStorage.setItem("worldnow_guardian_relationship",relation);
          sessionStorage.setItem("worldnow_verification_session_id",j.session_id||"");
        }catch{}
        location.href=j.url;
        return;
      }
      if(j.code==="identity_not_configured"){
        setMsg("La verificación automática todavía no está activada en producción. Falta activar Stripe Identity.");
      }else{
        setMsg(j.error||"No se pudo iniciar la verificación.");
      }
    }catch{
      setMsg("No se pudo conectar con el sistema de verificación.");
    }finally{
      setBusy(false);
    }
  }

  return <Shell>
    <section className="panel" style={{maxWidth:680,margin:"32px auto"}}>
      <span className="kicker">PROTECCIÓN DE MENORES</span>
      <h1>Autorización de padre, madre o tutor</h1>
      <p>
        Un adulto responsable debe autorizar el uso de WORLDNOWXXI.
        La documentación se verificará mediante un proveedor especializado;
        WORLDNOWXXI no necesita recibir una foto del DNI en este formulario.
      </p>

      <form onSubmit={submit} style={{display:"grid",gap:14,marginTop:20}}>
        <label><strong>Nombre y apellidos del adulto</strong>
          <input value={name} onChange={e=>setName(e.target.value)} required style={{display:"block",width:"100%",marginTop:7}}/>
        </label>

        <label><strong>Email del adulto</strong>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{display:"block",width:"100%",marginTop:7}}/>
        </label>

        <label><strong>Relación con el menor</strong>
          <select value={relation} onChange={e=>setRelation(e.target.value)} style={{display:"block",width:"100%",marginTop:7}}>
            <option value="padre_madre">Padre / madre</option>
            <option value="tutor_legal">Tutor legal</option>
          </select>
        </label>

        <label style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/>
          <span>Declaro que soy padre, madre o tutor legal y autorizo iniciar el proceso de verificación.</span>
        </label>

        <button className="button" disabled={busy||!accepted}>
          {busy?"Iniciando verificación…":"Verificar identidad y autorizar"}
        </button>
      </form>

      {msg&&<p role="status" style={{marginTop:15}}>{msg}</p>}

      <div className="panel" style={{marginTop:18}}>
        <strong>¿Quién revisa la documentación?</strong>
        <p>
          El proveedor de identidad automatiza la comprobación documental.
          WORLDNOWXXI recibe el estado de la verificación y no muestra esos documentos a otros usuarios.
        </p>
      </div>
    </section>
  </Shell>;
}
`);

// Return page after Stripe Identity. We always re-check server-side; redirect alone is never trusted.
write("app/autorizacion-parental/resultado/page.js",`"use client";

import {useEffect,useState} from "react";
import Shell from "../../../components/Shell";

export default function Resultado(){
  const [state,setState]=useState("Comprobando verificación…");

  useEffect(()=>{
    let id="";
    try{id=sessionStorage.getItem("worldnow_verification_session_id")||""}catch{}
    if(!id){setState("No encontramos una verificación pendiente.");return;}

    fetch("/api/parental-verification/check?id="+encodeURIComponent(id),{cache:"no-store"})
      .then(async r=>({ok:r.ok,j:await r.json().catch(()=>({}))}))
      .then(({ok,j})=>{
        if(ok&&j.verified){
          try{
            sessionStorage.setItem("worldnow_parent_verified","1");
            sessionStorage.setItem("worldnow_age_gate_ok","1");
          }catch{}
          setState("Adulto verificado. Ya puedes continuar con el registro protegido.");
        }else if(j.status==="processing"){
          setState("La verificación sigue procesándose. Vuelve a intentarlo en unos minutos.");
        }else{
          setState("La verificación todavía no ha sido aprobada.");
        }
      })
      .catch(()=>setState("No se pudo comprobar la verificación."));
  },[]);

  const verified=state.startsWith("Adulto verificado");

  return <Shell>
    <section className="panel" style={{maxWidth:640,margin:"40px auto"}}>
      <span className="kicker">AUTORIZACIÓN PARENTAL</span>
      <h1>{verified?"✅ Verificación completada":"Verificación"}</h1>
      <p>{state}</p>
      {verified&&<a href="/registro" className="button">Continuar con el registro</a>}
    </section>
  </Shell>;
}
`);

// Stripe Identity status.
write("app/api/parental-verification/status/route.js",`export const dynamic="force-dynamic";

export async function GET(){
  return Response.json({
    provider:"stripe_identity",
    configured:Boolean(process.env.STRIPE_SECRET_KEY),
    mode:(process.env.STRIPE_SECRET_KEY||"").startsWith("sk_live_")?"live":
         (process.env.STRIPE_SECRET_KEY||"").startsWith("sk_test_")?"test":"not_configured"
  },{headers:{"cache-control":"no-store"}});
}
`);

// Creates a Stripe Identity VerificationSession server-side.
// Documents are collected on Stripe's hosted verification flow, not by WORLDNOWXXI.
write("app/api/parental-verification/start/route.js",`export const dynamic="force-dynamic";

function validBirth(v){
  if(!/^\\\\d{4}-\\\\d{2}-\\\\d{2}$/.test(String(v||"")))return false;
  const d=new Date(v+"T12:00:00Z");
  return !Number.isNaN(d.getTime())&&d<new Date();
}

function age(v){
  const d=new Date(v+"T12:00:00Z"),n=new Date();
  let a=n.getUTCFullYear()-d.getUTCFullYear();
  const m=n.getUTCMonth()-d.getUTCMonth();
  if(m<0||(m===0&&n.getUTCDate()<d.getUTCDate()))a--;
  return a;
}

export async function POST(req){
  const secret=process.env.STRIPE_SECRET_KEY||"";
  if(!secret){
    return Response.json({code:"identity_not_configured",error:"Stripe Identity is not configured."},{status:503});
  }

  const body=await req.json().catch(()=>({}));
  const birth=String(body.birth_date||"");
  const guardianName=String(body.guardian_name||"").trim();
  const guardianEmail=String(body.guardian_email||"").trim().toLowerCase();
  const relationship=String(body.guardian_relationship||"");

  if(!validBirth(birth)||age(birth)>=14){
    return Response.json({error:"This flow is only for users under 14."},{status:400});
  }
  if(guardianName.length<3||guardianName.length>160){
    return Response.json({error:"Invalid guardian name."},{status:400});
  }
  if(!/^\\\\S+@\\\\S+\\\\.\\\\S+$/.test(guardianEmail)||guardianEmail.length>320){
    return Response.json({error:"Invalid guardian email."},{status:400});
  }
  if(!["padre_madre","tutor_legal"].includes(relationship)||body.guardian_attestation!==true){
    return Response.json({error:"Guardian attestation is required."},{status:400});
  }

  const origin=new URL(req.url).origin;
  const form=new URLSearchParams();
  form.set("type","document");
  form.set("provided_details[email]",guardianEmail);
  form.set("metadata[purpose]","worldnow_parental_consent");
  form.set("metadata[guardian_relationship]",relationship);
  form.set("options[document][require_matching_selfie]","true");
  form.set("return_url",origin+"/autorizacion-parental/resultado");

  const r=await fetch("https://api.stripe.com/v1/identity/verification_sessions",{
    method:"POST",
    headers:{
      "authorization":"Bearer "+secret,
      "content-type":"application/x-www-form-urlencoded"
    },
    body:form.toString(),
    cache:"no-store"
  });

  const j=await r.json().catch(()=>({}));
  if(!r.ok){
    return Response.json({error:j.error?.message||"Could not create identity verification."},{status:502});
  }

  return Response.json({
    session_id:j.id,
    url:j.url
  },{headers:{"cache-control":"no-store"}});
}
`);

// Retrieves Stripe status server-side. Client cannot self-declare verification.
write("app/api/parental-verification/check/route.js",`export const dynamic="force-dynamic";

export async function GET(req){
  const secret=process.env.STRIPE_SECRET_KEY||"";
  if(!secret)return Response.json({error:"Identity provider not configured."},{status:503});

  const id=new URL(req.url).searchParams.get("id")||"";
  if(!/^vs_[A-Za-z0-9_]+$/.test(id)){
    return Response.json({error:"Invalid verification id."},{status:400});
  }

  const r=await fetch("https://api.stripe.com/v1/identity/verification_sessions/"+encodeURIComponent(id),{
    headers:{"authorization":"Bearer "+secret},
    cache:"no-store"
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)return Response.json({error:"Could not read verification."},{status:502});

  return Response.json({
    verified:j.status==="verified",
    status:j.status||"unknown"
  },{headers:{"cache-control":"no-store"}});
}
`);

// Add a clear entry point on the existing parental-control page if it exists.
const parental="app/control-parental/page.js";
if(fs.existsSync(parental)){
  let s=fs.readFileSync(parental,"utf8");
  if(!s.includes('href="/registro-edad"')){
    const card=`\n      <a href="/registro-edad" className="panel" style={{display:"block",marginTop:16,textDecoration:"none"}}>\n        <div style={{fontSize:34}}>🛡️</div>\n        <h2>Registro protegido para menores</h2>\n        <p>Control de edad y autorización automática de padre, madre o tutor.</p>\n        <strong>Ver proceso →</strong>\n      </a>\n`;
    const pos=s.lastIndexOf("</Shell>");
    if(pos>=0){
      s=s.slice(0,pos)+card+s.slice(pos);
      fs.writeFileSync(parental,s);
      console.log("Control parental integration: added");
    }
  }
}

// Make common UI registration links go through age gate.
// Exact href replacements only; no structural regex rewrites.
function walk(dir){
  if(!fs.existsSync(dir))return [];
  let out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())out=out.concat(walk(p));
    else if(/\\.(js|jsx|ts|tsx)$/.test(e.name))out.push(p);
  }
  return out;
}
let linkChanges=0;
for(const f of [...walk("app"),...walk("components")]){
  if(f.includes("registro-edad")||f.includes("autorizacion-parental")||f==="app/registro/layout.js")continue;
  let s=fs.readFileSync(f,"utf8");
  const before=s;
  s=s.replaceAll('href="/registro"','href="/registro-edad"');
  s=s.replaceAll("href='/registro'","href='/registro-edad'");
  if(s!==before){
    fs.writeFileSync(f,s);
    linkChanges++;
  }
}
console.log("Registration links routed through age gate:",linkChanges);

// Guard against accidentally adding document upload fields to our own form.
for(const f of ["app/autorizacion-parental/page.js"]){
  const s=fs.readFileSync(f,"utf8");
  if(/type=["']file["']/.test(s)){
    console.error("PRIVACY GATE FAILED: local document upload detected");
    process.exit(902);
  }
}

// Security gate.
let raw="";
try{raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}
catch(e){raw=(e.stdout||"").toString()}
let audit={};try{audit=JSON.parse(raw||"{}")}catch{}
const total=audit.metadata?.vulnerabilities?.total||0;
console.log("Dependency vulnerabilities:",total);
if(total!==0)process.exit(903);

run("npm run build");

console.log("\n================================================");
console.log(" WORLDNOWXXI — MENORES AUTO SUCCESS");
console.log(" Age gate: ready");
console.log(" Under-14 parental flow: ready");
console.log(" Stripe Identity automatic document verification: prepared");
console.log(" WORLDNOWXXI local DNI upload: disabled by privacy gate");
console.log(" DB linkage of verified consent to user: pending runtime identity/provider activation");
console.log("================================================\n");
