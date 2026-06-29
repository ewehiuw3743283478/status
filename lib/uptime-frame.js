"use strict";

const UPTIME_FRAME_DAYS=90;

function uptimeBarColor(pct){
    const n=Number(pct);
    if(Number.isNaN(n))return "#bdbdbd";
    if(n>=99.9)return "#3bd671";
    if(n>=99)return "#9deab8";
    if(n>=95)return "#f29030";
    return "#df484a";
}

function todayKey(ts=Date.now()){
    return new Date(ts).toISOString().slice(0, 10);
}

function trimDaily(daily){
    const keys=Object.keys(daily).sort();
    while(keys.length>UPTIME_FRAME_DAYS){
        delete daily[keys.shift()];
    }
    return daily;
}

function bumpDaily(daily,up,ts=Date.now()){
    daily={...daily||{}};
    const key=todayKey(ts);
    const bucket=daily[key]||{up:0,total:0};
    bucket.total+=1;
    if(up)bucket.up+=1;
    daily[key]=bucket;
    return trimDaily(daily);
}

function buildUptimeFrame(monitor,state){
    const daily={...(monitor?.data?.uptime_daily||{})};
    const history=state?.history||[];
    const interval=(monitor?.data?.interval_sec||60)*1000;
    const end=state?.checked_at||Date.now();
    const today=todayKey(end);

    if(history.length){
        const liveToday={up:0,total:0};
        for(let i=0;i<history.length;i++){
            const ts=end-(history.length-1-i)*interval;
            if(todayKey(ts)!==today)continue;
            liveToday.total+=1;
            if(history[i])liveToday.up+=1;
        }
        if(liveToday.total>0){
            const saved=daily[today]||{up:0,total:0};
            daily[today]=liveToday.total>=saved.total?liveToday:saved;
        }
    }

    const frames=[];
    const base=new Date();
    base.setHours(0,0,0,0);
    for(let i=UPTIME_FRAME_DAYS-1;i>=0;i--){
        const d=new Date(base.getTime()-i*86400000);
        const key=d.toISOString().slice(0,10);
        const b=daily[key];
        const pct=b&&b.total>0?Math.round(b.up/b.total*1000)/10:null;
        frames.push({
            date:key,
            pct,
            up:b?.up||0,
            total:b?.total||0,
        });
    }
    return frames;
}

module.exports={
    UPTIME_FRAME_DAYS,
    uptimeBarColor,
    todayKey,
    trimDaily,
    bumpDaily,
    buildUptimeFrame,
};