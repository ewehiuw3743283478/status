function copy(text){
    var x=document.createElement("textarea");
    x.textContent=text;document.body.appendChild(x);
    x.select();document.execCommand('copy');
    x.remove();
    mdui.snackbar({message: "复制成功",position: "top"});
}
function E(id){return document.getElementById(id);}
function V(id){var el=E(id);return el?el.value:"";}
function escapeHtml(text){
    return String(text)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#39;");
}
function getCsrfToken(){
    var meta=document.querySelector('meta[name="csrf-token"]');
    if(meta&&meta.content)return meta.content;
    var m=document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
    return m?decodeURIComponent(m[1]):"";
}
function isSafeUrl(url){
    if(!url)return false;
    try{
        var u=new URL(url,window.location.origin);
        return u.protocol==="http:"||u.protocol==="https:";
    }catch(e){
        return false;
    }
}

var Loading=E("loading");
function startloading(){
    if(Loading){
        Loading.hidden=false;
        Loading.setAttribute("aria-hidden","false");
    }
}
function endloading(){
    if(Loading){
        Loading.hidden=true;
        Loading.setAttribute("aria-hidden","true");
    }
}
async function postjson(url,data){
    var headers={
        "content-type":"application/json",
        "X-CSRF-Token":getCsrfToken(),
    };
    try{
        var resp=await fetch(url,{
            method: "POST",
            body:JSON.stringify(data),
            headers,
            credentials:"same-origin",
        });
        var res=await resp.json();
        if(!resp.ok&&!res.data)res={status:0,data:"请求失败 ("+resp.status+")"};
        return res;
    }catch(e){
        return {status:0,data:"网络错误，请刷新页面后重试"};
    }
}
function notice(message,timeout=2000,position="top"){
    mdui.snackbar({message:escapeHtml(message),timeout,position});
}
function open(url){
    if(!isSafeUrl(url))return;
    var x=document.createElement('a');
    x.href=url;
    x.rel="noopener noreferrer";
    x.click();x.remove();
}
function sleep(ti){return new Promise((resolve)=>setTimeout(resolve,ti));}
function refreshPage(ti=600){sleep(ti).then(()=>{window.location.reload()});}
function redirect(url,ti=600){sleep(ti).then(()=>{window.location=url});}

function setQuery(key,val){
    var x=new URLSearchParams(window.location.search);
    x.set(key,val);
    window.location.search=x.toString();
}
function delQuery(key){
    var x=new URLSearchParams(window.location.search);
    x.delete(key);
    window.location.search=x.toString();
}
window.onload=()=>{
    document.querySelectorAll("[href]").forEach(x=>{
        if(x.tagName!='A'&&x.tagName!='LINK'){
            var href=x.getAttribute("href");
            if(!isSafeUrl(href))return;
            x.onclick=()=>{open(href);};
        }
    });
    document.querySelectorAll(".ccp").forEach(x=>{
        x.onclick=(x)=>{copy(x.target.innerText);};
        x.setAttribute("mdui-tooltip","{content:'点击复制'}");
    });
};