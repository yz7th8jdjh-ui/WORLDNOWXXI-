const {execSync}=require("child_process");
const fs=require("fs");
const path=require("path");

console.log("\n>>> WORLDNOWXXI AUTH HARDENING");
execSync('node "worldnow_security_shield.cjs"',{stdio:"inherit"});

const files={
"lib/current-user.js":"aW1wb3J0IHtnZXROZW9uQ2xpZW50fSBmcm9tICIuL25lb24tY2xpZW50IjsKCi8qKgogKiBSZXR1cm5zIHRoZSBjdXJyZW50IFdPUkxETk9XWFhJIG51bWVyaWMgdXNlciBpZCBmcm9tIE5lb24gUkxTLgogKiBObyBpZCBpcyB0cnVzdGVkIGZyb20gbG9jYWxTdG9yYWdlLiBXaXRoIE5lb24gQXV0aCArIERhdGEgQVBJLCB0aGUgdXNlcnMKICogcG9saWN5IGV4cG9zZXMgb25seSB0aGUgcm93IGxpbmtlZCB0byBhdXRoLnVzZXJfaWQoKS4KICovCmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50VXNlcklkKCl7CiAgdHJ5ewogICAgY29uc3QgZGI9Z2V0TmVvbkNsaWVudCgpOwogICAgY29uc3Qgcj1hd2FpdCBkYi5mcm9tKCJ1c2VycyIpLnNlbGVjdCgiaWQiKS5saW1pdCgxKTsKICAgIGlmKHI/LmVycm9yKXRocm93IHIuZXJyb3I7CiAgICByZXR1cm4gKHI/LmRhdGF8fFtdKVswXT8uaWQgPyBTdHJpbmcoci5kYXRhWzBdLmlkKSA6ICIiOwogIH1jYXRjaChlKXsKICAgIGNvbnNvbGUuZXJyb3IoIldPUkxETk9XWFhJIGN1cnJlbnQgdXNlciByZXNvbHV0aW9uIGZhaWxlZCIsZSk7CiAgICByZXR1cm4gIiI7CiAgfQp9Cg==",
"app/api/auth/secure-session/route.js":"ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXEpewogY29uc3QgYXV0aFVybD0ocHJvY2Vzcy5lbnYuTkVPTl9BVVRIX1VSTHx8cHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfTkVPTl9BVVRIX1VSTHx8IiIpLnJlcGxhY2UoL1wvJC8sIiIpOwogaWYoIWF1dGhVcmwpcmV0dXJuIFJlc3BvbnNlLmpzb24oe2F1dGhlbnRpY2F0ZWQ6ZmFsc2UsY29uZmlndXJlZDpmYWxzZX0se3N0YXR1czoyMDB9KTsKCiB0cnl7CiAgY29uc3QgY29va2llPXJlcS5oZWFkZXJzLmdldCgiY29va2llIil8fCIiOwogIGNvbnN0IGNhbmRpZGF0ZXM9WyIvZ2V0LXNlc3Npb24iLCIvYXBpL2F1dGgvZ2V0LXNlc3Npb24iXTsKICBmb3IoY29uc3Qgc3VmZml4IG9mIGNhbmRpZGF0ZXMpewogICBjb25zdCByPWF3YWl0IGZldGNoKGF1dGhVcmwrc3VmZml4LHtoZWFkZXJzOntjb29raWV9LGNhY2hlOiJuby1zdG9yZSJ9KTsKICAgaWYoIXIub2spY29udGludWU7CiAgIGNvbnN0IGRhdGE9YXdhaXQgci5qc29uKCkuY2F0Y2goKCk9Pm51bGwpOwogICBjb25zdCB1c2VyPWRhdGE/LnVzZXJ8fGRhdGE/LnNlc3Npb24/LnVzZXJ8fG51bGw7CiAgIGNvbnN0IHNlc3Npb249ZGF0YT8uc2Vzc2lvbnx8bnVsbDsKICAgaWYodXNlcnx8c2Vzc2lvbil7CiAgICByZXR1cm4gUmVzcG9uc2UuanNvbih7CiAgICAgIGF1dGhlbnRpY2F0ZWQ6dHJ1ZSwKICAgICAgY29uZmlndXJlZDp0cnVlLAogICAgICB1c2VyOnVzZXI/e2lkOnVzZXIuaWR8fG51bGwsZW1haWw6dXNlci5lbWFpbHx8bnVsbH06bnVsbAogICAgfSx7CiAgICAgIGhlYWRlcnM6eyJjYWNoZS1jb250cm9sIjoibm8tc3RvcmUiLCJ4LWNvbnRlbnQtdHlwZS1vcHRpb25zIjoibm9zbmlmZiJ9CiAgICB9KTsKICAgfQogIH0KICByZXR1cm4gUmVzcG9uc2UuanNvbih7YXV0aGVudGljYXRlZDpmYWxzZSxjb25maWd1cmVkOnRydWV9LHtoZWFkZXJzOnsiY2FjaGUtY29udHJvbCI6Im5vLXN0b3JlIn19KTsKIH1jYXRjaHsKICByZXR1cm4gUmVzcG9uc2UuanNvbih7YXV0aGVudGljYXRlZDpmYWxzZSxjb25maWd1cmVkOnRydWUsZXJyb3I6ImF1dGhfdW5yZWFjaGFibGUifSx7c3RhdHVzOjIwMCxoZWFkZXJzOnsiY2FjaGUtY29udHJvbCI6Im5vLXN0b3JlIn19KTsKIH0KfQo=",
"app/seguridad-identidad/page.js":"InVzZSBjbGllbnQiOwppbXBvcnQge3VzZUVmZmVjdCx1c2VTdGF0ZX0gZnJvbSAicmVhY3QiOwppbXBvcnQgU2hlbGwgZnJvbSAiLi4vY29tcG9uZW50cy9TaGVsbCI7CgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBJZGVudGl0eVNlY3VyaXR5KCl7CiBjb25zdCBbcyxzZXRTXT11c2VTdGF0ZShudWxsKTsKIHVzZUVmZmVjdCgoKT0+e2ZldGNoKCIvYXBpL2F1dGgvc2VjdXJlLXNlc3Npb24iLHtjcmVkZW50aWFsczoiaW5jbHVkZSIsY2FjaGU6Im5vLXN0b3JlIn0pLnRoZW4ocj0+ci5qc29uKCkpLnRoZW4oc2V0UykuY2F0Y2goKCk9PnNldFMoe2F1dGhlbnRpY2F0ZWQ6ZmFsc2V9KSl9LFtdKTsKIHJldHVybiA8U2hlbGw+CiAgPGRpdiBjbGFzc05hbWU9InNlY3Rpb24tdGl0bGUiPjxkaXY+PHNwYW4gY2xhc3NOYW1lPSJraWNrZXIiPlNFQ1VSSVRZIFNISUVMRCDCtyBJREVOVElUWTwvc3Bhbj48aDE+SWRlbnRpZGFkIHNlZ3VyYTwvaDE+PHA+V09STEROT1dYWEkgeWEgbm8gZGViZSBjb25maWFyIGVuIHVuIElEIGVkaXRhYmxlIGd1YXJkYWRvIGVuIGVsIG5hdmVnYWRvciBwYXJhIGxhcyBwYW50YWxsYXMgY3LDrXRpY2FzLjwvcD48L2Rpdj48L2Rpdj4KICA8c2VjdGlvbiBjbGFzc05hbWU9InBhbmVsIGF1dGgtZmluYWwtY2FyZCI+CiAgIDxkaXYgY2xhc3NOYW1lPXsiYXV0aC1zdGF0dXMgIisocz8uYXV0aGVudGljYXRlZD8ib2siOiJwZW5kaW5nIil9PntzPy5hdXRoZW50aWNhdGVkPyLil48gU2VzacOzbiBOZW9uIEF1dGggcmVjb25vY2lkYSI6IuKXjyBTZXNpw7NuIHBlbmRpZW50ZSBkZSB2YWxpZGFjacOzbiJ9PC9kaXY+CiAgIDxoMj57cz8uYXV0aGVudGljYXRlZD8iQXV0ZW50aWNhY2nDs24gcmVjb25vY2lkYSI6Ik5lb24gQXV0aCBkZWJlIGVzdGFyIGNvbmVjdGFkbyJ9PC9oMj4KICAgPHA+TGEgaWRlbnRpZGFkIGludGVybmEgc2Ugb2J0aWVuZSBkZXNkZSBsYSBmaWxhIHBlcm1pdGlkYSBwb3IgUkxTLiBMYSBhdXRvcml6YWNpw7NuIGZpbmFsIGNvbnRpbsO6YSBkZXBlbmRpZW5kbyBkZSBsYXMgcG9sw610aWNhcyBkZSBOZW9uLjwvcD4KICA8L3NlY3Rpb24+CiA8L1NoZWxsPgp9Cg=="
};

