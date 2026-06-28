"use strict";
module.exports=async()=>{
    if(process.env.DATABASE_URL){
        for(let i=0;i<30;i++){
            try{
                return await require("./postgres")(process.env.DATABASE_URL);
            }catch(e){
                if(i===29)throw e;
                console.log("waiting for database...");
                await new Promise(r=>setTimeout(r,2000));
            }
        }
    }
    return require("./sqlite")(process.env.SQLITE_PATH);
};