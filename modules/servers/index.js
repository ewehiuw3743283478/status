"use strict";
const {initServer,updateServer,getInstallScript}=require("./func"),
    {normalizeServerData,hasSshConfig}=require("../../lib/server-data"),
    {STAT_HIDE_KEYS,STAT_HIDE_LABELS}=require("../../lib/hide-stats"),
    ssh=require("../../ssh");
const hideStatOptions=STAT_HIDE_KEYS.map(key=>({key,label:STAT_HIDE_LABELS[key]}));
module.exports=async svr=>{
const {db,pr,uuid}=svr.locals;
async function panelUrl(){return (await db.setting.get("site")).url;}
async function statusAgentUrl(){
    return (await db.setting.get("status_agent_url"))??await db.setting.get("neko_status_url");
}
svr.post("/admin/servers/add",async(req,res)=>{
    try{
        var {sid,name,data,top,status}=req.body;
        name=String(name||"").trim();
        if(!name)return res.json(pr(0,"请填写服务器名称"));
        if(!sid)sid=uuid.v4();
        data=normalizeServerData(data||{});
        if(!data.api.key)data.api.key=uuid.v4();
        await db.servers.ins(sid,name,data,top??0,status??1);
        svr.locals.invalidateServerCache?.();
        res.json(pr(1,sid));
    }catch(e){
        console.error("add server failed:",e);
        res.json(pr(0,"添加失败"));
    }
});
svr.get("/admin/servers/add",(req,res)=>{
    res.render("admin/servers/add",{admin:true,hide_stat_options:hideStatOptions,hide_stats:[],stat_hide_keys:STAT_HIDE_KEYS});
});
svr.post("/admin/servers/:sid/edit",async(req,res)=>{
    try{
        var {sid}=req.params,{name,data,top,status}=req.body;
        name=String(name||"").trim();
        if(!name)return res.json(pr(0,"请填写服务器名称"));
        data=normalizeServerData(data||{});
        if(!data.api.key){
            const server=await db.servers.get(sid);
            data.api.key=server&&server.data.api&&server.data.api.key?server.data.api.key:uuid.v4();
        }
        await db.servers.upd(sid,name,data,top??0);
        if(status!=null)await db.servers.upd_status(sid,status);
        svr.locals.invalidateServerCache?.();
        res.json(pr(1,"修改成功"));
    }catch(e){
        console.error("edit server failed:",e);
        res.json(pr(0,"修改失败"));
    }
});
svr.post("/admin/servers/:sid/regen-key",async(req,res)=>{
    var {sid}=req.params,server=await db.servers.get(sid);
    if(!server)return res.json(pr(0,"服务器不存在"));
    if(!server.data.api)server.data.api={};
    server.data.api.key=uuid.v4();
    await db.servers.upd_data(sid,server.data);
    res.json(pr(1,server.data.api.key));
});
svr.get("/admin/servers/:sid/install-script",async(req,res)=>{
    var server=await db.servers.get(req.params.sid);
    if(!server)return res.json(pr(0,"服务器不存在"));
    res.json(pr(1,getInstallScript(server,await statusAgentUrl(),await panelUrl())));
});
svr.post("/admin/servers/:sid/del",async(req,res)=>{
    var {sid}=req.params;
    await db.servers.del(sid);
    svr.locals.invalidateServerCache?.();
    res.json(pr(1,"删除成功"));
});
svr.post("/admin/servers/:sid/init",async(req,res)=>{
    var {sid}=req.params,
        server=await db.servers.get(sid);
    if(!server)return res.json(pr(0,"服务器不存在"));
    if(!hasSshConfig(server.data))return res.json(pr(0,"未配置 SSH，请填写 SSH 或使用安装脚本手动部署探针"));
    res.json(await initServer(server,await statusAgentUrl(),await panelUrl()));
});
svr.post("/admin/servers/:sid/update",async(req,res)=>{
    var {sid}=req.params,
        server=await db.servers.get(sid);
    if(!server)return res.json(pr(0,"服务器不存在"));
    if(!hasSshConfig(server.data))return res.json(pr(0,"未配置 SSH，请填写 SSH 或使用安装脚本手动更新探针"));
    res.json(await updateServer(server,await statusAgentUrl(),await panelUrl()));
});
svr.get("/admin/servers",async(req,res)=>{
    res.render("admin/servers",{
        servers:await db.servers.all(),
        panel_url:await panelUrl(),
        admin:true,
    });
});
svr.post("/admin/servers/ord",async(req,res)=>{
    var {servers}=req.body,ord=0;
    servers.reverse();
    for(var sid of servers)await db.servers.upd_top(sid,++ord);
    svr.locals.invalidateServerCache?.();
    res.json(pr(true,"更新成功"));
});
svr.get("/admin/servers/:sid",async(req,res)=>{
    var {sid}=req.params,server=await db.servers.get(sid);
    if(!server)return res.redirect("/admin/servers");
    if(!server.data.api)server.data.api={};
    if(!server.data.api.key){
        server.data.api.key=uuid.v4();
        await db.servers.upd_data(sid,server.data);
    }
    res.render("admin/servers/edit",{
        server,
        panel_url:await panelUrl(),
        install_script:getInstallScript(server,await statusAgentUrl(),await panelUrl()),
        hide_stat_options:hideStatOptions,
        hide_stats:server.data.hide_stats||[],
        stat_hide_keys:STAT_HIDE_KEYS,
        admin:true,
    });
});
svr.ws("/admin/servers/:sid/ws-ssh/:data",(ws,req)=>{
    if(!req.admin){ws.close();return;}
    var {sid,data}=req.params;
    db.servers.get(sid).then(server=>{
        if(!server||!hasSshConfig(server.data)){ws.close();return;}
        if(data)data=JSON.parse(data);
        ssh.createSocket(server.data.ssh,ws,data);
    }).catch(()=>ws.close());
});
svr.get("/get-status-agent",async(req,res)=>{
    const {agentBinaryUrl}=require("../../lib/release");
    const url=agentBinaryUrl("amd64",await statusAgentUrl())||"/";
    res.redirect(302,url);
});
svr.get("/get-neko-status",(req,res)=>res.redirect(301,"/get-status-agent"));
};