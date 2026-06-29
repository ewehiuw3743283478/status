"use strict";
module.exports=(driver)=>{
const ssh_scripts={
    async ins(id,name,content){
        await driver.run(
            `INSERT INTO ssh_scripts (id,name,content) VALUES ($1,$2,$3)`,
            [id,name,content]
        );
    },
    async get(id){
        return driver.get(`SELECT * FROM ssh_scripts WHERE id=$1`,[id]);
    },
    async upd(id,name,content){
        await driver.run(
            `UPDATE ssh_scripts SET name=$1,content=$2 WHERE id=$3`,
            [name,content,id]
        );
    },
    async del(id){
        await driver.run(`DELETE FROM ssh_scripts WHERE id=$1`,[id]);
    },
    async all(){
        return driver.all(`SELECT * FROM ssh_scripts`);
    },
};
return {ssh_scripts};
};