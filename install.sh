#!/bin/bash

clear && echo "\
############################################################

Server Status Panel 一键安装脚本
https://github.com/ewehiuw3743283478/status

############################################################
"

echo "安装即将开始

如果您想取消安装, 请在 5 秒钟内按 Ctrl+C 终止此脚本"
sleep 5

clear && echo "正在安装 npm, git, gcc"
yum install epel-release -y && yum install centos-release-scl git -y && yum install nodejs devtoolset-8-gcc* -y
apt update -y && apt-get install nodejs npm git build-essential -y

clear && echo "正在更新 npm"
bash -c "npm install n -g"
source /root/.bashrc
bash -c "n latest"
source /root/.bashrc
bash -c "npm install npm@latest -g"
source /root/.bashrc
bash -c "npm install forever -g"
source /root/.bashrc
cd /root/
clear && echo "正在克隆仓库"
git clone https://github.com/ewehiuw3743283478/status.git
cd status
git pull
clear && echo "正在安装依赖模块"
source /opt/rh/devtoolset-8/enable 2>/dev/null||true
npm install

echo "安装完成, 正在启动面板"

echo "[Unit]
Description=status-panel
After=network.target

[Service]
Type=simple
Restart=always
RestartSec=5
WorkingDirectory=/root/status
Environment=GITHUB_REPO=ewehiuw3743283478/status
ExecStart=/usr/bin/node status-panel.js

[Install]
WantedBy=multi-user.target" > /etc/systemd/system/status-panel.service
systemctl daemon-reload
systemctl enable status-panel.service
systemctl start status-panel.service
sleep 3
if systemctl status status-panel.service | grep "active (running)" > /dev/null
then
    echo "面板启动成功"
    echo ""
    echo "默认访问端口: 5555"
    echo "默认密码: nekonekostatus"
    echo ""
    echo "请及时修改密码！"
else
    echo "面板启动失败"
    systemctl status status-panel.service
fi