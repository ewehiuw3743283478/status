"use strict";

const crypto=require("crypto");
const {promisify}=require("util");

const scryptAsync=promisify(crypto.scrypt);

const PREFIX="scrypt$";
const SALT_LEN=16;
const KEY_LEN=64;
const SCRYPT_N=16384;
const SCRYPT_R=8;
const SCRYPT_P=1;

function isPasswordHash(value){
    return typeof value==="string"&&value.startsWith(PREFIX);
}

function timingSafeEqualText(a,b){
    const left=Buffer.from(String(a));
    const right=Buffer.from(String(b));
    if(left.length!==right.length)return false;
    return crypto.timingSafeEqual(left,right);
}

async function hashPassword(password){
    const plain=String(password||"");
    if(!plain)throw new Error("empty password");
    const salt=crypto.randomBytes(SALT_LEN);
    const derived=await scryptAsync(plain,salt,KEY_LEN,{
        N:SCRYPT_N,
        r:SCRYPT_R,
        p:SCRYPT_P,
        maxmem:128*SCRYPT_N*SCRYPT_R*2,
    });
    return `${PREFIX}${salt.toString("base64")}$${derived.toString("base64")}`;
}

async function verifyPassword(password,stored){
    if(stored===null||stored===undefined||stored==="")return false;
    const plain=String(password||"");
    if(!plain)return false;
    if(!isPasswordHash(stored))return timingSafeEqualText(plain,stored);
    const parts=stored.split("$");
    if(parts.length!==3)return false;
    let salt;
    let expected;
    try{
        salt=Buffer.from(parts[1],"base64");
        expected=Buffer.from(parts[2],"base64");
    }catch{
        return false;
    }
    if(!salt.length||!expected.length)return false;
    const actual=await scryptAsync(plain,salt,expected.length,{
        N:SCRYPT_N,
        r:SCRYPT_R,
        p:SCRYPT_P,
        maxmem:128*SCRYPT_N*SCRYPT_R*2,
    });
    if(actual.length!==expected.length)return false;
    return crypto.timingSafeEqual(actual,expected);
}

async function migrateStoredPassword(stored){
    if(stored===null||stored===undefined||stored==="")return stored;
    if(isPasswordHash(stored))return stored;
    return hashPassword(String(stored));
}

module.exports={
    PREFIX,
    isPasswordHash,
    hashPassword,
    verifyPassword,
    migrateStoredPassword,
};