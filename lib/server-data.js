"use strict";
const {normalizeHideStats}=require("./hide-stats");

function decodeJson(val){
    if(val===null||val===undefined)return {};
    if(typeof val==="object")return val;
    try{return JSON.parse(val);}
    catch{return {};}
}

function normalizeServerData(data){
    data=data||{};
    if(!data.api)data.api={};
    const ssh=data.ssh||{};
    data.ssh={
        host:String(ssh.host||"").trim(),
        port:ssh.port!==""&&ssh.port!=null?Number(ssh.port):22,
        username:String(ssh.username||"").trim(),
        password:String(ssh.password||""),
        privateKey:String(ssh.privateKey||""),
    };
    data.device=String(data.device||"").trim();
    data.hide_stats=normalizeHideStats(data.hide_stats);
    return data;
}

function hasSshConfig(data){
    const ssh=data&&data.ssh;
    return !!(ssh&&String(ssh.host||"").trim());
}

function normalizeServerRow(server){
    if(!server)return server;
    server.data=normalizeServerData(decodeJson(server.data));
    return server;
}

module.exports={
    decodeJson,
    normalizeServerData,
    hasSshConfig,
    normalizeServerRow,
};