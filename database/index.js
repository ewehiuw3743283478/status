"use strict";
module.exports=async()=>{
const driver=await require("./driver")();
const {servers}=require("./servers")(driver);
const {traffic,lt}=require("./traffic")(driver);
const {load_m,load_h}=require("./load")(driver);
const {service_monitors}=require("./service_monitors")(driver);
const {setting}=await require("./setting")(driver);
async function getServers(){return servers.all();}
return {
    driver,
    servers,getServers,
    traffic,lt,
    load_m,load_h,
    service_monitors,
    setting,
};
};