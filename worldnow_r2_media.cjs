const fs=require("fs");
const path=require("path");
const {execSync}=require("child_process");

console.log("\n>>> WORLDNOWXXI — R2 MEDIA");

function run(cmd){console.log("\n$ "+cmd);execSync(cmd,{stdio:"inherit"});}
function write(file,content){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
  console.log("written:",file);
}

// Chain from latest deployed auth-runtime layer.
const chain=[
  "worldnow_auth_runtime_fix.cjs",
  "worldnow_auth_runtime.cjs",
  "worldnow_menores_auto.cjs",
  "worldnow_worldnow_map_fix.cjs",
  "worldnow_master_secure_v2_fixed2.cjs"
].find(f=>fs.existsSync(f));

if(chain) run(`node "${chain}"`);
else{
  console.error("No known WORLDNOWXXI launcher found");
  process.exit(920);
}

// Use Cloudflare-friendly SigV4 signer.
let pkg={};
try{pkg=JSON.parse(fs.readFileSync("package.json","utf8"))}catch{}
const hasAws4=Boolean(pkg.dependencies?.aws4fetch||pkg.devDependencies?.aws4fetch);
if(!hasAws4){
  run("npm install aws4fetch --legacy-peer-deps");
}

// Shared R2 config helper.
write("lib/r2-config.js",`export function getR2Config(){
  const accountId=process.env.R2_ACCOUNT_ID||"";
  const accessKeyId=process.env.R2_ACCESS_KEY_ID||"";
  const secretAccessKey=process.env.R2_SECRET_ACCESS_KEY||"";
  const bucket=process.env.R2_BUCKET||"";
  const publicUrl=(process.env.R2_PUBLIC_URL||"").replace(/\\/$/,"");

  return {
    accountId,accessKeyId,secretAccessKey,bucket,publicUrl,
    configured:Boolean(accountId&&accessKeyId&&secretAccessKey&&bucket)
  };
}
`);

// Status route.
write("app/api/media/r2/status/route.js",`import {getR2Config} from "../../../../../lib/r2-config";

export const dynamic="force-dynamic";

export async function GET(){
  const c=getR2Config();
  return Response.json({
    configured:c.configured,
    bucket_configured:Boolean(c.bucket),
    public_delivery_configured:Boolean(c.publicUrl),
    direct_upload:true,
    max_bytes:50*1024*1024,
    accepted:["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm"]
  },{headers:{"cache-control":"no-store"}});
}
`);

// Sign upload only for authenticated users.
// Browser uploads straight to R2; secret keys never reach the client.
write("app/api/media/r2/sign-upload/route.js",`import {AwsClient} from "aws4fetch";
import {getCurrentProfile} from "../../../../../lib/server-auth";
import {getR2Config} from "../../../../../lib/r2-config";

export const dynamic="force-dynamic";

const MAX=50*1024*1024;
const ALLOWED=new Set([
  "image/jpeg","image/png","image/webp","image/gif",
  "video/mp4","video/webm"
]);

function extFor(type){
  return ({
    "image/jpeg":"jpg",
    "image/png":"png",
    "image/webp":"webp",
    "image/gif":"gif",
    "video/mp4":"mp4",
    "video/webm":"webm"
  })[type]||"bin";
}

function safePurpose(v){
  const p=String(v||"post").toLowerCase();
  return ["post","profile","community","pet-shop","map-promo"].includes(p)?p:"post";
}

export async function POST(req){
  const me=await getCurrentProfile();
  if(!me.authenticated||!me.profile){
    return Response.json({error:"Authentication required"},{status:401});
  }

  const c=getR2Config();
  if(!c.configured){
    return Response.json({
      error:"R2 not configured",
      code:"r2_not_configured"
    },{status:503});
  }

  const body=await req.json().catch(()=>({}));
  const contentType=String(body.content_type||"").toLowerCase();
  const size=Number(body.size||0);
  const purpose=safePurpose(body.purpose);

  if(!ALLOWED.has(contentType)){
    return Response.json({error:"File type not allowed"},{status:400});
  }
  if(!Number.isFinite(size)||size<=0||size>MAX){
    return Response.json({error:"File too large or invalid size"},{status:400});
  }

  const uid=String(me.profile.id);
  const rand=crypto.randomUUID().replaceAll("-","");
  const key=\`users/\${uid}/\${purpose}/\${Date.now()}-\${rand}.\${extFor(contentType)}\`;

  const signer=new AwsClient({
    service:"s3",
    region:"auto",
    accessKeyId:c.accessKeyId,
    secretAccessKey:c.secretAccessKey
  });

  const endpoint=new URL(
    \`https://\${c.accountId}.r2.cloudflarestorage.com/\${encodeURIComponent(c.bucket)}/\${key.split("/").map(encodeURIComponent).join("/")}\`
  );
  endpoint.searchParams.set("X-Amz-Expires","300");

  const signed=await signer.sign(
    new Request(endpoint,{
      method:"PUT",
      headers:{"Content-Type":contentType}
    }),
    {aws:{signQuery:true}}
  );

  return Response.json({
    upload_url:signed.url.toString(),
    method:"PUT",
    headers:{"Content-Type":contentType},
    key,
    public_url:c.publicUrl?c.publicUrl+"/"+key:null,
    expires_in:300
  },{headers:{"cache-control":"no-store"}});
}
`);

