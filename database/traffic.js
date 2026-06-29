"use strict";
function shift(a){a.shift();a.push([0,0]);return a;}
function parseBuckets(row){
    if(!row)return null;
    return{
        hs:typeof row.hs==="object"?row.hs:JSON.parse(row.hs),
        ds:typeof row.ds==="object"?row.ds:JSON.parse(row.ds),
        ms:typeof row.ms==="object"?row.ms:JSON.parse(row.ms),
    };
}
module.exports=(driver)=>{
const isPg=driver.type==="postgres";
const jsonCast=isPg?"::jsonb":"";
const emptyBuckets=()=>({
    hs:new Array(24).fill([0,0]),
    ds:new Array(31).fill([0,0]),
    ms:new Array(12).fill([0,0]),
});
const traffic={
    async ins(sid){
        const buckets=emptyBuckets();
        await driver.run(
            `INSERT INTO traffic (sid,hs,ds,ms) VALUES ($1,$2${jsonCast},$3${jsonCast},$4${jsonCast})`,
            [sid,JSON.stringify(buckets.hs),JSON.stringify(buckets.ds),JSON.stringify(buckets.ms)]
        );
    },
    async get(sid){
        const t=await driver.get(`SELECT hs,ds,ms FROM traffic WHERE sid=$1`,[sid]);
        if(t)return parseBuckets(t);
        await this.ins(sid);
        return emptyBuckets();
    },
    async UPD(sid,hs,ds,ms){
        await driver.run(
            `UPDATE traffic SET hs=$1${jsonCast},ds=$2${jsonCast},ms=$3${jsonCast} WHERE sid=$4`,
            [JSON.stringify(hs),JSON.stringify(ds),JSON.stringify(ms),sid]
        );
    },
    async upd_hs(sid,hs){
        await driver.run(
            `UPDATE traffic SET hs=$1${jsonCast} WHERE sid=$2`,
            [JSON.stringify(hs),sid]
        );
    },
    async upd_ds(sid,ds){
        await driver.run(
            `UPDATE traffic SET ds=$1${jsonCast} WHERE sid=$2`,
            [JSON.stringify(ds),sid]
        );
    },
    async upd_ms(sid,ms){
        await driver.run(
            `UPDATE traffic SET ms=$1${jsonCast} WHERE sid=$2`,
            [JSON.stringify(ms),sid]
        );
    },
    async del(sid){
        await driver.run(`DELETE FROM traffic WHERE sid=$1`,[sid]);
    },
    async all(){
        return driver.all(`SELECT * FROM traffic`);
    },
    async add(sid,tf){
        const {hs,ds,ms}=await this.get(sid);
        hs[23][0]+=tf[0];ds[30][0]+=tf[0];ms[11][0]+=tf[0];
        hs[23][1]+=tf[1];ds[30][1]+=tf[1];ms[11][1]+=tf[1];
        await this.UPD(sid,hs,ds,ms);
    },
    async shift_hs(){
        for(const row of await this.all()){
            await this.upd_hs(row.sid,shift(parseBuckets(row).hs));
        }
    },
    async shift_ds(){
        for(const row of await this.all()){
            await this.upd_ds(row.sid,shift(parseBuckets(row).ds));
        }
    },
    async shift_ms(){
        for(const row of await this.all()){
            await this.upd_ms(row.sid,shift(parseBuckets(row).ms));
        }
    },
};
const lt={
    async ins(sid,traffic=[0,0]){
        await driver.run(
            `INSERT INTO lt (sid,traffic) VALUES ($1,$2${jsonCast})`,
            [sid,JSON.stringify(traffic)]
        );
        return {sid,traffic};
    },
    async get(sid){
        const x=await driver.get(`SELECT * FROM lt WHERE sid=$1`,[sid]);
        if(x)x.traffic=typeof x.traffic==="object"?x.traffic:JSON.parse(x.traffic);
        return x;
    },
    async set(sid,traffic){
        await driver.run(
            `UPDATE lt SET traffic=$1${jsonCast} WHERE sid=$2`,
            [JSON.stringify(traffic),sid]
        );
    },
    async del(sid){
        await driver.run(`DELETE FROM lt WHERE sid=$1`,[sid]);
    },
};
return {traffic,lt};
};