"use strict";
const express=require("express");
module.exports=async svr=>{
const {db,pr}=svr.locals;
var rt=express.Router();
rt.get("/admin/setting",async(req,res)=>{
    res.render("admin/setting",{
        setting:await db.setting.all(),
        admin:true,
    });
});
rt.post("/admin/setting",async(req,res)=>{
    for(var [key,val] of Object.entries(req.body)){
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