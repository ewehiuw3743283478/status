"use strict";
const {decodeJson,normalizeMonitorData,normalizeMonitorRow}=require("../lib/monitor-data");

module.exports=driver=>{
const isPg=driver.type==="postgres";
const dataCast=isPg?"::jsonb":"";
const service_monitors={
    async ins(id,name,data,top=0,status=1){
        const payload=normalizeMonitorData(data);
        await driver.run(
            `INSERT INTO service_monitors (id,name,data,top,status) VALUES ($1,$2,$3${dataCast},$4,$5)`,
            [id,name,JSON.stringify(payload),top??0,status??1]
        );
    },
    async upd(id,name,data,top){
        const payload=normalizeMonitorData(data);
        await driver.run(
            `UPDATE service_monitors SET name=$1,data=$2${dataCast},top=$3 WHERE id=$4`,
            [name,JSON.stringify(payload),top??0,id]
        );
    },
    async upd_status(id,status){
        await driver.run(`UPDATE service_monitors SET status=$1 WHERE id=$2`,[status,id]);
    },
    async upd_top(id,top){
        await driver.run(`UPDATE service_monitors SET top=$1 WHERE id=$2`,[top,id]);
    },
    async merge_data(id,patch){
        const row=await driver.get(`SELECT data FROM service_monitors WHERE id=$1`,[id]);
        if(!row)return;
        const data=normalizeMonitorData({...decodeJson(row.data),...patch});
        await driver.run(
            `UPDATE service_monitors SET data=$1${dataCast} WHERE id=$2`,
            [JSON.stringify(data),id]
        );
    },
    async get(id){
        return normalizeMonitorRow(await driver.get(`SELECT * FROM service_monitors WHERE id=$1`,[id]));
    },
    async del(id){
        await driver.run(`DELETE FROM service_monitors WHERE id=$1`,[id]);
    },
    async all(){
        const rows=await driver.all(`SELECT * FROM service_monitors ORDER BY top DESC, name ASC`);
        return rows.map(normalizeMonitorRow);
    },
};
return {service_monitors};
};