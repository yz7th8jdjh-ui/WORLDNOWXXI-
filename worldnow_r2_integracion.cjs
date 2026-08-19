const fs=require("fs");
const path=require("path");
const {execSync}=require("child_process");

console.log("\n>>> WORLDNOWXXI — R2 INTEGRACION TOTAL");

function run(cmd){console.log("\n$ "+cmd);execSync(cmd,{stdio:"inherit"});}
function ensureDir(p){fs.mkdirSync(path.dirname(p),{recursive:true});}
function write(p,s){ensureDir(p);fs.writeFileSync(p,s);console.log("written:",p);}
function read(p){return fs.existsSync(p)?fs.readFileSync(p,"utf8"):"";}

// Base: latest R2 layer.
const chain=[
  "worldnow_r2_media.cjs",
  "worldnow_auth_runtime_fix.cjs",
  "worldnow_auth_runtime.cjs"
].find(f=>fs.existsSync(f));

if(!chain){
  console.error("Missing R2/Auth launcher");
  process.exit(930);
}
run(`node "${chain}"`);

// Reusable media field that degrades gracefully if R2 is not configured.
write("components/WorldnowMediaField.js",`"use client";

import {useEffect,useState} from "react";
import R2Uploader from "./R2Uploader";

export default function WorldnowMediaField({
  purpose="post",
  label="Añadir foto o vídeo",
  onUploaded
}){
  const [status,setStatus]=useState(null);

  useEffect(()=>{
    let alive=true;
    fetch("/api/media/r2/status",{cache:"no-store"})
      .then(r=>r.json())
      .then(j=>{if(alive)setStatus(j)})
      .catch(()=>{if(alive)setStatus({configured:false})});
    return()=>{alive=false};
  },[]);

  if(status===null){
    return <div className="panel"><strong>{label}</strong><p>Comprobando almacenamiento…</p></div>;
  }

  if(!status.configured){
    return <div className="panel" style={{opacity:.86}}>
      <strong>{label}</strong>
      <p>La subida de archivos está preparada, pero el almacenamiento R2 todavía no está activado.</p>
    </div>;
  }

  return <div>
    <R2Uploader purpose={purpose} onUploaded={onUploaded}/>
  </div>;
}
`);

// Small client bridge for pages that only need to display an uploader.
// This avoids invasive rewrites of existing form logic.
write("components/WorldnowMediaPanel.js",`"use client";

import {useState} from "react";
import WorldnowMediaField from "./WorldnowMediaField";

export default function WorldnowMediaPanel({purpose="post",title="Fotos y vídeos"}){
  const [last,setLast]=useState(null);

  return <section className="panel" data-worldnow-media="1" style={{marginTop:16}}>
    <h3>{title}</h3>
    <WorldnowMediaField purpose={purpose} onUploaded={setLast}/>
    {last&&<div style={{marginTop:10}}>
      <small>Archivo preparado:</small>
      <div>{last.name}</div>
      {last.url&&<a href={last.url} target="_blank" rel="noreferrer">Ver archivo</a>}
    </div>}
  </section>;
}
`);

function addImport(src){
  if(src.includes('WorldnowMediaPanel')) return src;
  const lines=src.split("\n");
  let idx=0;
  while(idx<lines.length && (
    lines[idx].startsWith('"use client"') ||
    lines[idx].startsWith("'use client'") ||
    lines[idx].trim()===""
  )) idx++;
  lines.splice(idx,0,'import WorldnowMediaPanel from "../../components/WorldnowMediaPanel";');
  return lines.join("\n");
}

// Relative import path varies by depth.
function importFor(file){
  const rel=path.relative(path.dirname(file),"components/WorldnowMediaPanel").replaceAll("\\","/");
  return rel.startsWith(".")?rel:"./"+rel;
}

