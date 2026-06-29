"use strict";
const {runMonitorCheck}=require("../../lib/service-check");
const {normalizeMonitorData,monitorCheckTarget,publicMonitorView}=require("../../lib/monitor-data");
const {bumpDaily,buildUptimeFrame}=require("../../lib/uptime-frame");

const HISTORY_MAX=1440;
const TICK_MS=15000;
const state={};
const lastRun={};

function emptyState(){
    return {
        up:null,latency_ms:null,checked_at:null,error:"",
        uptime_pct:null,history:[],latency_history:[],
    };
}

function pushHistory(id,up,latency_ms){
    let s=state[id];
    if(!s)s=state[id]=emptyState();
    s.history.push(up?1:0);
    s.latency_history.push(up?latency_ms:null);
    if(s.history.length>HISTORY_MAX){
        s.history.shift();
        s.latency_history.shift();
    }
    const total=s.history.length;
    const ok=s.history.reduce((a,b)=>a+b,0);
    s.uptime_pct=total?Math.round(ok/total*1000)/10:null;
}

function applyResult(id,result){
    if(!result)return;
    let s=state[id];
    if(!s)s=state[id]=emptyState();
    const wasUp=s.up;
    s.up=result.up;
    s.latency_ms=result.latency_ms;
    s.checked_at=Date.now();
    s.error=result.error||"";
    pushHistory(id,result.up,result.latency_ms);
    return wasUp!==null&&wasUp!==result.up?result.up:null;
}

function publicSnapshot(monitor){
    const s=state[monitor.id]||emptyState();
    const d=monitor.data||{};
    const snap={
        ...publicMonitorView(monitor),
        up:s.up,
        latency_ms:s.latency_ms,
        checked_at:s.checked_at,
        uptime_pct:s.uptime_pct,
        interval_sec:d.interval_sec||60,
        uptime_frame:buildUptimeFrame(monitor,s),
    };
    if(!d.hide_latency_chart)snap.latency_history=s.latency_history;
    return snap;
}

