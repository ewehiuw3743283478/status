function uptimeBarColor(pct){
    if(pct==null)return '#bdbdbd';
    var n=Number(pct);
    if(isNaN(n))return '#bdbdbd';
    if(n>=99.9)return '#3bd671';
    if(n>=99)return '#9deab8';
    if(n>=95)return '#f29030';
    return '#df484a';
}
function fmtFrameDate(dateStr){
    var d=new Date(dateStr+'T00:00:00');
    return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
}
function fmtDowntime(checks,intervalSec){
    if(!checks||!intervalSec)return '';
    var sec=checks*intervalSec;
    if(sec<60)return sec+' 秒';
    if(sec<3600)return Math.floor(sec/60)+' 分钟';
    var h=Math.floor(sec/3600);
    var m=Math.floor((sec%3600)/60);
    return m?h+' 小时 '+m+' 分钟':h+' 小时';
}
function frameTooltip(frame,intervalSec){
    if(frame.pct==null||!frame.total){
        return fmtFrameDate(frame.date)+' · 无数据';
    }
    var lines=[fmtFrameDate(frame.date)+' · '+frame.pct+'% 可用'];
    var down=frame.total-frame.up;
    if(down>0&&intervalSec){
        lines.push('中断约 '+fmtDowntime(down,intervalSec));
    }
    return lines.join('\n');
}
function renderUptimeFrame(container,frames,opts){
    if(typeof container==='string')container=E(container);
    if(!container)return;
    opts=opts||{};
    var intervalSec=opts.interval_sec||60;
    var bar=container.querySelector('.uptime-frame-bars');
    if(!bar){
        bar=document.createElement('div');
        bar.className='uptime-frame-bars';
        var legend=container.querySelector('.uptime-frame-legend');
        if(legend)container.insertBefore(bar,legend);
        else container.appendChild(bar);
    }
    bar.innerHTML='';
    if(!frames||!frames.length){
        container.classList.add('uptime-frame-empty');
        return;
    }
    var hasData=false;
    for(var i=0;i<frames.length;i++){
        if(frames[i].pct!=null&&frames[i].total>0){
            hasData=true;
            break;
        }
    }
    container.classList.toggle('uptime-frame-empty',!hasData);
    for(var j=0;j<frames.length;j++){
        var f=frames[j];
        var seg=document.createElement('span');
        seg.className='uptime-frame-bar';
        seg.style.backgroundColor=uptimeBarColor(f.pct);
        seg.title=frameTooltip(f,intervalSec);
        seg.setAttribute('aria-label',seg.title);
        bar.appendChild(seg);
    }
}
window.renderUptimeFrame=renderUptimeFrame;