// Lightweight client uploader component.
write("components/R2Uploader.js",`"use client";

import {useState} from "react";

export default function R2Uploader({purpose="post",onUploaded}){
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");

  async function choose(e){
    const file=e.target.files?.[0];
    if(!file)return;
    setBusy(true);setMsg("");

    try{
      const sign=await fetch("/api/media/r2/sign-upload",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          content_type:file.type,
          size:file.size,
          purpose
        })
      });

      const info=await sign.json().catch(()=>({}));
      if(!sign.ok)throw new Error(info.error||"No se pudo preparar la subida.");

      const put=await fetch(info.upload_url,{
        method:"PUT",
        headers:info.headers,
        body:file
      });

      if(!put.ok)throw new Error("R2 rechazó la subida.");

      const result={
        key:info.key,
        url:info.public_url,
        type:file.type,
        size:file.size,
        name:file.name
      };

      setMsg("✅ Archivo subido correctamente.");
      onUploaded?.(result);
    }catch(err){
      setMsg("❌ "+String(err.message||err));
    }finally{
      setBusy(false);
      e.target.value="";
    }
  }

  return <div className="panel" style={{display:"grid",gap:10}}>
    <strong>Fotos y vídeos</strong>
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
      onChange={choose}
      disabled={busy}
    />
    <small>Máximo 50 MB. JPG, PNG, WebP, GIF, MP4 o WebM.</small>
    {busy&&<p>Subiendo…</p>}
    {msg&&<p role="status">{msg}</p>}
  </div>;
}
`);

// Test/diagnostic page.
write("app/media-r2/page.js",`"use client";

import {useEffect,useState} from "react";
import Shell from "../../components/Shell";
import R2Uploader from "../../components/R2Uploader";

export default function MediaR2(){
  const [status,setStatus]=useState(null);
  const [last,setLast]=useState(null);

  useEffect(()=>{
    fetch("/api/media/r2/status",{cache:"no-store"})
      .then(r=>r.json())
      .then(setStatus)
      .catch(()=>setStatus({configured:false}));
  },[]);

  return <Shell>
    <section className="panel" style={{maxWidth:760,margin:"34px auto"}}>
      <span className="kicker">WORLDNOWXXI MEDIA</span>
      <h1>R2 · Fotos y vídeos</h1>

      <div className="panel" style={{marginBottom:16}}>
        <strong>Estado</strong>
        <p>{status?.configured?"✅ R2 configurado":"⚠️ Falta configurar R2 en Cloudflare"}</p>
        {status?.configured&&!status?.public_delivery_configured&&
          <p>La subida puede funcionar, pero falta configurar la URL pública para mostrar los archivos directamente.</p>}
      </div>

      <R2Uploader purpose="post" onUploaded={setLast}/>

      {last&&<div className="panel" style={{marginTop:16}}>
        <strong>Última subida</strong>
        <p>{last.name}</p>
        <p>Clave: {last.key}</p>
        {last.url&&<a href={last.url} target="_blank" rel="noreferrer">Abrir archivo</a>}
      </div>}
    </section>
  </Shell>;
}
`);

// Provide the exact R2 CORS policy template needed for direct browser PUT.
// User must substitute the production origin if it changes.
write("R2_CORS_WORLDNOWXXI.json",JSON.stringify([
  {
    "AllowedOrigins":[
      "https://worldnowxxi.wm92w8yzdr.workers.dev"
    ],
    "AllowedMethods":["GET","HEAD","PUT"],
    "AllowedHeaders":["Content-Type"],
    "ExposeHeaders":["ETag"],
    "MaxAgeSeconds":3600
  }
],null,2)+"\n");

// Static security scan: secret names must not appear in NEXT_PUBLIC form.
for(const f of ["app/api/media/r2/sign-upload/route.js","lib/r2-config.js"]){
  const s=fs.readFileSync(f,"utf8");
  if(/NEXT_PUBLIC_R2_(SECRET|ACCESS|ACCOUNT|BUCKET)/.test(s)){
    console.error("SECURITY GATE FAILED: R2 secret/config exposed as NEXT_PUBLIC");
    process.exit(921);
  }
}

// Dependency audit.
let raw="";
try{raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}
catch(e){raw=(e.stdout||"").toString()}
let audit={};try{audit=JSON.parse(raw||"{}")}catch{}
const total=audit.metadata?.vulnerabilities?.total||0;
console.log("Dependency vulnerabilities:",total);
if(total!==0)process.exit(922);

run("npm run build");

console.log("\n================================================");
console.log(" WORLDNOWXXI — R2 MEDIA SUCCESS");
console.log(" Direct signed uploads: ready");
console.log(" Server-side auth required: yes");
console.log(" Max file size: 50 MB");
console.log(" R2 secret exposure gate: passed");
console.log(" Diagnostic page: /media-r2");
console.log(" Runtime activation still requires R2 variables + bucket CORS");
console.log("================================================\n");
