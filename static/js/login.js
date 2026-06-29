async function login(){
    var pwd=E('password');
    if(!pwd||!String(pwd.value||'').trim()){
        notice('请输入管理密码');
        pwd&&pwd.focus();
        return;
    }
    startloading();
    try{
        var res=await postjson('/login',{
            password:md5(pwd.value),
        });
        endloading();
        if(res.status)redirect('/');
        else notice(res.data||'密码错误');
    }catch(e){
        endloading();
        notice('登录失败，请稍后重试');
    }
}
function initLoginPage(){
    if(typeof mdui!=='undefined'&&mdui.updateTextFields)mdui.updateTextFields();
    var btn=E('login');
    var pwd=E('password');
    if(btn)btn.onclick=login;
    if(pwd){
        pwd.onkeydown=function(e){
            if(e.key==='Enter')login();
        };
        pwd.focus();
    }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initLoginPage);
else initLoginPage();