const {execSync}=require("child_process");
const fs=require("fs");
const path=require("path");

console.log("\n>>> WORLDNOWXXI AUTH HARDENING FIX 2");
execSync('node "worldnow_auth_hardening_fix.cjs"',{stdio:"inherit"});

const identity=`"use client";
import {useEffect,useState} from "react";

export default function IdentitySecurity(){
 const [s,setS]=useState(null);
 useEffect(()=>{fetch("/api/auth/secure-session",{credentials:"include",cache:"no-store"})
   .then(r=>r.json()).then(setS).catch(()=>setS({authenticated:false}))},[]);
 return <main style={{maxWidth:900,margin:"0 auto",padding:"24px 16px 110px"}}>
   <div className="section-title"><div><span className="kicker">SECURITY SHIELD · IDENTITY</span>
   <h1>Identidad segura</h1>
   <p>WORLDNOWXXI no confía en un ID editable del navegador para autorizar acciones críticas.</p></div></div>
   <section className="panel">
     <div className={"auth-status "+(s?.authenticated?"ok":"pending")}>
       {s?.authenticated?"● Sesión Neon Auth reconocida":"● Sesión pendiente de validación"}
     </div>
     <h2>{s?.authenticated?"Autenticación reconocida":"Neon Auth debe estar conectado"}</h2>
     <p>La identidad interna se obtiene mediante Neon y las políticas RLS.</p>
   </section>
 </main>
}
`;

const system=`"use client";
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
`;

const files={
 "app/seguridad-identidad/page.js":identity,
 "app/seguridad-sistema/page.js":system
};

for(const [rel,data] of Object.entries(files)){
 const target=path.join(process.cwd(),rel);
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,data);
}

// Explicitly verify the two pages contain no dependency on a missing Shell component.
for(const rel of Object.keys(files)){
 const s=fs.readFileSync(path.join(process.cwd(),rel),"utf8");
 if(/components\/Shell/.test(s)){
   console.error("FIX 2 FAILED: Shell dependency still present in "+rel);
   process.exit(43);
 }
}

console.log("WORLDNOWXXI SECURITY PAGES made self-contained");
console.log("WORLDNOWXXI AUTH HARDENING FIX 2 applied successfully");
