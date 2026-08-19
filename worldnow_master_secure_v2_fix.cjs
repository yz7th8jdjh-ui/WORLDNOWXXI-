const fs=require("fs");
const {execSync}=require("child_process");

console.log("\n>>> WORLDNOWXXI MASTER SECURE V2 FIX");

const source="worldnow_master_secure_v2.cjs";
if(!fs.existsSync(source)){
  console.error("Missing "+source);
  process.exit(501);
}

let s=fs.readFileSync(source,"utf8");

const oldBlock=`  "app/notificaciones/page.js":[
    ["const uid=getStoredUserId();setUserId(uid);","const uid=await getStoredUserId();setUserId(uid);"]
  ],`;

const newBlock=`  "app/notificaciones/page.js":[
    ["useEffect(()=>{\\n    const uid=getStoredUserId();setUserId(uid);\\n    if(uid)load(uid);else setLoading(false);\\n  },[]);",
     "useEffect(()=>{let alive=true;(async()=>{const uid=await getStoredUserId();if(!alive)return;setUserId(uid);if(uid)load(uid);else setLoading(false)})();return()=>{alive=false}},[]);"]
  ],`;

if(!s.includes(oldBlock)){
  console.error("Expected V2 notification patch block not found. Refusing unsafe rewrite.");
  process.exit(502);
}

s=s.replace(oldBlock,newBlock);
fs.writeFileSync("worldnow_master_secure_v2_runtime_fixed.cjs",s);

console.log("Notification identity migration fixed safely.");
console.log("Running corrected MASTER SECURE V2...");
execSync('node "worldnow_master_secure_v2_runtime_fixed.cjs"',{stdio:"inherit"});

console.log("\nWORLDNOWXXI MASTER SECURE V2 FIX — SUCCESS");
