"use strict";
const net=require("net");
const fetch=require("node-fetch");

function tcpCheck(host,port,timeoutMs){
    return new Promise(resolve=>{
        const start=Date.now();
        const socket=new net.Socket();
        let settled=false;
        const finish=(up,error)=>{
            if(settled)return;
            settled=true;
            try{socket.destroy();}catch{}
            resolve({
                up:!!up,
                latency_ms:Date.now()-start,
                error:error||"",
            });
        };
        socket.setTimeout(timeoutMs);
        socket.once("connect",()=>finish(true));
        socket.once("timeout",()=>finish(false,"TCP timeout"));
        socket.once("error",err=>finish(false,err.message||"TCP error"));
        socket.connect(port,host);
    });
}

async function httpCheck(opts){
    const start=Date.now();
    const url=opts.url;
    const method=opts.method||"GET";
    const timeoutMs=opts.timeout_ms||5000;
    const expectCode=opts.expect_code||0;
    const expectBody=opts.expect_body||"";
    try{
        const res=await fetch(url,{
            method,
            timeout:timeoutMs,
            redirect:"follow",
            headers:{"User-Agent":"status-panel-monitor/1.0"},
        });
        const body=await res.text();
        const latency_ms=Date.now()-start;
        if(expectCode>0&&res.status!==expectCode){
            return {up:false,latency_ms,error:`HTTP ${res.status}, expected ${expectCode}`};
        }
        if(!expectCode&&(res.status<200||res.status>=400)){
            return {up:false,latency_ms,error:`HTTP ${res.status}`};
        }
        if(expectBody&&(!body||!body.includes(expectBody))){
            return {up:false,latency_ms,error:"response body mismatch"};
        }
        return {up:true,latency_ms,error:""};
    }catch(e){
        return {up:false,latency_ms:Date.now()-start,error:e.message||"HTTP error"};
    }
}

async function runMonitorCheck(monitor){
    const data=monitor.data;
    if(!data.enabled)return null;
    if(data.type==="http"){
        if(!data.url)return {up:false,latency_ms:0,error:"missing url"};
        return httpCheck(data);
    }
    if(!data.host)return {up:false,latency_ms:0,error:"missing host"};
    return tcpCheck(data.host,data.port,data.timeout_ms);
}

module.exports={tcpCheck,httpCheck,runMonitorCheck};