function injectPanel(file,purpose,title){
  if(!fs.existsSync(file)) return {file,status:"missing"};
  let s=read(file);
  if(s.includes('data-worldnow-media="1"') || s.includes("<WorldnowMediaPanel")) {
    return {file,status:"already"};
  }

  const imp=`import WorldnowMediaPanel from "${importFor(file)}";`;
  if(!s.includes("WorldnowMediaPanel")){
    const lines=s.split("\n");
    let i=0;
    while(i<lines.length && (
      /^\s*["']use client["'];?\s*$/.test(lines[i]) ||
      lines[i].trim()===""
    )) i++;
    lines.splice(i,0,imp);
    s=lines.join("\n");
  }

  const panel=`\n      <WorldnowMediaPanel purpose="${purpose}" title="${title}" />\n`;

  // Conservative anchors only.
  const anchors=["</Shell>","</main>","</section>"];
  let placed=false;
  for(const a of anchors){
    const pos=s.lastIndexOf(a);
    if(pos>=0){
      s=s.slice(0,pos)+panel+s.slice(pos);
      placed=true;
      break;
    }
  }
  if(!placed) return {file,status:"no_anchor"};

  fs.writeFileSync(file,s);
  return {file,status:"integrated"};
}

const targets=[
  ["app/crear/page.js","post","Fotos y vídeos de la publicación"],
  ["app/perfil/page.js","profile","Foto o vídeo del perfil"],
  ["app/comunidades/page.js","community","Multimedia de la comunidad"],
  ["app/community/page.js","community","Multimedia de la comunidad"],
  ["app/foro/page.js","community","Fotos y vídeos"],
  ["app/mascotas/pet-shop/page.js","pet-shop","Fotos del producto"],
  ["app/mapa-mundo/page.js","map-promo","Imagen de la promoción"],
  ["app/promocionar/page.js","map-promo","Imagen o vídeo promocional"]
];

const report=targets.map(t=>injectPanel(...t));

// Dedicated upload chooser route for any form that hasn't got a safe patch anchor.
write("app/subir-media/page.js",`"use client";

import {useSearchParams} from "next/navigation";
import Shell from "../../components/Shell";
import WorldnowMediaPanel from "../../components/WorldnowMediaPanel";

const allowed=new Set(["post","profile","community","pet-shop","map-promo"]);

export default function SubirMedia(){
  const sp=useSearchParams();
  const raw=sp.get("purpose")||"post";
  const purpose=allowed.has(raw)?raw:"post";

  return <Shell>
    <section className="panel" style={{maxWidth:760,margin:"34px auto"}}>
      <span className="kicker">WORLDNOWXXI MEDIA</span>
      <h1>Subir fotos y vídeos</h1>
      <p>
        Esta subida usa R2 cuando esté activado. Mientras no lo esté,
        la aplicación seguirá funcionando sin romper el formulario.
      </p>
      <WorldnowMediaPanel purpose={purpose} title="Seleccionar archivo"/>
    </section>
  </Shell>;
}
`);

// Add simple links into creator/profile/mascotas/world map only if safe exact href is absent.
function addLink(file, href, text){
  if(!fs.existsSync(file))return "missing";
  let s=read(file);
  if(s.includes(`href="${href}"`))return "already";
  const card=`\n      <a href="${href}" className="panel" style={{display:"block",marginTop:14,textDecoration:"none"}}>\n        <strong>📸 ${text}</strong>\n        <p>Fotos y vídeos mediante WORLDNOW Media.</p>\n      </a>\n`;
  for(const a of ["</Shell>","</main>"]){
    const pos=s.lastIndexOf(a);
    if(pos>=0){
      s=s.slice(0,pos)+card+s.slice(pos);
      fs.writeFileSync(file,s);
      return "linked";
    }
  }
  return "no_anchor";
}

const links=[
  ["app/crear/page.js","/subir-media?purpose=post","Añadir multimedia"],
  ["app/perfil/page.js","/subir-media?purpose=profile","Cambiar multimedia del perfil"],
  ["app/mascotas/pet-shop/page.js","/subir-media?purpose=pet-shop","Añadir fotos del producto"],
  ["app/mapa-mundo/page.js","/subir-media?purpose=map-promo","Añadir imagen promocional"]
].map(x=>[x[0],addLink(...x)]);

// Audit report.
write("WORLDNOW_R2_INTEGRATION_REPORT.txt",
`WORLDNOWXXI R2 INTEGRATION REPORT
Generated: ${new Date().toISOString()}

PANEL TARGETS
${report.map(x=>`${x.status.padEnd(12)} ${x.file}`).join("\n")}

LINK TARGETS
${links.map(x=>`${x[1].padEnd(12)} ${x[0]}`).join("\n")}

NOTE
- Existing forms were not structurally rewritten.
- R2 can remain unconfigured without breaking these pages.
- Actual persistence of uploaded media into each post/profile/community/product/campaign record
  still requires wiring each saved R2 key/url into that entity's create/update API.
`);

// Safety: no secret exposure.
for(const f of [
  "components/WorldnowMediaField.js",
  "components/WorldnowMediaPanel.js",
  "app/subir-media/page.js"
]){
  const s=read(f);
  if(/R2_SECRET_ACCESS_KEY|R2_ACCESS_KEY_ID|NEXT_PUBLIC_R2_SECRET/.test(s)){
    console.error("SECURITY GATE FAILED:",f);
    process.exit(931);
  }
}

// Dependency audit.
let raw="";
try{raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}
catch(e){raw=(e.stdout||"").toString()}
let audit={};try{audit=JSON.parse(raw||"{}")}catch{}
const total=audit.metadata?.vulnerabilities?.total||0;
console.log("Dependency vulnerabilities:",total);
if(total!==0)process.exit(932);

run("npm run build");

console.log("\n================================================");
console.log(" WORLDNOWXXI — R2 INTEGRACION SUCCESS");
console.log(" Upload UI integrated where safe");
console.log(" Graceful fallback while R2 is inactive");
console.log(" Dedicated route: /subir-media");
console.log(" No destructive form rewrites");
console.log("================================================\n");
