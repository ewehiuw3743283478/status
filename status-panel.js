#!/usr/bin/env node
"use strict";
(async()=>{
const express=require("express"),
    bp=require("body-parser"),
    ckp=require("cookie-parser"),
    nunjucks=require("nunjucks"),
    fs=require("fs"),
    path=require("path");
const core=require("./core"),
    {pr,md5,uuid}=core;
const db=await require("./database")();
let setting=await db.setting.all();
const svr=express();

svr.use(bp.urlencoded({extended:false}));
svr.use(bp.json({limit:"100mb"}));
svr.use(ckp());
svr.use(express.static(__dirname+"/static"));

svr.engine("html",nunjucks.render);
svr.set("view engine","html");
require("express-ws")(svr);

nunjucks.configure(__dirname+"/views",{
    autoescape:true,
    express:svr,
    watch:setting.debug,
});
const admin_tokens=new Set();
try{
    for(const token of require("./tokens.json"))admin_tokens.add(token);
}catch{}
function persistTokens(){
    const tokens=[];
    for(const token of admin_tokens.keys())tokens.push(token);
    fs.writeFileSync(__dirname+"/tokens.json",JSON.stringify(tokens));
}
process.on("SIGINT",()=>{persistTokens();process.exit(0);});
process.on("SIGTERM",()=>{persistTokens();process.exit(0);});
svr.all("*",(req,res,nxt)=>{
    if(admin_tokens.has(req.cookies.token))req.admin=true;
    nxt();
});
svr.get("/login",(req,res)=>{
    if(req.admin)res.redirect("/");
    else res.render("login",{});
});
svr.post("/login",async(req,res)=>{
    const {password}=req.body;
    if(password==md5(await db.setting.get("password"))){
        const token=uuid.v4();
        admin_tokens.add(token);
        persistTokens();
        res.cookie("token",token);
        res.json(pr(1,token));
    }else res.json(pr(0,"密码错误"));
});
svr.get("/logout",(req,res)=>{
    admin_tokens.delete(req.cookies.token);
    persistTokens();
    res.clearCookie("token");
    res.redirect("/login");
});
function requireAdmin(req,res,next){
    if(req.admin)return next();
    const wantsJson=req.xhr
        ||(req.headers.accept&&req.headers.accept.includes("application/json"))
        ||(req.headers["content-type"]&&req.headers["content-type"].includes("application/json"))
        ||req.method!=="GET";
    if(wantsJson)return res.status(401).json(pr(0,"未授权，请先登录"));
    return res.redirect("/login");
}
svr.use("/admin",requireAdmin);
svr.get("/admin",(req,res)=>res.render("admin",{admin:true}));
svr.get("/admin/db",async(req,res)=>{
    const backupPath=path.join(__dirname,"database","backup"+(db.driver.type==="postgres"?".sql":".db"));
    try{
        await db.driver.backup(backupPath);
        const name=db.driver.type==="postgres"?"backup.sql":"backup.db";
        res.download(backupPath,name);
    }catch(e){
        console.error(e);
        res.status(500).json(pr(0,"备份失败"));
    }
});

let bot=null;
if(setting.bot&&setting.bot.token){
    bot=require("./bot")(setting.bot.token,setting.bot.chatIds);
    if(setting.bot.webhook){
        bot.bot.setWebHook(setting.site.url+"/bot"+setting.bot.token).then(()=>{
            bot.bot.setMyCommands(bot.cmds);
        });
        svr.all("/bot"+setting.bot.token,(req,res)=>{
            bot.bot.processUpdate(req.body);
            res.sendStatus(200);
        });
    }else bot.bot.startPolling();
}
svr.locals={
    setting,
    db,
    bot,
    ...core,
};

for(const file of fs.readdirSync(__dirname+"/modules",{withFileTypes:1})){
    if(!file.isDirectory())continue;
    try{await require(`./modules/${file.name}/index.js`)(svr);}catch(e){console.log(e)}
}
const port=process.env.PORT||await db.setting.get("listen"),
    host=process.env.HOST||"";
svr.server=svr.listen(port,host,()=>{
    console.log(`server running @ http://${host||"localhost"}:${port}`);
    console.log(`database: ${db.driver.type}`);
});
})();