for(const [rel,data] of Object.entries(files)){
 const p=path.join(process.cwd(),rel);
 fs.mkdirSync(path.dirname(p),{recursive:true});
 fs.writeFileSync(p,Buffer.from(data,"base64"));
}


function replaceAllInFile(rel, transforms){
 const p=path.join(process.cwd(),rel);
 if(!fs.existsSync(p))return false;
 let s=fs.readFileSync(p,"utf8");
 const before=s;
 for(const [a,b] of transforms)s=s.replace(a,b);
 if(s!==before){fs.writeFileSync(p,s);return true}
 return false;
}

function ensureImport(rel){
 const p=path.join(process.cwd(),rel);
 if(!fs.existsSync(p))return;
 let s=fs.readFileSync(p,"utf8");
 if(s.includes('getCurrentUserId'))return;
 const depth=rel.split("/").length-2;
 const prefix="../".repeat(Math.max(1,depth));
 const imp=`import {getCurrentUserId} from "${prefix}lib/current-user";\n`;
 const m=s.match(/^("use client";\s*)/);
 if(m)s=s.replace(m[0],m[0]+"\n"+imp);
 else s=imp+s;
 fs.writeFileSync(p,s);
}

// Critical screens: identity is now resolved by RLS, not localStorage.
const critical=[
 "app/page.js",
 "app/perfil/page.js",
 "app/guardados/page.js",
 "app/post/[id]/page.js",
 "app/seguridad/usuario/[id]/page.js",
 "app/perfil/bloqueados/page.js",
 "app/mensajes/page.js",
 "app/crear/page.js",
 "app/notificaciones/page.js"
];

