"use strict";

const STAT_HIDE_KEYS=[
    "cpu",
    "mem",
    "bw",
    "traffic",
    "host",
    "devices",
    "charts",
];

const STAT_HIDE_LABELS={
    cpu:"CPU",
    mem:"内存",
    bw:"实时带宽",
    traffic:"总流量",
    host:"主机信息",
    devices:"网卡明细",
    charts:"历史图表",
};

function normalizeHideStats(val){
    if(!val)return [];
    const arr=Array.isArray(val)?val:[];
    const valid=new Set(STAT_HIDE_KEYS);
    return [...new Set(arr.filter(k=>valid.has(k)))];
}

function hideSet(hideStats){
    return new Set(normalizeHideStats(hideStats));
}

function isHidden(hideStats,key){
    return hideSet(hideStats).has(key);
}

function filterLiveStat(stat,hideStats){
    if(!stat||stat===false||typeof stat!=="object")return stat;
    const hide=hideSet(hideStats);
    if(!hide.size)return stat;
    const out={...stat};
    if(hide.has("cpu"))delete out.cpu;
    if(hide.has("mem"))delete out.mem;
    if(hide.has("host"))delete out.host;
    if(out.net){
        out.net={...out.net};
        if(hide.has("bw"))out.net.delta={in:null,out:null};
        if(hide.has("traffic"))out.net.total={in:null,out:null};
        if(hide.has("devices"))out.net.devices={};
    }
    return out;
}

function filterNode(node,hideStats,isAdmin){
    if(!node)return node;
    if(isAdmin||!node.stat||node.stat===false)return node;
    return {...node,stat:filterLiveStat(node.stat,hideStats)};
}

module.exports={
    STAT_HIDE_KEYS,
    STAT_HIDE_LABELS,
    normalizeHideStats,
    hideSet,
    isHidden,
    filterLiveStat,
    filterNode,
};