module.exports=async svr=>{
const {db,pr,bot,uuid}=svr.locals;
const rt=require("express").Router();

async function listVisible(isAdmin){
    const out=[];
    for(const m of await db.service_monitors.all()){
        if(m.status<=0||!m.data.enabled)continue;
        if(m.status===2&&!isAdmin)continue;
        out.push(m);
    }
    return out;
}

async function getPublicData(isAdmin){
    const data={};
    for(const m of await listVisible(isAdmin))data[m.id]=publicSnapshot(m);
    return data;
}

async function recordDaily(monitor,up){
    const daily=bumpDaily(monitor.data.uptime_daily,up);
    monitor.data.uptime_daily=daily;
    try{
        await db.service_monitors.merge_data(monitor.id,{uptime_daily:daily});
    }catch(e){
        console.error("uptime daily persist failed:",monitor.id,e);
    }
}

async function checkOne(monitor){
    if(!monitor.data.enabled||monitor.status<=0)return;
    const now=Date.now();
    const interval=monitor.data.interval_sec*1000;
    if(lastRun[monitor.id]&&now-lastRun[monitor.id]<interval)return;
    lastRun[monitor.id]=now;
    let result={up:false,latency_ms:0,error:"check failed"};
    try{
        result=await runMonitorCheck(monitor);
        const change=applyResult(monitor.id,result);
        if(change!==null&&change!==undefined&&bot&&bot.funcs){
            const label=monitorCheckTarget(monitor.data)||monitor.name;
            const msg=change
                ?`#服务恢复 ${monitor.name} (${label}) ${new Date().toLocaleString()}`
                :`#服务异常 ${monitor.name} (${label}) ${result.error||"down"} ${new Date().toLocaleString()}`;
            bot.funcs.notice(msg);
        }
    }catch(e){
        result={up:false,latency_ms:0,error:e.message||"check failed"};
        applyResult(monitor.id,result);
    }
    await recordDaily(monitor,!!result.up);
}

async function runChecks(){
    for(const m of await db.service_monitors.all())await checkOne(m);
}

setInterval(()=>{runChecks().catch(console.error);},TICK_MS);
setTimeout(()=>{runChecks().catch(console.error);},3000);

rt.get("/services",async(req,res)=>{
    const theme=req.query.theme==="list"?"list":"card";
    const monitors=await listVisible(req.admin);
    let hasCharts=false;
    const items=monitors.map(m=>{
        const view=publicMonitorView(m);
        if(!view.hide_latency_chart)hasCharts=true;
        return {
            ...m,
            view,
            dom_id:String(m.id).replace(/-/g,"_"),
        };
    });
    res.render(`services/${theme}`,{
        monitors:items,
        admin:req.admin,
        has_charts:hasCharts,
        theme,
    });
});

rt.get("/services/data",async(req,res)=>{
    res.json(await getPublicData(req.admin));
});

function monitorDomId(id){
    return String(id).replace(/-/g,"_");
}

function liveSnapshot(id){
    const s=state[id]||emptyState();
    return {
        up:s.up,
        latency_ms:s.latency_ms,
        checked_at:s.checked_at,
        uptime_pct:s.uptime_pct,
        error:s.error,
    };
}

rt.get("/admin/service_monitors/data",async(req,res)=>{
    const data={};
    for(const m of await db.service_monitors.all())data[m.id]=liveSnapshot(m.id);
    res.json(data);
});

const defaultMonitor={
    id:"",
    name:"",
    status:1,
    data:{
        type:"tcp",
        host:"",
        port:443,
        timeout_ms:5000,
        interval_sec:60,
        enabled:true,
    },
};

function validateMonitorPayload(data){
    if(data.type==="tcp"&&!data.host)return "请填写检测主机";
    if(data.type==="http"&&!data.url)return "请填写检测 URL";
    return "";
}

rt.get("/admin/service_monitors/add",(req,res)=>{
    res.render("admin/service_monitors/add",{
        admin:true,
        monitor:defaultMonitor,
    });
});

rt.get("/admin/service_monitors/:id",async(req,res)=>{
    const {id}=req.params;
    if(id==="add")return res.redirect("/admin/service_monitors/add");
    const m=await db.service_monitors.get(id);
    if(!m)return res.redirect("/admin/service_monitors");
    res.render("admin/service_monitors/edit",{
        monitor:m,
        check_target:monitorCheckTarget(m.data),
        admin:true,
    });
});

rt.get("/admin/service_monitors",async(req,res)=>{
    const monitors=await db.service_monitors.all();
    for(const m of monitors){
        m.check_target=monitorCheckTarget(m.data);
        m.dom_id=monitorDomId(m.id);
    }
    res.render("admin/service_monitors",{
        monitors,
        admin:true,
    });
});

rt.post("/admin/service_monitors/add",async(req,res)=>{
    try{
        let {id,name,data,top,status}=req.body;
        name=String(name||"").trim();
        if(!name)return res.json(pr(0,"请填写名称"));
        if(!id)id=uuid.v4();
        data=normalizeMonitorData(data||{});
        const valErr=validateMonitorPayload(data);
        if(valErr)return res.json(pr(0,valErr));
        await db.service_monitors.ins(id,name,data,top??0,status??1);
        state[id]=emptyState();
        delete lastRun[id];
        await checkOne(await db.service_monitors.get(id));
        res.json(pr(1,id));
    }catch(e){
        console.error("add service monitor failed:",e);
        res.json(pr(0,"添加失败"));
    }
});

rt.post("/admin/service_monitors/upd",async(req,res)=>{
    try{
        let {id,name,data,top,status}=req.body;
        if(!id)return res.json(pr(0,"missing id"));
        const existing=await db.service_monitors.get(id);
        if(!existing)return res.json(pr(0,"不存在"));
        name=String(name||"").trim();
        if(!name)return res.json(pr(0,"请填写名称"));
        data=normalizeMonitorData(data||{});
        const valErr=validateMonitorPayload(data);
        if(valErr)return res.json(pr(0,valErr));
        await db.service_monitors.upd(id,name,data,top??existing.top??0);
        if(status!=null)await db.service_monitors.upd_status(id,status);
        res.json(pr(1,"修改成功"));
    }catch(e){
        console.error("upd service monitor failed:",e);
        res.json(pr(0,"修改失败"));
    }
});

rt.post("/admin/service_monitors/get",async(req,res)=>{
    const {id}=req.body;
    const m=await db.service_monitors.get(id);
    if(!m)return res.json(pr(0,"不存在"));
    const s=state[m.id]||emptyState();
    res.json(pr(1,{
        ...m,
        check_target:monitorCheckTarget(m.data),
        up:s.up,
        latency_ms:s.latency_ms,
        checked_at:s.checked_at,
        error:s.error,
        uptime_pct:s.uptime_pct,
    }));
});

rt.post("/admin/service_monitors/del",async(req,res)=>{
    const {id}=req.body;
    await db.service_monitors.del(id);
    delete state[id];
    delete lastRun[id];
    res.json(pr(1,"删除成功"));
});

rt.post("/admin/service_monitors/test",async(req,res)=>{
    try{
        let {data}=req.body;
        data=normalizeMonitorData(data||{});
        const valErr=validateMonitorPayload(data);
        if(valErr)return res.json(pr(0,valErr));
        const result=await runMonitorCheck({data});
        if(!result)return res.json(pr(0,"检测未启用"));
        res.json(pr(1,result));
    }catch(e){
        res.json(pr(0,e.message||"检测失败"));
    }
});

rt.post("/admin/service_monitors/ord",async(req,res)=>{
    const {monitors}=req.body;
    let ord=0;
    if(Array.isArray(monitors)){
        monitors.reverse();
        for(const id of monitors)await db.service_monitors.upd_top(id,++ord);
    }
    res.json(pr(1,"更新成功"));
});

svr.use(rt);
};