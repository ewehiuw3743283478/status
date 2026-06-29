"use strict";
const {normalizeServerData,normalizeServerRow}=require("../lib/server-data");
module.exports=(driver)=>{
const isPg=driver.type==="postgres";
const dataCast=isPg?"::jsonb":"";
const servers={
    async ins(sid,name,data,top=0,status=1){
        const payload=normalizeServerData(data);
        await driver.run(
            `INSERT INTO servers (sid,name,data,top,status) VALUES ($1,$2,$3${dataCast},$4,$5)`,
            [sid,name,JSON.stringify(payload),top??0,status??1]
        );
    },
    async upd(sid,name,data,top){
        const payload=normalizeServerData(data);
        await driver.run(
            `UPDATE servers SET name=$1,data=$2${dataCast},top=$3 WHERE sid=$4`,
            [name,JSON.stringify(payload),top??0,sid]
        );
    },
    async upd_status(sid,status){
        await driver.run(`UPDATE servers SET status=$1 WHERE sid=$2`,[status,sid]);
    },
    async upd_data(sid,data){
        const payload=normalizeServerData(data);
        await driver.run(
            `UPDATE servers SET data=$1${dataCast} WHERE sid=$2`,
            [JSON.stringify(payload),sid]
        );
    },
    async upd_top(sid,top){
        await driver.run(`UPDATE servers SET top=$1 WHERE sid=$2`,[top,sid]);
    },
    async get(sid){
        return normalizeServerRow(await driver.get(`SELECT * FROM servers WHERE sid=$1`,[sid]));
    },
    async del(sid){
        await driver.run(`DELETE FROM servers WHERE sid=$1`,[sid]);
    },
    async all(){
        const svrs=await driver.all(`SELECT * FROM servers ORDER BY top DESC`);
        return svrs.map(normalizeServerRow);
    },
};
return {servers};
};