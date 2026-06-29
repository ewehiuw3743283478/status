function fmtTime(ts){
    if(!ts)return '—';
    return new Date(ts).toLocaleString();
}
function fmtLatency(ms){
    if(ms==null||ms===undefined)return '—';
    return ms+' ms';
}
function fmtUptime(pct){
    if(pct==null||pct===undefined)return '—';
    return pct+'%';
}
function monitorDomId(id){
    return String(id).replace(/-/g,'_');
}
function setMonitorStatus(el,up){
    if(!el)return;
    el.replaceChildren();
    var pill=document.createElement('span');
    pill.className='status-pill';
    if(up===null||up===undefined){
        pill.classList.add('pending');
        pill.textContent='检测中';
    }else if(up){
        pill.classList.add('up');
        pill.textContent='正常';
    }else{
        pill.classList.add('down');
        pill.textContent='异常';
    }
    el.appendChild(pill);
}
function setMonitorRow(id,row){
    var dom=monitorDomId(id);
    setMonitorStatus(E('m_'+dom+'_status'),row.up);
    var lat=E('m_'+dom+'_latency');
    if(lat)lat.textContent=fmtLatency(row.latency_ms);
    var up=E('m_'+dom+'_uptime');
    if(up)up.textContent=fmtUptime(row.uptime_pct);
}
const ADMIN_MONITOR_POLL_MS=5000;
setInterval(async()=>{
    try{
        var data=await fetch('/admin/service_monitors/data').then(r=>r.json());
        for(var id in data){
            if(Object.prototype.hasOwnProperty.call(data,id))
                setMonitorRow(id,data[id]);
        }
    }catch(e){}
},ADMIN_MONITOR_POLL_MS);