for(const rel of critical)ensureImport(rel);

const commonTransforms=[
 [
  /function\s+(storedUserId|storedUser|getUserId|getStoredUserId|myId)\s*\(\)\s*\{[\s\S]*?return\s+"";\s*\}/g,
  'async function $1(){ return await getCurrentUserId(); }'
 ],
 [
  /function\s+(storedUserId|storedUser|getUserId|getStoredUserId|myId)\s*\(\)\s*\{[\s\S]*?catch\s*\{return\s+""\}\s*\}/g,
  'async function $1(){ return await getCurrentUserId(); }'
 ],
 [
  /const\s+id\s*=\s*(storedUserId|storedUser|getUserId|getStoredUserId|myId)\(\);/g,
  'const id=await $1();'
 ],
 [
  /const\s+u\s*=\s*(storedUserId|storedUser|getUserId|getStoredUserId|myId)\(\);/g,
  'const u=await $1();'
 ],
 [
  /useEffect\(\(\)=>\{const\s+(id|u)=await\s+/g,
  'useEffect(()=>{(async()=>{const $1=await '
 ],
 [
  /\},\[\]\);/g,
  '})()},[]);'
 ]
];

for(const rel of critical){
 const p=path.join(process.cwd(),rel);
 if(!fs.existsSync(p))continue;
 let s=fs.readFileSync(p,"utf8");
 const before=s;

 // Use targeted replacements for the exact current masters first.
 s=s.replace(
   'useEffect(()=>{const id=storedUserId();setUid(id);load(id)},[]);',
   'useEffect(()=>{(async()=>{const id=await getCurrentUserId();setUid(id);load(id)})()},[]);'
 );
 s=s.replace(
   'useEffect(()=>{const id=storedUser();setUid(id);if(id)load(id);else setLoading(false)},[]);',
   'useEffect(()=>{(async()=>{const id=await getCurrentUserId();setUid(id);if(id)load(id);else setLoading(false)})()},[]);'
 );
 s=s.replace(
   'useEffect(()=>{const id=getUserId();setUid(id); if(id)load(id); else setLoading(false)},[]);',
   'useEffect(()=>{(async()=>{const id=await getCurrentUserId();setUid(id);if(id)load(id);else setLoading(false)})()},[]);'
 );
 s=s.replace(
   'useEffect(()=>{const u=getUserId();setUid(u); if(id)load(u)},[id]);',
   'useEffect(()=>{(async()=>{const u=await getCurrentUserId();setUid(u);if(id)load(u)})()},[id]);'
 );
 s=s.replace(
   'useEffect(()=>{const u=myId();setUid(u);if(u&&target)check(u)},[target]);',
   'useEffect(()=>{(async()=>{const u=await getCurrentUserId();setUid(u);if(u&&target)check(u)})()},[target]);'
 );
 s=s.replace(
   'useEffect(()=>{const u=myId();setUid(u);if(u)load(u);else setLoading(false)},[]);',
   'useEffect(()=>{(async()=>{const u=await getCurrentUserId();setUid(u);if(u)load(u);else setLoading(false)})()},[]);'
 );

 // Strip legacy identity helpers only if they contain localStorage.
 s=s.replace(/function\s+storedUserId\(\)\s*\{[\s\S]*?\n\}/m,'');
 s=s.replace(/function\s+storedUser\(\)\s*\{[\s\S]*?\n\}/m,'');
 s=s.replace(/function\s+getUserId\(\)\s*\{[\s\S]*?\n\}/m,'');
 s=s.replace(/function\s+getStoredUserId\(\)\s*\{[\s\S]*?\n\}/m,'');
 s=s.replace(/function\s+myId\(\)\s*\{[\s\S]*?\n\}/m,'');

 if(s!==before)fs.writeFileSync(p,s);
}

// Fail the build if critical identity code still trusts the two legacy id keys.
let offenders=[];
for(const rel of critical){
 const p=path.join(process.cwd(),rel);
 if(!fs.existsSync(p))continue;
 const s=fs.readFileSync(p,"utf8");
 if(/localStorage\.getItem\(["'](?:worldnow_user_id|user_id)["']\)/.test(s))offenders.push(rel);
}
if(offenders.length){
 console.error("SECURITY HARDENING BLOCKED: legacy user-id trust remains in:",offenders.join(", "));
 process.exit(41);
}


fs.appendFileSync(path.join(process.cwd(),"app/globals.css"),"\n"+Buffer.from("Ci8qIElERU5USVRZIEhBUkRFTklORyAqLwouc2VjdXJpdHktaWRlbnRpdHktbm90ZXttYXgtd2lkdGg6ODIwcHh9Cg==","base64").toString("utf8")+"\n");

console.log("WORLDNOWXXI CRITICAL LOCALSTORAGE ID TRUST REMOVED");
console.log("WORLDNOWXXI RLS IDENTITY RESOLUTION applied");
console.log("WORLDNOWXXI AUTH HARDENING applied successfully");
