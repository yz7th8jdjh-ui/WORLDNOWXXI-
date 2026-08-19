const fs=require("fs");
const path=require("path");
const {execSync}=require("child_process");

console.log("\n>>> WORLDNOWXXI — WORLDNOW MAP UNIQUE");

function run(cmd){console.log("\n$ "+cmd);execSync(cmd,{stdio:"inherit"});}
function write(file,content){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
  console.log("written:",file);
}

if(!fs.existsSync("worldnow_mascotas.cjs")){
  console.error("Missing worldnow_mascotas.cjs");
  process.exit(801);
}
run('node "worldnow_mascotas.cjs"');

let pkg={};
try{pkg=JSON.parse(fs.readFileSync("package.json","utf8"))}catch{}
if(!pkg.dependencies?.["maplibre-gl"]){
  const latest=execSync("npm view maplibre-gl version",{encoding:"utf8"}).trim();
  if(!latest){console.error("Could not resolve maplibre-gl");process.exit(802);}
  run(`npm install maplibre-gl@${latest} --legacy-peer-deps`);
}

write("app/api/world-map/feed/route.js",`export const dynamic="force-dynamic";

function num(v,min,max){
  const n=Number(v);
  return Number.isFinite(n)&&n>=min&&n<=max?n:null;
}

export async function GET(req){
  const u=new URL(req.url);
  const lat=num(u.searchParams.get("lat"),-90,90);
  const lon=num(u.searchParams.get("lon"),-180,180);

  const own=[
    {
      id:"wn-global",
      kind:"worldnow",
      title:"WORLDNOWXXI",
      subtitle:"Pulso global de la plataforma",
      lat:40.4168,lon:-3.7038,
      badge:"WORLDNOW",
      href:"/world-pulse"
    },
    {
      id:"wn-events",
      kind:"event",
      title:"Eventos WORLDNOWXXI",
      subtitle:"Descubre eventos y actividad en directo",
      lat:41.3874,lon:2.1686,
      badge:"EVENTO",
      href:"/eventos"
    },
    {
      id:"wn-news",
      kind:"news",
      title:"Actualidad",
      subtitle:"Noticias y contenido por zonas",
      lat:37.3891,lon:-5.9845,
      badge:"NOTICIAS",
      href:"/noticias"
    }
  ];

  // Demo visual de promoción hasta que Stripe + campañas + ubicación
  // estén conectados a una tabla de promociones activa.
  const promotions=[
    {
      id:"promo-demo-1",
      kind:"promotion",
      title:"Negocio promocionado",
      subtitle:"Aquí aparecerán los clientes que promocionen su negocio en WORLDNOWXXI",
      lat:40.4205,lon:-3.7055,
      badge:"PROMOCIONADO",
      href:"/negocios",
      demo:true
    }
  ];

  let nearby=[];
  if(lat!==null&&lon!==null){
    try{
      const r=await fetch(new URL(\`/api/pets/nearby?lat=\${lat}&lon=\${lon}\`,u.origin),{
        cache:"no-store",
        headers:{cookie:req.headers.get("cookie")||""}
      });
      if(r.ok){
        const j=await r.json();
        nearby=(j.items||[]).slice(0,18).map(x=>({
          id:"pet-"+x.id,
          kind:x.type==="veterinario"?"vet":x.type==="tienda"?"petshop":"dogpark",
          title:x.name,
          subtitle:x.address||(
            x.type==="veterinario"?"Veterinario":
            x.type==="tienda"?"Tienda para mascotas":"Parque canino"
          ),
          lat:x.lat,lon:x.lon,
          badge:x.type==="veterinario"?"VETERINARIO":x.type==="tienda"?"PET SHOP":"PARQUE",
          href:"/mascotas/cerca"
        }));
      }
    }catch{}
  }

  return Response.json({
    map:"WORLDNOW MAP",
    version:1,
    items:[...promotions,...own,...nearby],
    live_promotions:false,
    note:"Las promociones reales se activarán al conectar campañas pagadas y ubicación."
  },{headers:{"cache-control":"no-store"}});
}
`);

