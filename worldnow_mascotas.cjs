const fs=require("fs");
const path=require("path");
const {execSync}=require("child_process");

console.log("\n>>> WORLDNOWXXI — MUNDO / MASCOTAS");

function run(cmd){console.log("\n$ "+cmd);execSync(cmd,{stdio:"inherit"});}
function write(file,content){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
  console.log("written:",file);
}

if(!fs.existsSync("worldnow_master_secure_v2_fixed2.cjs")){
  console.error("Missing worldnow_master_secure_v2_fixed2.cjs");
  process.exit(601);
}
run('node "worldnow_master_secure_v2_fixed2.cjs"');

write("app/api/pets/nearby/route.js",`export const dynamic="force-dynamic";

function n(v,min,max){const x=Number(v);return Number.isFinite(x)&&x>=min&&x<=max?x:null}

export async function GET(req){
  const u=new URL(req.url);
  const lat=n(u.searchParams.get("lat"),-90,90);
  const lon=n(u.searchParams.get("lon"),-180,180);
  if(lat===null||lon===null){
    return Response.json({error:"invalid_location"},{status:400});
  }

  const q=\`[out:json][timeout:20];
(
  nwr(around:7000,\${lat},\${lon})["amenity"="veterinary"];
  nwr(around:7000,\${lat},\${lon})["shop"="pet"];
  nwr(around:7000,\${lat},\${lon})["leisure"="dog_park"];
);
out center tags;\`;

  try{
    const r=await fetch("https://overpass-api.de/api/interpreter",{
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},
      body:"data="+encodeURIComponent(q),
      cache:"no-store"
    });
    if(!r.ok) throw new Error("provider_"+r.status);
    const j=await r.json();
    const items=(j.elements||[]).map((e)=>{
      const t=e.tags||{};
      const type=t.amenity==="veterinary"?"veterinario":t.shop==="pet"?"tienda":t.leisure==="dog_park"?"parque":"otro";
      const plat=e.lat??e.center?.lat;
      const plon=e.lon??e.center?.lon;
      return {
        id:String(e.type)+"-"+String(e.id),
        type,
        name:t.name||(
          type==="veterinario"?"Veterinario":
          type==="tienda"?"Tienda para mascotas":
          "Parque canino"
        ),
        lat:plat,lon:plon,
        address:[t["addr:street"],t["addr:housenumber"],t["addr:city"]].filter(Boolean).join(" "),
        phone:t.phone||t["contact:phone"]||"",
        website:t.website||t["contact:website"]||""
      };
    }).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon));

    return Response.json({items},{headers:{"cache-control":"no-store"}});
  }catch(e){
    return Response.json({error:"nearby_unavailable",items:[]},{status:502});
  }
}
`);

write("app/mascotas/page.js",`import Link from "next/link";
import Shell from "../../components/Shell";

export default function Mascotas(){
  return <Shell>
    <div className="section-title">
      <div>
        <span className="kicker">MUNDO · MASCOTAS</span>
        <h1>Tu mascota, también en WORLDNOWXXI</h1>
        <p>Productos, cuidados y lugares útiles cerca de ti.</p>
      </div>
    </div>

    <div className="grid">
      <Link className="panel" href="/mascotas/pet-shop">
        <div style={{fontSize:42}}>🐾</div>
        <h2>Pet Shop</h2>
        <p>Productos, comida, accesorios, juguetes, higiene y cuidado para mascotas.</p>
        <strong>Entrar →</strong>
      </Link>

      <Link className="panel" href="/mascotas/cerca">
        <div style={{fontSize:42}}>📍</div>
        <h2>Cerca de ti</h2>
        <p>Parques caninos, veterinarios y tiendas para mascotas según tu ubicación.</p>
        <strong>Ver lugares →</strong>
      </Link>
    </div>

    <section className="panel" style={{marginTop:16}}>
      <strong>Protección animal</strong>
      <p>Pet Shop está destinado únicamente a productos y servicios. No se permite la compraventa de animales.</p>
    </section>
  </Shell>;
}
`);

write("app/mascotas/pet-shop/page.js",`"use client";
import {useMemo,useState} from "react";
import Shell from "../../../components/Shell";

const cats=["Todos","Alimentación","Juguetes","Paseo","Descanso","Higiene","Transporte"];

export default function PetShop(){
  const [cat,setCat]=useState("Todos");
  const [q,setQ]=useState("");
  const demo=[
    {name:"Arnés cómodo",cat:"Paseo",price:"—"},
    {name:"Cama acolchada",cat:"Descanso",price:"—"},
    {name:"Juguete interactivo",cat:"Juguetes",price:"—"},
    {name:"Transportín",cat:"Transporte",price:"—"}
  ];
  const shown=useMemo(()=>demo.filter(x=>(cat==="Todos"||x.cat===cat)&&x.name.toLowerCase().includes(q.toLowerCase())),[cat,q]);

  return <Shell>
    <div className="section-title">
      <div><span className="kicker">MASCOTAS</span><h1>🐾 Pet Shop</h1><p>Espacio dedicado exclusivamente a productos y servicios para mascotas.</p></div>
    </div>

    <section className="panel">
      <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar productos..." />
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
        {cats.map(x=><button key={x} className="button" onClick={()=>setCat(x)}>{x}</button>)}
      </div>
    </section>

    <div className="grid" style={{marginTop:16}}>
      {shown.map((x,i)=><article className="panel" key={i}>
        <div style={{fontSize:34}}>🛍️</div>
        <h3>{x.name}</h3>
        <p>{x.cat}</p>
        <strong>{x.price}</strong>
      </article>)}
    </div>

    <section className="panel" style={{marginTop:16}}>
      <h2>Publicar un producto</h2>
      <p>La interfaz del marketplace queda preparada. La publicación y cobro real se activarán cuando conectemos almacenamiento y pagos definitivos.</p>
      <p><strong>No se permite vender animales.</strong></p>
    </section>
  </Shell>;
}
`);

