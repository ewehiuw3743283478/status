"use strict";
const schedule=require("node-schedule");
module.exports=async(svr)=>{
const {db,pr,bot}=svr.locals;
var stats={},lastUpdate={},fails={};
const OFFLINE_THRESHOLD=15000;
const OFFLINE_FAILS=10;
const OFFLINE_CHECK_MS=5000;
const SERVER_CACHE_MS=30000;
let serverCache=null,serverCacheAt=0;

async function getServers(){
    const now=Date.now();
    if(!serverCache||now-serverCacheAt>SERVER_CACHE_MS){
        serverCache=await db.servers.all();
        serverCacheAt=now;
    }
    return serverCache;
}
svr.locals.invalidateServerCache=()=>{serverCache=null;};

async function canViewServer(sid,isAdmin=false){
    const server=await db.servers.get(sid);
    if(!server||server.status<=0)return false;
    if(server.status===2&&!isAdmin)return false;
    return true;
}
async function getStats(isAdmin=false){
    const Stats={};
    for(const {sid,status} of await getServers())if(status==1||(status==2&&isAdmin)){
        if(stats[sid])Stats[sid]=stats[sid];
    }
    return Stats;
}
svr.get("/",async(req,res)=>{
    const theme=req.query.theme||await db.setting.get("theme")||"card";
    res.render(`stats/${theme}`,{
        stats:await getStats(req.admin),
        admin:req.admin,
    });
});
svr.get("/stats/data",async(req,res)=>{res.json(await getStats(req.admin));});
svr.get("/stats/:sid",async(req,res)=>{
    const {sid}=req.params;
    if(!await canViewServer(sid,req.admin))return res.redirect("/");
    const node=stats[sid];
    const ssh_scripts=req.admin?await db.ssh_scripts.all():[];
    res.render("stat",{
        sid,node,
        traffic:await db.traffic.get(sid),
        load_m:await db.load_m.select(sid),
        load_h:await db.load_h.select(sid),
        admin:req.admin,
        ssh_scripts,
    });
});
svr.get("/stats/:sid/data",async(req,res)=>{
    const {sid}=req.params;
    if(!await canViewServer(sid,req.admin))return res.status(403).json(pr(0,"无权访问"));
    res.json({sid,...stats[sid]});
});
function applyDevice(stat,device){
    if(!device||!stat||!stat.net||!stat.net.devices)return stat;
    const d=stat.net.devices[device];
    if(d){
        stat.net.total=d.total;
        stat.net.delta=d.delta;
    }
    return stat;
}
function handleUpdate(server,statPayload){
    const {sid}=server;
    const notice=stats[sid]&&stats[sid].stat===false;
    const stat=applyDevice(statPayload,server.data.device);
    stats[sid]={name:server.name,stat};
    lastUpdate[sid]=Date.now();
    fails[sid]=0;
    if(notice&&bot&&bot.funcs){
        bot.funcs.notice(`#恢复 ${server.name} ${new Date().toLocaleString()}`);
    }
}
svr.post("/stats/update",async(req,res)=>{
    let {sid,stat:statPayload,data}=req.body;
    const key=req.headers.key||req.body.key;
    if(!sid)return res.status(400).json(pr(0,"missing sid"));
    const server=await db.servers.get(sid);
    if(!server||server.status<=0)return res.status(403).json(pr(0,"invalid sid"));
    if(!key||key!==server.data.api.key)return res.status(403).json(pr(0,"invalid key"));
    if(statPayload===undefined){
        if(data&&data.stat!==undefined)statPayload=data.stat;
        else statPayload=data;
    }
    if(!statPayload)return res.status(400).json(pr(0,"missing stat"));
    handleUpdate(server,statPayload);
    res.json(pr(1,"update success"));
});
async function checkOffline(){
    const now=Date.now(),active=new Set();
    for(const server of await getServers()){
        const {sid}=server;
        if(server.status<=0){
            delete stats[sid];
            delete lastUpdate[sid];
            delete fails[sid];
            continue;
        }
        active.add(sid);
        const last=lastUpdate[sid];
        if(last&&now-last<=OFFLINE_THRESHOLD){
            fails[sid]=0;
            continue;
        }
        let notice=false;
        if((fails[sid]=(fails[sid]||0)+1)>OFFLINE_FAILS){
            if(stats[sid]&&stats[sid].stat!==false)notice=true;
            stats[sid]={name:server.name,stat:false};
        }else if(!stats[sid]){
            stats[sid]={name:server.name,stat:false};
        }
        if(notice&&bot&&bot.funcs){
            bot.funcs.notice(`#掉线 ${server.name} ${new Date().toLocaleString()}`);
            fails[sid]=OFFLINE_FAILS+1;
        }
    }
    for(const sid in stats)if(!active.has(sid))delete stats[sid];
}
setInterval(()=>{checkOffline().catch(console.error);},OFFLINE_CHECK_MS);
async function calc(){
    for(const server of await getServers()){
        const {sid}=server,stat=stats[sid];
        if(!stat||!stat.stat||stat.stat==-1)continue;
        const ni=stat.stat.net.total.in,
            no=stat.stat.net.total.out;
        let t=await db.lt.get(sid);
        if(!t)t=await db.lt.ins(sid);
        const ti=ni<t.traffic[0]?ni:ni-t.traffic[0],
            to=no<t.traffic[1]?no:no-t.traffic[1];
        await db.lt.set(sid,[ni,no]);
        await db.traffic.add(sid,[ti,to]);
    }
}
setInterval(()=>{calc().catch(console.error);},30*1000);

schedule.scheduleJob({second:0},()=>{
    (async()=>{
        for(const {sid} of await getServers()){
            let cpu=-1,mem=-1,swap=-1,ibw=-1,obw=-1;
            const stat=stats[sid];
            if(stat&&stat.stat&&stat.stat!=-1){
                cpu=stat.stat.cpu.multi*100;
                mem=stat.stat.mem.virtual.usedPercent;
                swap=stat.stat.mem.swap.usedPercent;
                ibw=stat.stat.net.delta.in;
                obw=stat.stat.net.delta.out;
            }
            await db.load_m.shift(sid,{cpu,mem,swap,ibw,obw});
        }
    })().catch(console.error);
});
schedule.scheduleJob({minute:0,second:1},()=>{
    (async()=>{
        await db.traffic.shift_hs();
        for(const {sid} of await getServers()){
            let Cpu=0,Mem=0,Swap=0,Ibw=0,Obw=0,tot=0;
            for(const {cpu,mem,swap,ibw,obw} of await db.load_m.select(sid))if(cpu!=-1){
                ++tot;
                Cpu+=cpu;Mem+=mem;Swap+=swap;Ibw+=ibw;Obw+=obw;
            }
            if(tot==0)await db.load_h.shift(sid,{cpu:-1,mem:-1,swap:-1,ibw:-1,obw:-1});
            else await db.load_h.shift(sid,{cpu:Cpu/tot,mem:Mem/tot,swap:Swap/tot,ibw:Ibw/tot,obw:Obw/tot});
        }
    })().catch(console.error);
});
schedule.scheduleJob({hour:4,minute:0,second:2},()=>{db.traffic.shift_ds().catch(console.error);});
schedule.scheduleJob({date:1,hour:4,minute:0,second:3},()=>{db.traffic.shift_ms().catch(console.error);});
};