write("app/mapa-mundo/page.js",`"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import Shell from "../../components/Shell";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const FILTERS=[
  ["all","Todo"],
  ["promotion","⭐ Promocionado"],
  ["worldnow","🌐 WORLDNOW"],
  ["news","📰 Noticias"],
  ["event","🎟️ Eventos"],
  ["pet","🐾 Mascotas"]
];

const isPet=k=>["vet","petshop","dogpark"].includes(k);

export default function WorldNowMap(){
  const container=useRef(null);
  const mapRef=useRef(null);
  const markers=useRef([]);
  const [items,setItems]=useState([]);
  const [filter,setFilter]=useState("all");
  const [status,setStatus]=useState("");
  const [pos,setPos]=useState(null);
  const key=process.env.NEXT_PUBLIC_MAPTILER_KEY||"";

  const visible=useMemo(()=>items.filter(x=>{
    if(filter==="all")return true;
    if(filter==="pet")return isPet(x.kind);
    return x.kind===filter;
  }),[items,filter]);

  useEffect(()=>{
    if(!container.current||mapRef.current)return;
    const style=key
      ? \`https://api.maptiler.com/maps/streets-v2/style.json?key=\${key}\`
      : "https://demotiles.maplibre.org/style.json";

    const map=new maplibregl.Map({
      container:container.current,
      style,
      center:[-3.7038,40.4168],
      zoom:4.2,
      attributionControl:true
    });

    map.addControl(new maplibregl.NavigationControl(),"top-right");
    map.addControl(new maplibregl.FullscreenControl(),"top-right");
    mapRef.current=map;

    return()=>{map.remove();mapRef.current=null};
  },[key]);

  async function load(lat,lon){
    const q=lat!=null&&lon!=null?\`?lat=\${lat}&lon=\${lon}\`:"";
    const r=await fetch("/api/world-map/feed"+q,{cache:"no-store",credentials:"include"});
    const j=await r.json().catch(()=>({items:[]}));
    setItems(j.items||[]);
  }

  useEffect(()=>{load()},[]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    markers.current.forEach(m=>m.remove());
    markers.current=[];

    for(const item of visible){
      if(!Number.isFinite(Number(item.lat))||!Number.isFinite(Number(item.lon)))continue;
      const el=document.createElement("button");
      el.type="button";
      el.setAttribute("aria-label",item.title);
      el.style.width=item.kind==="promotion"?"42px":"34px";
      el.style.height=item.kind==="promotion"?"42px":"34px";
      el.style.borderRadius="50%";
      el.style.border="2px solid rgba(255,255,255,.95)";
      el.style.boxShadow="0 8px 22px rgba(0,0,0,.28)";
      el.style.cursor="pointer";
      el.style.fontSize=item.kind==="promotion"?"20px":"16px";
      el.style.background=item.kind==="promotion"
        ?"linear-gradient(135deg,#ffd86b,#ff9f1c)"
        :"linear-gradient(135deg,#0b7cff,#00c2ff)";
      el.textContent=item.kind==="promotion"?"★":isPet(item.kind)?"🐾":item.kind==="news"?"N":item.kind==="event"?"E":"W";

      const popup=document.createElement("div");
      popup.style.minWidth="220px";
      popup.innerHTML=\`
        <div style="font:700 11px system-ui;letter-spacing:.08em;opacity:.65">\${item.badge||""}</div>
        <div style="font:800 16px system-ui;margin-top:4px">\${item.title||""}</div>
        <div style="font:400 13px system-ui;margin-top:5px;line-height:1.35">\${item.subtitle||""}</div>
        \${item.demo?'<div style="font:700 11px system-ui;margin-top:8px">DEMO · pendiente de campañas reales</div>':""}
        <a href="\${item.href||"#"}" style="display:inline-block;margin-top:10px;font:700 13px system-ui">Ver en WORLDNOWXXI →</a>
      \`;

      const marker=new maplibregl.Marker({element:el})
        .setLngLat([Number(item.lon),Number(item.lat)])
        .setPopup(new maplibregl.Popup({offset:22}).setDOMContent(popup))
        .addTo(map);
      markers.current.push(marker);
    }
  },[visible]);

  const locate=()=>{
    if(!navigator.geolocation){
      setStatus("Tu dispositivo no permite geolocalización.");
      return;
    }
    setStatus("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(async p=>{
      const lat=p.coords.latitude,lon=p.coords.longitude;
      setPos({lat,lon});
      mapRef.current?.flyTo({center:[lon,lat],zoom:12.5,essential:true});
      await load(lat,lon);
      setStatus("Mostrando WORLDNOW cerca de ti.");
    },()=>setStatus("No se pudo acceder a tu ubicación."),{
      enableHighAccuracy:false,timeout:12000,maximumAge:300000
    });
  };

  return <Shell>
    <div className="section-title">
      <div>
        <span className="kicker">MUNDO · WORLDNOW MAP</span>
        <h1>🌍 Tu mundo. En tiempo real.</h1>
        <p>Un mapa propio de WORLDNOWXXI donde conviven promociones, actualidad, eventos y servicios de cada zona.</p>
      </div>
    </div>

    <section className="panel" style={{
      background:"linear-gradient(135deg,rgba(8,45,95,.94),rgba(10,95,110,.88))",
      border:"1px solid rgba(255,255,255,.12)"
    }}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {FILTERS.map(([id,label])=><button
          key={id}
          className="button"
          onClick={()=>setFilter(id)}
          aria-pressed={filter===id}
          style={{opacity:filter===id?1:.72}}
        >{label}</button>)}
        <button className="button" onClick={locate}>📍 Mi zona</button>
      </div>
      {status&&<p style={{marginTop:10}}>{status}</p>}
    </section>

    <section className="panel" style={{padding:0,overflow:"hidden",marginTop:16,position:"relative"}}>
      <div ref={container} style={{width:"100%",height:"70vh",minHeight:480}} />
      <div style={{
        position:"absolute",left:12,bottom:34,zIndex:5,
        background:"rgba(5,14,28,.88)",backdropFilter:"blur(10px)",
        padding:"10px 12px",borderRadius:14,maxWidth:260
      }}>
        <strong>WORLDNOW MAP</strong>
        <div style={{fontSize:12,marginTop:3,opacity:.8}}>
          {visible.length} puntos visibles · contenido WORLDNOWXXI
        </div>
      </div>
    </section>

    <div className="grid" style={{marginTop:16}}>
      <a className="panel" href="/perfil/promocionar">
        <div style={{fontSize:34}}>⭐</div>
        <h2>Promociona en el mapa</h2>
        <p>Los clientes podrán destacar su negocio o campaña directamente en su zona.</p>
      </a>
      <a className="panel" href="/mascotas">
        <div style={{fontSize:34}}>🐾</div>
        <h2>Mascotas</h2>
        <p>Parques caninos, veterinarios y Pet Shop integrados en el mundo.</p>
      </a>
      <a className="panel" href="/eventos">
        <div style={{fontSize:34}}>🎟️</div>
        <h2>Eventos</h2>
        <p>Actividad local y eventos WORLDNOWXXI sobre el mapa.</p>
      </a>
    </div>

    <section className="panel" style={{marginTop:16}}>
      <strong>Mapa único WORLDNOWXXI</strong>
      <p>La cartografía es la base. Los puntos, filtros, promociones y capas de información son la experiencia propia de WORLDNOWXXI.</p>
      {!key&&<p><strong>Modo de desarrollo:</strong> para producción a escala conectaremos un proveedor comercial de mapas.</p>}
    </section>
  </Shell>;
}
`);

