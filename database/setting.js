"use strict";
const {githubReleaseDownloadBase}=require("../lib/release");
const {migrateStoredPassword}=require("../lib/password");
module.exports=async(driver)=>{
const isPg=driver.type==="postgres";
const valCast=isPg?"::jsonb":"";
function decodeVal(val){
    if(val===null||val===undefined)return null;
    if(typeof val==="object")return val;
    if(typeof val==="number"||typeof val==="boolean")return val;
    if(typeof val==="string"){
        try{return JSON.parse(val);}
        catch{return val;}
    }
    return val;
}
function parseVal(pair){
    if(!pair)return null;
    return decodeVal(pair.val);
}
const setting={
    async ins(key,val){
        await driver.run(
            `INSERT INTO setting (skey,val) VALUES ($1,$2${valCast})`,
            [key,JSON.stringify(val)]
        );
    },
    async set(key,val){
        if(isPg){
            await driver.run(
                `INSERT INTO setting (skey,val) VALUES ($1,$2::jsonb) ON CONFLICT (skey) DO UPDATE SET val=EXCLUDED.val`,
                [key,JSON.stringify(val)]
            );
        }else{
            await driver.run(
                `REPLACE INTO setting (skey,val) VALUES ($1,$2)`,
                [key,JSON.stringify(val)]
            );
        }
    },
    async get(key){
        return parseVal(await driver.get(`SELECT val FROM setting WHERE skey=$1`,[key]));
    },
    async del(key){
        await driver.run(`DELETE FROM setting WHERE skey=$1`,[key]);
    },
    async all(){
        const s={};
        for(const {skey,val} of await driver.all(`SELECT skey,val FROM setting`)){
            s[skey]=decodeVal(val);
        }
        return s;
    },
};
async function init(key,val){
    const cur=await setting.get(key);
    if(cur===null||cur===undefined)await setting.ins(key,val);
}
await init("listen",5555);
await init("password","nekonekostatus");
const storedPassword=await setting.get("password");
const passwordHash=await migrateStoredPassword(storedPassword);
if(passwordHash!==storedPassword)await setting.set("password",passwordHash);
await init("site",{name:"Server Status",url:"http://localhost:5555"});
async function migrateKey(oldKey,newKey){
    const oldVal=await setting.get(oldKey);
    if(oldVal===null||oldVal===undefined)return;
    const newVal=await setting.get(newKey);
    if(newVal===null||newVal===undefined)await setting.set(newKey,oldVal);
    await setting.del(oldKey);
}
await migrateKey("neko_status_url","status_agent_url");
await init("status_agent_url",githubReleaseDownloadBase());
await init("theme","card");
await init("debug",0);
return {setting};
};