write("app/mascotas/cerca/page.js",`"use client";
import {useState} from "react";
import Shell from "../../../components/Shell";

function dist(a,b,c,d){
  const R=6371,rad=x=>x*Math.PI/180;
  const x=rad(c-a),y=rad(d-b);
  const h=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

export default function CercaMascotas(){
  const [state,setState]=useState({loading:false,error:"",items:[],pos:null});

  const locate=()=>{
    if(!navigator.geolocation){
      setState(s=>({...s,error:"Tu dispositivo no permite geolocalización."}));return;
    }
    setState({loading:true,error:"",items:[],pos:null});
    navigator.geolocation.getCurrentPosition(async p=>{
      const lat=p.coords.latitude,lon=p.coords.longitude;
      try{
        const r=await fetch(\`/api/pets/nearby?lat=\${lat}&lon=\${lon}\`,{cache:"no-store"});
        const j=await r.json();
        if(!r.ok)throw new Error();
        const items=(j.items||[]).map(x=>({...x,distance:dist(lat,lon,x.lat,x.lon)})).sort((a,b)=>a.distance-b.distance);
        setState({loading:false,error:"",items,pos:{lat,lon}});
      }catch{
        setState({loading:false,error:"No se pudieron cargar los lugares cercanos ahora mismo.",items:[],pos:{lat,lon}});
      }
    },()=>setState({loading:false,error:"Necesitamos permiso de ubicación para mostrar lugares cercanos.",items:[],pos:null}),{
      enableHighAccuracy:false,timeout:12000,maximumAge:300000
    });
  };

  const icon=t=>t==="veterinario"?"🏥":t==="tienda"?"🛍️":"🌳";

  return <Shell>
    <div className="section-title"><div><span className="kicker">MASCOTAS</span><h1>📍 Cerca de ti</h1><p>Encuentra servicios útiles para tu mascota alrededor de tu ubicación.</p></div></div>

    <section className="panel">
      <button className="button" onClick={locate} disabled={state.loading}>
        {state.loading?"Buscando…":"Usar mi ubicación"}
      </button>
      <p style={{marginTop:10}}>La ubicación se usa para esta búsqueda y no se muestra públicamente.</p>
      {state.error&&<p><strong>{state.error}</strong></p>}
    </section>

    <div className="grid" style={{marginTop:16}}>
      {state.items.slice(0,30).map(x=><article className="panel" key={x.id}>
        <div style={{fontSize:32}}>{icon(x.type)}</div>
        <h3>{x.name}</h3>
        <p>{x.type==="veterinario"?"Veterinario":x.type==="tienda"?"Tienda para mascotas":"Parque canino"} · {x.distance.toFixed(1)} km</p>
        {x.address&&<p>{x.address}</p>}
        <a className="button" target="_blank" rel="noreferrer" href={\`https://www.google.com/maps/search/?api=1&query=\${x.lat},\${x.lon}\`}>Cómo llegar</a>
      </article>)}
    </div>
  </Shell>;
}
`);

// Add Mascotas visibly inside Mundo/World Pulse without replacing that page.
const mundo="app/world-pulse/page.js";
if(!fs.existsSync(mundo)){
  console.error("Missing app/world-pulse/page.js");
  process.exit(602);
}
let ms=fs.readFileSync(mundo,"utf8");
if(!ms.includes('href="/mascotas"')){
  const card=`\n      <a href="/mascotas" className="panel" style={{display:"block",marginTop:16,textDecoration:"none"}}>\n        <div style={{fontSize:36}}>🐾</div>\n        <h2>Mascotas</h2>\n        <p>Pet Shop, parques caninos, veterinarios y tiendas cerca de ti.</p>\n        <strong>Explorar →</strong>\n      </a>\n`;
  const pos=ms.lastIndexOf("</Shell>");
  if(pos<0){
    console.error("Could not safely insert Mascotas into Mundo.");
    process.exit(603);
  }
  ms=ms.slice(0,pos)+card+ms.slice(pos);
  fs.writeFileSync(mundo,ms);
  console.log("Mundo card added: Mascotas");
}

let audit="";
try{audit=execSync("npm audit --json",{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}
catch(e){audit=(e.stdout||"").toString()}
let aj={};try{aj=JSON.parse(audit||"{}")}catch{}
const total=aj.metadata?.vulnerabilities?.total||0;
console.log("Dependency vulnerabilities:",total);
if(total!==0)process.exit(604);

run("npm run build");

console.log("\nWORLDNOWXXI MASCOTAS — SUCCESS");
console.log("Routes: /mascotas · /mascotas/pet-shop · /mascotas/cerca");
console.log("Mundo integration: ready");
console.log("Nearby: dog parks + vets + pet shops");
console.log("Animal sales: explicitly prohibited");