const mundo="app/world-pulse/page.js";
if(!fs.existsSync(mundo)){console.error("Missing app/world-pulse/page.js");process.exit(803);}
let ms=fs.readFileSync(mundo,"utf8");

if(!ms.includes('href="/mapa-mundo"')){
  const card=`\n      <a href="/mapa-mundo" className="panel" style={{display:"block",marginTop:16,textDecoration:"none"}}>\n        <div style={{fontSize:36}}>🌍</div>\n        <h2>WORLDNOW MAP</h2>\n        <p>Promociones, actualidad, eventos y servicios sobre nuestro propio mundo interactivo.</p>\n        <strong>Entrar al mapa →</strong>\n      </a>\n`;
  const pos=ms.lastIndexOf("</Shell>");
  if(pos<0){console.error("Could not safely insert WORLDNOW MAP into Mundo");process.exit(804);}
  ms=ms.slice(0,pos)+card+ms.slice(pos);
} else {
  ms=ms.replace(/<h2>Mapa del Mundo<\/h2>/g,"<h2>WORLDNOW MAP</h2>");
  ms=ms.replace(/Explora lugares, ubicación, servicios y contenido de WORLDNOWXXI sobre un mapa interactivo\./g,
    "Promociones, actualidad, eventos y servicios sobre nuestro propio mundo interactivo.");
}
fs.writeFileSync(mundo,ms);
console.log("Mundo integration: WORLDNOW MAP");

// Compatibility for map workers/network under existing security middleware.
for(const file of ["middleware.js","proxy.js"]){
  if(!fs.existsSync(file))continue;
  let s=fs.readFileSync(file,"utf8");
  s=s.replace(/worker-src 'self'/g,"worker-src 'self' blob:");
  s=s.replace(/child-src 'self'/g,"child-src 'self' blob:");
  s=s.replace(/img-src 'self'/g,"img-src 'self' data: blob: https:");
  s=s.replace(/connect-src 'self'/g,"connect-src 'self' https:");
  fs.writeFileSync(file,s);
}

let raw="";
try{raw=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}
catch(e){raw=(e.stdout||"").toString()}
let audit={};try{audit=JSON.parse(raw||"{}")}catch{}
const total=audit.metadata?.vulnerabilities?.total||0;
console.log("Dependency vulnerabilities:",total);
if(total!==0)process.exit(805);

run("npm run build");

console.log("\n================================================");
console.log(" WORLDNOWXXI — WORLDNOW MAP SUCCESS");
console.log(" Unique WORLDNOW map experience: ready");
console.log(" Promotions layer: UI/feed architecture ready");
console.log(" WORLDNOW data layers: ready");
console.log(" Nearby pet services: connected");
console.log(" Real paid promotion activation: pending Stripe/campaign DB wiring");
console.log("================================================\n");
