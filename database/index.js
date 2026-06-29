"use strict";
module.exports=async()=>{
const driver=await require("./driver")();
const {servers}=require("./servers")(driver);
const {traffic,lt}=require("./traffic")(driver);
const {load_m,load_h}=require("./load")(driver);
const {ssh_scripts}=require("./ssh_scripts")(driver);
const {service_monitors}=require("./service_monitors")(driver);
const {setting}=await require("./setting")(driver);
async function getServers(){return servers.all();}
return {
    driver,
    servers,getServers,
    traffic,lt,
    load_m,load_h,
    ssh_scripts,
    service_monitors,
    setting,
};
};