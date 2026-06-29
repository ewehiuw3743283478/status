var KB=1024,MB=KB*1024,GB=MB*1024,TB=GB*1024;
function strB(b){
    if(b==null||b===undefined||Number.isNaN(b))return '—';
    if(b<KB)return b.toFixed(2)+'B';
    if(b<MB)return (b/KB).toFixed(2)+'KB';
    if(b<GB)return (b/MB).toFixed(2)+'MB';
    if(b<TB)return (b/GB).toFixed(2)+'GB';
    else return (b/TB).toFixed(2)+'TB';
}
var Kbps=128,Mbps=Kbps*1000,Gbps=Mbps*1000,Tbps=Gbps*1000;
function strbps(b){
    if(b==null||b===undefined||Number.isNaN(b))return '—';
    if(b<Kbps)return b.toFixed(2)+'bps';
    if(b<Mbps)return (b/Kbps).toFixed(2)+'Kbps';
    if(b<Gbps)return (b/Mbps).toFixed(2)+'Mbps';
    if(b<Tbps)return (b/Gbps).toFixed(2)+'Gbps';
    else return (b/Tbps).toFixed(2)+'Gbps';
}
function setText(id,text){
    var el=E(id);
    if(el)el.innerText=text;
}
function setWidth(id,width){
    var el=E(id);
    if(el)el.style.width=width;
}
var mem_tooltips={},host_tooltips={};
const ROW_KEYS={cpu:"cpu_row",mem:"mem_row",bw:"bw_row",traffic:"traffic_row",host:"host_row"};
const LIST_FIELD_IDS={cpu:["CPU"],mem:["MEM"],bw:["NET_IN","NET_OUT"],traffic:["NET_IN_TOTAL","NET_OUT_TOTAL"],host:["host_row"]};
function removeHiddenStat(sid,key){
    var rowId=`${sid}_${ROW_KEYS[key]}`,row=E(rowId);
    if(row){
        var block=row.closest("li")||row.closest("td")||row;
        block.remove();
        return;
    }
    var ids=LIST_FIELD_IDS[key];
    if(!ids)return;
    for(var id of ids){
        var el=E(`${sid}_${id}`);
        if(!el)continue;
        var cell=el.closest("td")||el;
        cell.remove();
    }
}
function applyHiddenRows(sid,hidden){
    if(!hidden||!hidden.length)return;
    for(var key of hidden)removeHiddenStat(sid,key);
}
function pulsePoll(){
    var el=E('poll_indicator');
    if(!el)return;
    el.classList.remove('poll-flash');
    void el.offsetWidth;
    el.classList.add('poll-flash');
}
const DASHBOARD_POLL_MS=2500;
setInterval(async()=>{
    var stats=await fetch("/stats/data").then(res=>res.json());
    pulsePoll();
    for(var [sid,node] of Object.entries(stats)){
        applyHiddenRows(sid,node.hidden);
        if(node.stat&&node.stat!=-1){
        var {cpu,mem,net,host}=node.stat;
        if(cpu){
            setText(`${sid}_CPU`,(cpu.multi*100).toFixed(2)+'%');
            setWidth(`${sid}_CPU_progress`,`${cpu.multi*100}%`);
        }else{
            setText(`${sid}_CPU`,'—');
            setWidth(`${sid}_CPU_progress`,'0%');
        }

        if(mem&&mem.virtual){
            var {used,total}=mem.virtual,usage=used/total;
            setText(`${sid}_MEM`,(usage*100).toFixed(2)+'%');
            setWidth(`${sid}_MEM_progress`,`${usage*100}%`);
            var content=`${strB(used)}/${strB(total)}`;
            if(mem_tooltips[sid])mem_tooltips[sid].$element[0].innerText=content;
            else mem_tooltips[sid]=new mdui.Tooltip(`#${sid}_mem_row`,{content});
        }else{
            setText(`${sid}_MEM`,'—');
            setWidth(`${sid}_MEM_progress`,'0%');
        }

        if(net&&net.delta){
            setText(`${sid}_NET_IN`,strbps(net.delta.in));
            setText(`${sid}_NET_OUT`,strbps(net.delta.out));
        }else{
            setText(`${sid}_NET_IN`,'—');
            setText(`${sid}_NET_OUT`,'—');
        }
        if(net&&net.total){
            setText(`${sid}_NET_IN_TOTAL`,strB(net.total.in));
            setText(`${sid}_NET_OUT_TOTAL`,strB(net.total.out));
        }else{
            setText(`${sid}_NET_IN_TOTAL`,'—');
            setText(`${sid}_NET_OUT_TOTAL`,'—');
        }

        if(host){
            var content=
`系统: ${host.os}
平台: ${host.platform}
内核版本: ${host.kernelVersion}
内核架构: ${host.kernelArch}
启动: ${new Date(host.bootTime*1000).toLocaleString()}
在线: ${(host.uptime/86400).toFixed(2)}天`;
            if(!host_tooltips[sid])host_tooltips[sid]=new mdui.Tooltip(`#${sid}_host_row`,{});
            host_tooltips[sid].$element[0].innerText=content;
        }
        }
    }
},DASHBOARD_POLL_MS);