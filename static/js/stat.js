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
var mem_tooltip=null,host_tooltip=null;
const DETAIL_POLL_MS=2500;
async function get(){
    var node=await fetch("./data").then(res=>res.json());
    if(!node||node.stat==-1)return;
    if(!node.stat)return;
    var {cpu,mem,net,host}=node.stat;
    if(cpu){
        setText(`CPU`,(cpu.multi*100).toFixed(2)+'%');
        var i=0;
        for(var usage of cpu.single){
            setWidth(`CPU${++i}_progress`,`${usage*100}%`);
        }
    }else setText(`CPU`,'—');

    if(mem&&mem.virtual){
        var {used,total}=mem.virtual,usage=used/total,content;
        setText(`MEM`,(usage*100).toFixed(2)+'%');
        setWidth(`MEM_progress`,`${usage*100}%`);
        content=`virtual: ${strB(used)}/${strB(total)}`;
        if(mem.swap){
            setWidth(`SWAP_progress`,`${mem.swap.usedPercent}%`);
            content+=`\nswap: ${strB(mem.swap.used)}/${strB(mem.swap.total)}`;
        }
        if(!mem_tooltip&&E('MEM_item'))mem_tooltip=new mdui.Tooltip(`#MEM_item`,{});
        if(mem_tooltip)mem_tooltip.$element[0].innerText=content;
    }else{
        setText(`MEM`,'—');
        setWidth(`MEM_progress`,'0%');
        setWidth(`SWAP_progress`,'0%');
    }

    if(net&&net.delta){
        setText(`NET_IN`,strbps(net.delta.in));
        setText(`NET_OUT`,strbps(net.delta.out));
    }else{
        setText(`NET_IN`,'—');
        setText(`NET_OUT`,'—');
    }
    if(net&&net.total){
        setText(`NET_IN_TOTAL`,strB(net.total.in));
        setText(`NET_OUT_TOTAL`,strB(net.total.out));
    }else{
        setText(`NET_IN_TOTAL`,'—');
        setText(`NET_OUT_TOTAL`,'—');
    }

    if(net&&net.devices){
        for(var [device,Net] of Object.entries(net.devices)){
            setText(`net_${device}_delta_in`,strbps(Net.delta.in));
            setText(`net_${device}_delta_out`,strbps(Net.delta.out));
            setText(`net_${device}_total_in`,strB(Net.total.in));
            setText(`net_${device}_total_out`,strB(Net.total.out));
        }
    }

    if(host){
        if(!host_tooltip&&E('host'))host_tooltip=new mdui.Tooltip(`#host`,{});
        if(host_tooltip)host_tooltip.$element[0].innerText=
`系统: ${host.os}
平台: ${host.platform}
内核版本: ${host.kernelVersion}
内核架构: ${host.kernelArch}
启动: ${new Date(host.bootTime*1000).toLocaleString()}
在线: ${(host.uptime/86400).toFixed(2)}天`;
    }
}
get();
setInterval(get,DETAIL_POLL_MS);