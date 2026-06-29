"use strict";
const fs=require("fs");
const path=require("path");
const src=path.join(__dirname,"../static/css/style.css");
const dest=path.join(__dirname,"../static/css/style.min.css");
let css=fs.readFileSync(src,"utf8");
css=css
    .replace(/\/\*[\s\S]*?\*\//g,"")
    .replace(/\s+/g," ")
    .replace(/\s*([{}:;,>+~])\s*/g,"$1")
    .trim();
fs.writeFileSync(dest,css);