"use strict";
const Database=require("better-sqlite3");
const path=require("path");
const SCHEMA=`
CREATE TABLE IF NOT EXISTS servers (sid TEXT PRIMARY KEY,name TEXT,data TEXT,top INTEGER,status INTEGER);
CREATE TABLE IF NOT EXISTS setting (skey TEXT PRIMARY KEY,val TEXT);
CREATE TABLE IF NOT EXISTS traffic (sid TEXT PRIMARY KEY,hs TEXT,ds TEXT,ms TEXT);
CREATE TABLE IF NOT EXISTS lt (sid TEXT PRIMARY KEY,traffic TEXT);
CREATE TABLE IF NOT EXISTS load_m (id INTEGER PRIMARY KEY AUTOINCREMENT,sid TEXT,cpu REAL,mem REAL,swap REAL,ibw REAL,obw REAL);
CREATE TABLE IF NOT EXISTS load_h (id INTEGER PRIMARY KEY AUTOINCREMENT,sid TEXT,cpu REAL,mem REAL,swap REAL,ibw REAL,obw REAL);
CREATE TABLE IF NOT EXISTS ssh_scripts (id TEXT PRIMARY KEY,name TEXT,content TEXT);
`;
module.exports=async(dbPath)=>{
    const file=dbPath||path.join(__dirname,"..","db.db");
    const db=new Database(file);
    db.exec(SCHEMA);
    try{
        const cols=db.prepare("PRAGMA table_info(setting)").all();
        if(cols.some(c=>c.name==="key")&&!cols.some(c=>c.name==="skey")){
            db.exec("ALTER TABLE setting RENAME TO setting_old");
            db.exec("CREATE TABLE setting (skey TEXT PRIMARY KEY,val TEXT)");
            db.exec("INSERT INTO setting SELECT key,val FROM setting_old");
            db.exec("DROP TABLE setting_old");
        }
    }catch{}
    return{
        type:"sqlite",
        db,
        file,
        async run(sql,params=[]){
            db.prepare(sql.replace(/\$\d+/g,"?")).run(...params);
        },
        async get(sql,params=[]){
            return db.prepare(sql.replace(/\$\d+/g,"?")).get(...params)||null;
        },
        async all(sql,params=[]){
            return db.prepare(sql.replace(/\$\d+/g,"?")).all(...params);
        },
        async deleteOldest(table,sid){
            db.prepare(`DELETE FROM ${table} WHERE sid=? LIMIT 1`).run(sid);
        },
        async backup(dest){
            await db.backup(dest);
        },
        async close(){db.close();},
    };
};