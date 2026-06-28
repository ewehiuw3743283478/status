"use strict";

const AGENT_BINARY_PREFIX="status-agent_linux_";

function githubReleaseDownloadBase(repo){
    const slug=String(repo||process.env.GITHUB_REPO||"ewehiuw3743283478/status").trim().replace(/^\/+|\/+$/g,"");
    if(!slug)return "";
    return `https://github.com/${slug}/releases/latest/download`;
}

function agentBinaryUrl(arch,status_agent_url){
    const custom=String(status_agent_url||"").trim();
    const base=custom||githubReleaseDownloadBase();
    if(!base)return "";
    if(/status-agent_linux_(amd64|arm64)$/.test(base))return base;
    if(/neko-status_linux_(amd64|arm64)$/.test(base))return base;
    return `${base.replace(/\/$/,"")}/${AGENT_BINARY_PREFIX}${arch}`;
}

module.exports={githubReleaseDownloadBase,agentBinaryUrl,AGENT_BINARY_PREFIX};