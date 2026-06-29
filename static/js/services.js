var svcCharts={};

function domId(id){
    return String(id).replace(/-/g,'_');
}
function setText(id,suffix,text){
    var el=E(domId(id)+'_'+suffix);
    if(el)el.innerText=text;
}
function fmtRelative(ts){
    if(!ts)return '—';
    var sec=Math.floor((Date.now()-ts)/1000);
    if(sec<10)return '刚刚';
    if(sec<60)return sec+' 秒前';
    if(sec<3600)return Math.floor(sec/60)+' 分钟前';
    if(sec<86400)return Math.floor(sec/3600)+' 小时前';
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
function chartLineColor(){
    return document.body.classList.contains('mdui-theme-layout-dark')?'#9aa0b8':'#5c6bc0';
}
function chartGridColor(){
    return document.body.classList.contains('mdui-theme-layout-dark')?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)';
}
function pulsePoll(){
    var el=E('poll_indicator');
    if(!el)return;
    el.classList.remove('poll-flash');
    void el.offsetWidth;
    el.classList.add('poll-flash');
}
function setOffline(id,offline){
    var card=E(domId(id)+'_card');
    var row=E(domId(id)+'_row');
    if(card){
        if(offline)card.classList.add('offline','mdui-text-color-grey');
        else card.classList.remove('offline','mdui-text-color-grey');
    }
    if(row){
        if(offline)row.classList.add('offline');
        else row.classList.remove('offline');
    }
}
function setStatusPill(el,up){
    if(!el)return;
    el.classList.remove('up','down','pending');
    if(up===null||up===undefined){
        el.classList.add('pending');
        el.textContent='检测中';
        return;
    }
    if(up){
        el.classList.add('up');
        el.textContent='正常';
    }else{
        el.classList.add('down');
        el.textContent='异常';
    }
}
function setStatus(id,up){
    var dot=E(domId(id)+'_dot');
    var status=E(domId(id)+'_STATUS');
    if(dot)dot.classList.toggle('offline',up!==true);
    setStatusPill(status,up);
    setOffline(id,up===false);
}
function renderUptimeBar(id,row){
    var bar=E(domId(id)+'_bar');
    if(!bar||typeof renderUptimeFrame!=='function')return;
    renderUptimeFrame(bar,row.uptime_frame,{interval_sec:row.interval_sec||60});
}
function refreshChartTheme(chart){
    if(!chart)return;
    var ds=chart.data.datasets[0];
    ds.borderColor=chartLineColor();
    chart.options.scales.y.grid.color=chartGridColor();
    chart.update('none');
}
function updateLatencyChart(id,row){
    if(row.hide_latency_chart||typeof Chart==='undefined')return;
    var canvas=E(domId(id)+'_chart');
    if(!canvas)return;
    var hist=row.latency_history||[];
    var interval=(row.interval_sec||60)*1000;
    var end=row.checked_at||Date.now();
    var labels=[],points=[];
    for(var i=0;i<hist.length;i++){
        labels.push(new Date(end-(hist.length-1-i)*interval).toLocaleString());
        points.push(hist[i]);
    }
    if(svcCharts[id]){
        var ds=svcCharts[id].data.datasets[0];
        ds.data=points;
        svcCharts[id].data.labels=labels;
        refreshChartTheme(svcCharts[id]);
        return;
    }
    if(!points.length)return;
    try{
        svcCharts[id]=new Chart(canvas.getContext('2d'),{
            type:'line',
            data:{
                labels:labels,
                datasets:[{
                    data:points,
                    borderColor:chartLineColor(),
                    backgroundColor:'transparent',
                    borderWidth:2,
                    pointRadius:0,
                    tension:0.35,
                    spanGaps:false,
                }],
            },
            options:{
                responsive:true,
                maintainAspectRatio:false,
                animation:{duration:0},
                interaction:{mode:'index',intersect:false},
                plugins:{
                    legend:{display:false},
                    tooltip:{
                        callbacks:{
                            label:function(ctx){
                                if(ctx.parsed.y==null)return '异常';
                                return ctx.parsed.y+' ms';
                            },
                        },
                    },
                },
                scales:{
                    x:{
                        display:true,
                        ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:5,font:{size:10}},
                        grid:{display:false},
                    },
                    y:{
                        beginAtZero:true,
                        ticks:{font:{size:10}},
                        grid:{color:chartGridColor()},
                    },
                },
            },
        });
    }catch(e){
        console.error('service chart failed:',id,e);
    }
}
window.refreshServiceCharts=function(){
    for(var id in svcCharts){
        if(Object.prototype.hasOwnProperty.call(svcCharts,id))
            refreshChartTheme(svcCharts[id]);
    }
};
const SERVICE_POLL_MS=5000;
async function refreshServices(){
    try{
        var data=await fetch('/services/data').then(res=>res.json());
        for(var [id,row] of Object.entries(data)){
            setStatus(id,row.up);
            setText(id,'LATENCY',fmtLatency(row.latency_ms));
            setText(id,'UPTIME',fmtUptime(row.uptime_pct));
            setText(id,'TIME',fmtRelative(row.checked_at));
            renderUptimeBar(id,row);
            updateLatencyChart(id,row);
        }
        pulsePoll();
    }catch(e){
        console.error('services refresh failed:',e);
    }
}
refreshServices();
setInterval(refreshServices,SERVICE_POLL_MS);