"use strict";
function pad(arr,len){
    for(let i=arr.length;i<len;++i)
        arr.unshift({cpu:0,mem:0,swap:0,ibw:0,obw:0});
    return arr;
}
function gen(driver,table,len){
    return{
        len,
        async ins(sid){
            await driver.run(
                `INSERT INTO ${table} (sid,cpu,mem,swap,ibw,obw) VALUES ($1,0,0,0,0,0)`,
                [sid]
            );
        },
        async select(sid){
            const rows=await driver.all(
                `SELECT cpu,mem,swap,ibw,obw FROM ${table} WHERE sid=$1 ORDER BY id ASC`,
                [sid]
            );
            return pad(rows,len);
        },
        async count(sid){
            const row=await driver.get(
                `SELECT COUNT(*) AS count FROM ${table} WHERE sid=$1`,
                [sid]
            );
            return Number(row?.count||0);
        },
        async shift(sid,{cpu,mem,swap,ibw,obw}){
            if(await this.count(sid)>=this.len){
                await driver.deleteOldest(table,sid);
            }
            await driver.run(
                `INSERT INTO ${table} (sid,cpu,mem,swap,ibw,obw) VALUES ($1,$2,$3,$4,$5,$6)`,
                [sid,cpu,mem,swap,ibw,obw]
            );
        },
        async del_sid(sid){
            await driver.run(`DELETE FROM ${table} WHERE sid=$1`,[sid]);
        },
    };
}
module.exports=(driver)=>({
    load_m:gen(driver,"load_m",60),
    load_h:gen(driver,"load_h",24),
});