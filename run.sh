#!/bin/sh
cd /opt/status/
forever start -o log/out.log -e log/err.log status-panel.js