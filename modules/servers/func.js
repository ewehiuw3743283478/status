const ssh=require("../../ssh"),
    {githubReleaseDownloadBase,AGENT_BINARY_PREFIX}=require("../../lib/release");
function agentDownloadBase(status_agent_url){
    const custom=String(status_agent_url||"").trim();
    if(custom){
        if(new RegExp(`${AGENT_BINARY_PREFIX}(amd64|arm64)$`).test(custom))return custom.replace(new RegExp(`${AGENT_BINARY_PREFIX}(amd64|arm64)$`),"");
        if(/neko-status_linux_(amd64|arm64)$/.test(custom))return custom.replace(/neko-status_linux_(amd64|arm64)$/,"");
        if(/\/status-agent$/.test(custom))return custom.replace(/\/status-agent$/,"");
        if(/\/neko-status$/.test(custom))return custom.replace(/\/neko-status$/,"");
        return custom.replace(/\/$/,"");
    }
    return githubReleaseDownloadBase();
}
function buildInstallScript(server,status_agent_url,panel_url){
    const base=agentDownloadBase(status_agent_url);
    return `wget --version||yum install wget -y||apt-get install wget -y
ARCH=$(uname -m)
case "$ARCH" in
x86_64|amd64) AGENT_ARCH=amd64 ;;
aarch64|arm64) AGENT_ARCH=arm64 ;;
*) echo "unsupported architecture: $ARCH"; exit 1 ;;
esac
AGENT_URL="${base}/${AGENT_BINARY_PREFIX}\${AGENT_ARCH}"
/usr/bin/status-agent -v||(wget "$AGENT_URL" -O /usr/bin/status-agent && chmod +x /usr/bin/status-agent)
systemctl stop status-agent 2>/dev/null||systemctl stop nekonekostatus 2>/dev/null||true
mkdir -p /etc/status-agent/
echo "sid: ${server.sid}
key: ${server.data.api.key}
url: ${panel_url}
debug: false" > /etc/status-agent/config.yaml
echo "[Unit]
Description=status-agent

[Service]
Restart=always
RestartSec=5
ExecStart=/usr/bin/status-agent -c /etc/status-agent/config.yaml

[Install]
WantedBy=multi-user.target" > /etc/systemd/system/status-agent.service
systemctl daemon-reload
systemctl start status-agent
systemctl enable status-agent`;
}
function getInstallScript(server,status_agent_url,panel_url){
    return buildInstallScript(server,status_agent_url,panel_url);
}
async function initServer(server,status_agent_url,panel_url){
    if(!server||!server.data||!server.data.ssh||!String(server.data.ssh.host||"").trim())
        return {status:0,data:"未配置 SSH"};
    var res=await ssh.Exec(server.data.ssh,buildInstallScript(server,status_agent_url,panel_url));
    if(res.success)return {status:1,data:"安装成功"};
    return {status:0,data:"SSH 连接失败，请检查 SSH 配置或改用手动安装脚本"};
}
async function updateServer(server,status_agent_url,panel_url){
    const base=agentDownloadBase(status_agent_url);
    var sh=
`rm -f /usr/bin/status-agent /usr/bin/neko-status
ARCH=$(uname -m)
case "$ARCH" in
x86_64|amd64) AGENT_ARCH=amd64 ;;
aarch64|arm64) AGENT_ARCH=arm64 ;;
*) echo "unsupported architecture: $ARCH"; exit 1 ;;
esac
wget "${base}/${AGENT_BINARY_PREFIX}\${AGENT_ARCH}" -O /usr/bin/status-agent
chmod +x /usr/bin/status-agent
mkdir -p /etc/status-agent/
echo "sid: ${server.sid}
key: ${server.data.api.key}
url: ${panel_url}
debug: false" > /etc/status-agent/config.yaml
systemctl restart status-agent 2>/dev/null||systemctl restart nekonekostatus`;
    await ssh.Exec(server.data.ssh,sh);
    return {status:1,data:"更新成功"};
}
module.exports={
    initServer,updateServer,getInstallScript,buildInstallScript,agentDownloadBase,
}