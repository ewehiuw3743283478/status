"use strict";
const express=require("express");
const {settingBaseline}=require("../../lib/security");
const {hashPassword}=require("../../lib/password");
module.exports=async svr=>{
const {db,pr}=svr.locals;
var rt=express.Router();
rt.get("/admin/setting",async(req,res)=>{
    const all=await db.setting.all();
    const {password,...setting}=all;
    res.render("admin/setting",{
        setting,
        setting_baseline:settingBaseline(all),
        admin:true,
    });
});
rt.post("/admin/setting",async(req,res)=>{
    const body={...req.body};
    if(Object.prototype.hasOwnProperty.call(body,"password")){
        const nextPassword=String(body.password||"").trim();
        if(!nextPassword)delete body.password;
        else body.password=await hashPassword(nextPassword);
    }
    for(var [key,val] of Object.entries(body)){
        await db.setting.set(key,val);
        svr.locals.setting[key]=val;
    }
    res.json(pr(1,"修改成功"));
    if(req.body.listen)svr.server.close(()=>{
        svr.server=svr.listen(req.body.listen,"",()=>{
            console.log(`server restart @ http://localhost:${req.body.listen}`);
        });
    });
});
svr.use(rt);
};