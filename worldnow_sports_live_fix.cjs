const fs=require("fs");
const path=require("path");
const p=path.join(process.cwd(),"app/eventos/deportes/page.js");
if(!fs.existsSync(p)) throw new Error("No existe app/eventos/deportes/page.js");
let s=fs.readFileSync(p,"utf8");
s=s.replace('import Shell from "../../components/Shell";','import Shell from "../../../components/Shell";');
fs.writeFileSync(p,s);
console.log("WORLDNOWXXI SPORTS LIVE import FIX applied");
