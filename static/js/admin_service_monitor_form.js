function readFormType(){
    var el=E("form_type");
    if(!el)return "tcp";
    if(el.value==="http"||el.value==="tcp")return el.value;
    var opt=el.options[el.selectedIndex];
    return opt&&(opt.value==="http"||opt.value==="tcp")?opt.value:"tcp";
}
function readTypeFieldValues(){
    return {
        host:V("form_host"),
        port:V("form_port"),
        url:V("form_url"),
        method:V("form_method"),
        expect_code:V("form_expect_code"),
        expect_body:V("form_expect_body"),
    };
}
function applyTypeFieldValues(vals){
    if(E("form_host"))E("form_host").value=vals.host||"";
    if(E("form_port"))E("form_port").value=vals.port||"443";
    if(E("form_url"))E("form_url").value=vals.url||"";
    if(E("form_method"))E("form_method").value=vals.method||"GET";
    if(E("form_expect_code"))E("form_expect_code").value=vals.expect_code||"0";
    if(E("form_expect_body"))E("form_expect_body").value=vals.expect_body||"";
}
function toggleMonitorType(type){
    if(type!=="http"&&type!=="tcp")type=readFormType();
    var tcp=type==="tcp";
    var tpl=E(tcp?"tpl_tcp_fields":"tpl_http_fields");
    var box=E("form_type_fields");
    if(!tpl||!box)return;
    var vals=readTypeFieldValues();
    box.innerHTML=tpl.innerHTML;
    applyTypeFieldValues(vals);
    if(typeof mdui!=="undefined"&&mdui.mutation)mdui.mutation();
}
function safePublicLink(url){
    url=String(url||"").trim();
    if(!url)return "";
    if(!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url))url="https://"+url;
    try{
        var u=new URL(url);
        if(u.protocol!=="http:"&&u.protocol!=="https:")return "";
        return u.href;
    }catch(e){
        return "";
    }
}
function collectFormData(){
    var type=readFormType();
    return {
        type,
        status_page_link:safePublicLink(V("form_status_page_link")),
        tooltip:V("form_tooltip"),
        host:V("form_host").trim(),
        port:Number(V("form_port"))||443,
        url:V("form_url").trim(),
        method:V("form_method")||"GET",
        expect_code:Number(V("form_expect_code"))||0,
        expect_body:V("form_expect_body"),
        timeout_ms:Number(V("form_timeout_ms"))||5000,
        interval_sec:Number(V("form_interval_sec"))||60,
        hide_latency_chart:!!(E("form_hide_latency_chart")&&E("form_hide_latency_chart").checked),
        enabled:!!(E("form_enabled")&&E("form_enabled").checked),
    };
}
function validateMonitorData(data){
    if(data.type==="tcp"){
        if(!data.host)return "请填写检测主机";
    }else if(data.type==="http"){
        if(!data.url)return "请填写检测 URL";
    }
    return "";
}
function fmtTime(ts){
    if(!ts)return "—";
    return new Date(ts).toLocaleString();
}
function fmtLatency(ms){
    if(ms==null||ms===undefined)return "—";
    return ms+" ms";
}
function fmtUptime(pct){
    if(pct==null||pct===undefined)return "—";
    return pct+"%";
}
function setLiveError(msg){
    var panel=document.querySelector(".admin-live-panel");
    var err=E("live_error");
    if(msg){
        if(!err&&panel){
            err=document.createElement("p");
            err.className="form-hint admin-live-error";
            err.id="live_error";
            var hint=panel.querySelector(".form-hint:not(.admin-live-error)");
            if(hint)panel.insertBefore(err,hint);
            else panel.appendChild(err);
        }
        if(err)err.textContent=msg;
    }else if(err){
        err.remove();
    }
}
function setLiveStatusPill(el,up){
    if(!el)return;
    el.classList.remove("up","down","pending");
    if(up===null||up===undefined){
        el.classList.add("pending");
        el.textContent="检测中";
        return;
    }
    if(up){
        el.classList.add("up");
        el.textContent="正常";
    }else{
        el.classList.add("down");
        el.textContent="异常";
    }
}
function updateLivePanel(row){
    if(!row)return;
    var st=E("live_status");
    if(st)setLiveStatusPill(st,row.up);
    var lat=E("live_latency");
    if(lat)lat.textContent=fmtLatency(row.latency_ms);
    var up=E("live_uptime");
    if(up)up.textContent=fmtUptime(row.uptime_pct);
    var tm=E("live_time");
    if(tm)tm.textContent=fmtTime(row.checked_at);
    if(row.error&&row.up===false)setLiveError("最近错误："+row.error);
    else setLiveError("");
}
async function refreshLiveStatus(){
    if(!window.MONITOR_ID)return;
    try{
        var res=await postjson("/admin/service_monitors/get",{id:window.MONITOR_ID});
        if(res.status)updateLivePanel(res.data);
    }catch(e){}
}
async function testMonitorForm(){
    var data=collectFormData();
    var err=validateMonitorData(data);
    if(err)return notice(err);
    startloading();
    var res=await postjson("/admin/service_monitors/test",{data});
    endloading();
    var box=E("form_test_result");
    if(!box)return;
    if(res.status){
        box.textContent=res.data.up
            ?"检测成功 · "+res.data.latency_ms+" ms"
            :"检测失败 · "+(res.data.error||"down");
    }else{
        box.textContent=res.data||"检测失败";
        notice(res.data);
    }
}
async function saveMonitorForm(){
    try{
        var name=V("form_name").trim();
        if(!name)return notice("请填写名称");
        var rawLink=V("form_status_page_link").trim();
        if(rawLink&&!safePublicLink(rawLink))return notice("展示链接仅支持 http:// 或 https://");
        var data=collectFormData();
        var err=validateMonitorData(data);
        if(err)return notice(err);
        startloading();
        var body={
            name,
            data,
            status:Number(V("form_status"))||1,
        };
        var url,after;
        if(window.MONITOR_FORM_MODE==="edit"){
            if(!window.MONITOR_ID)return notice("缺少监控 ID，请刷新页面");
            body.id=window.MONITOR_ID;
            url="/admin/service_monitors/upd";
            after=()=>refreshLiveStatus();
        }else{
            url="/admin/service_monitors/add";
            after=(id)=>redirect("/admin/service_monitors/"+id);
        }
        var res=await postjson(url,body);
        endloading();
        if(res.status){
            notice(window.MONITOR_FORM_MODE==="edit"?"修改成功":"添加成功");
            if(after)after(res.data);
        }else notice(res.data||"保存失败");
    }catch(e){
        endloading();
        notice("保存失败，请刷新页面后重试");
    }
}
async function deleteMonitorForm(){
    if(!confirm("确认删除此监控项？"))return;
    startloading();
    var res=await postjson("/admin/service_monitors/del",{id:window.MONITOR_ID});
    endloading();
    if(res.status)redirect("/admin/service_monitors");
    else notice(res.data);
}
document.addEventListener("DOMContentLoaded",()=>{
    if(E("form_type_fields")&&E("form_type"))toggleMonitorType(readFormType());
    if(window.MONITOR_FORM_MODE==="edit"){
        refreshLiveStatus();
        setInterval(refreshLiveStatus,5000);
    }
});