const fs=require("fs");
const {execSync}=require("child_process");

console.log("\n>>> WORLDNOWXXI — KEEP VARS FIX");

function run(cmd){console.log("\n$ "+cmd);execSync(cmd,{stdio:"inherit"});}

const candidates=["wrangler.jsonc","wrangler.toml"];
const file=candidates.find(f=>fs.existsSync(f));

if(!file){
  console.error("No wrangler.jsonc or wrangler.toml found.");
  process.exit(940);
}

let s=fs.readFileSync(file,"utf8");

if(file.endsWith(".jsonc")){
  if(!/"keep_vars"\s*:/.test(s)){
    const idx=s.indexOf("{");
    if(idx<0){
      console.error("Invalid wrangler.jsonc");
      process.exit(941);
    }
    s=s.slice(0,idx+1)+'\n  "keep_vars": true,'+s.slice(idx+1);
    fs.writeFileSync(file,s);
    console.log("Added keep_vars=true to wrangler.jsonc");
  }else{
    s=s.replace(/"keep_vars"\s*:\s*false/g,'"keep_vars": true');
    fs.writeFileSync(file,s);
    console.log("keep_vars already present; ensured true");
  }
}else{
  if(!/^\s*keep_vars\s*=/m.test(s)){
    s='keep_vars = true\n'+s;
    fs.writeFileSync(file,s);
    console.log("Added keep_vars=true to wrangler.toml");
  }else{
    s=s.replace(/^\s*keep_vars\s*=\s*false\s*$/m,"keep_vars = true");
    fs.writeFileSync(file,s);
    console.log("keep_vars already present; ensured true");
  }
}

console.log("\nRunning build...");
run("npm run build");

console.log("\n================================================");
console.log(" WORLDNOWXXI — KEEP VARS FIX READY");
console.log(" Wrangler will preserve dashboard variables on deploy.");
console.log(" Next: npx wrangler deploy");
console.log("================================================\n");
