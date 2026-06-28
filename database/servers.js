"use strict";
module.exports=(driver)=>{
const isPg=driver.type==="postgres";
const dataCast=isPg?"::jsonb":"";
const servers={
    async ins(sid,name,data,top,status=1){
        await driver.run(
            `INSERT INTO servers (sid,name,data,top,status) VALUES ($1,$2,$3${dataCast},$4,$5)`,
            [sid,name,JSON.stringify(data),top,status]
        );
    },
    async upd(sid,name,data,top){
        await driver.run(
            `UPDATE servers SET name=$1,data=$2${dataCast},top=$3 WHERE sid=$4`,
            [name,JSON.stringify(data),top,sid]
        );
    },
    async upd_status(sid,status){
        await driver.run(`UPDATE servers SET status=$1 WHERE sid=$2`,[status,sid]);
    },
    async upd_data(sid,data){
        await driver.run(
            `UPDATE servers SET data=$1${dataCast} WHERE sid=$2`,
            [JSON.stringify(data),sid]
        );
    },
    async upd_top(sid,top){
        await driver.run(`UPDATE servers SET top=$1 WHERE sid=$2`,[top,sid]);
    },
    async get(sid){
        const server=await driver.get(`SELECT * FROM servers WHERE sid=$1`,[sid]);
        if(server){
            server.data=typeof server.data==="object"?server.data:JSON.parse(server.data);
        }
        return server;
    },
    async del(sid){
        await driver.run(`DELETE FROM servers WHERE sid=$1`,[sid]);
    },
    async all(){
        const svrs=await driver.all(`SELECT * FROM servers ORDER BY top DESC`);
        svrs.forEach(svr=>{
            svr.data=typeof svr.data==="object"?svr.data:JSON.parse(svr.data);
        });
        return svrs;
    },
};
return {servers};
};