"use strict";
const {Pool}=require("pg");
const SCHEMA=`
CREATE TABLE IF NOT EXISTS servers (
    sid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    top INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS setting (
    skey TEXT PRIMARY KEY,
    val JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS traffic (
    sid TEXT PRIMARY KEY,
    hs JSONB NOT NULL,
    ds JSONB NOT NULL,
    ms JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS lt (
    sid TEXT PRIMARY KEY,
    traffic JSONB NOT NULL DEFAULT '[0,0]'
);
CREATE TABLE IF NOT EXISTS load_m (
    id SERIAL PRIMARY KEY,
    sid TEXT NOT NULL,
    cpu REAL NOT NULL DEFAULT 0,
    mem REAL NOT NULL DEFAULT 0,
    swap REAL NOT NULL DEFAULT 0,
    ibw REAL NOT NULL DEFAULT 0,
    obw REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS load_h (
    id SERIAL PRIMARY KEY,
    sid TEXT NOT NULL,
    cpu REAL NOT NULL DEFAULT 0,
    mem REAL NOT NULL DEFAULT 0,
    swap REAL NOT NULL DEFAULT 0,
    ibw REAL NOT NULL DEFAULT 0,
    obw REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ssh_scripts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS service_monitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    top INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_load_m_sid ON load_m(sid);
CREATE INDEX IF NOT EXISTS idx_load_h_sid ON load_h(sid);
`;
module.exports=async(url)=>{
    const pool=new Pool({
        connectionString:url,
        max:20,
    });
    const client=await pool.connect();
    try{
        await client.query(SCHEMA);
    }finally{
        client.release();
    }
    return{
        type:"postgres",
        pool,
        async run(sql,params=[]){await pool.query(sql,params);},
        async get(sql,params=[]){const r=await pool.query(sql,params);return r.rows[0]||null;},
        async all(sql,params=[]){const r=await pool.query(sql,params);return r.rows;},
        async deleteOldest(table,sid){
            await pool.query(
                `DELETE FROM ${table} WHERE id IN (SELECT id FROM ${table} WHERE sid=$1 ORDER BY id ASC LIMIT 1)`,
                [sid]
            );
        },
        async backup(path){
            const {execFile}=require("child_process");
            const {promisify}=require("util");
            const exec=promisify(execFile);
            const urlObj=new URL(url);
            await exec("pg_dump",[
                "-h",urlObj.hostname,
                "-p",urlObj.port||"5432",
                "-U",urlObj.username,
                "-d",urlObj.pathname.slice(1),
                "-f",path,
                "--no-owner","--no-acl",
            ],{env:{...process.env,PGPASSWORD:decodeURIComponent(urlObj.password)}});
        },
        async close(){await pool.end();},
    };
};