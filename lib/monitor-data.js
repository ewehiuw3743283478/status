"use strict";

const {safeHttpUrl}=require("./security");

function decodeJson(val){
    if(val===null||val===undefined)return {};
    if(typeof val==="object")return val;
    try{return JSON.parse(val);}
    catch{return {};}
}

function normalizeMonitorData(data){
    data=data||{};
    const type=data.type==="http"?"http":"tcp";
    data.type=type;
    data.host=String(data.host||"").trim();
    data.port=data.port!==""&&data.port!=null?Number(data.port):443;
    data.url=String(data.url||"").trim();
    data.tooltip=String(data.tooltip||"").trim();
    data.status_page_link=safeHttpUrl(
        data.status_page_link||data.display_url||""
    );
    data.method=String(data.method||"GET").toUpperCase();
    data.expect_code=data.expect_code!==""&&data.expect_code!=null?Number(data.expect_code):0;
    data.expect_body=String(data.expect_body||"");
    data.timeout_ms=Math.max(1000,Math.min(60000,Number(data.timeout_ms)||5000));
    data.interval_sec=Math.max(15,Math.min(3600,Number(data.interval_sec)||60));
    data.hide_latency_chart=data.hide_latency_chart===true;
    data.enabled=data.enabled!==false;
    if(data.uptime_daily&&typeof data.uptime_daily==="object"&&!Array.isArray(data.uptime_daily)){
        const daily={};
        for(const [key,val] of Object.entries(data.uptime_daily)){
            if(typeof key!=="string"||!val||typeof val!=="object")continue;
            const up=Number(val.up)||0;
            const total=Number(val.total)||0;
            if(total>0)daily[key]={up,total};
        }
        data.uptime_daily=daily;
    }else{
        data.uptime_daily={};
    }
    return data;
}

function normalizeMonitorRow(row){
    if(!row)return row;
    row.data=normalizeMonitorData(decodeJson(row.data));
    return row;
}

function monitorCheckTarget(data){
    if(!data)return "";
    if(data.type==="http")return data.url||"";
    if(!data.host)return "";
    return `${data.host}:${data.port}`;
}

function publicMonitorView(monitor){
    const data=monitor.data||{};
    return {
        id:monitor.id,
        name:monitor.name,
        tooltip:data.tooltip||undefined,
        link:data.status_page_link||undefined,
        hide_latency_chart:!!data.hide_latency_chart,
    };
}

module.exports={
    decodeJson,
    normalizeMonitorData,
    normalizeMonitorRow,
    monitorCheckTarget,
    publicMonitorView,
};