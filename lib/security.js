"use strict";

const crypto=require("crypto");

const CSRF_COOKIE="csrf";
const CSRF_HEADER="x-csrf-token";

const CSRF_SKIP_PATHS=new Set([
    "/stats/update",
    "/login",
]);

function isSecureRequest(req){
    if(!req)return process.env.NODE_ENV==="production"||process.env.FORCE_SECURE_COOKIE==="1";
    return req.secure===true
        ||String(req.headers["x-forwarded-proto"]||"").split(",")[0].trim()==="https"
        ||process.env.FORCE_SECURE_COOKIE==="1";
}

function sessionCookieOpts(req){
    return{
        httpOnly:true,
        secure:isSecureRequest(req),
        sameSite:"lax",
        path:"/",
        maxAge:30*24*60*60*1000,
    };
}

function csrfCookieOpts(req){
    return{
        httpOnly:false,
        secure:isSecureRequest(req),
        sameSite:"lax",
        path:"/",
        maxAge:30*24*60*60*1000,
    };
}

function safeHttpUrl(url){
    if(!url)return "";
    let s=String(url).trim();
    if(!s)return "";
    if(!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(s))s="https://"+s;
    try{
        const u=new URL(s);
        if(u.protocol!=="http:"&&u.protocol!=="https:")return "";
        return u.href;
    }catch{
        return "";
    }
}

function ensureCsrfCookie(req,res,sessionCsrf,sessionId){
    const sid=sessionId||req.cookies?.token;
    let token=req.cookies[CSRF_COOKIE];
    if(!token&&sessionCsrf?.get&&sid)token=sessionCsrf.get(sid);
    if(!token){
        token=crypto.randomBytes(32).toString("hex");
        res.cookie(CSRF_COOKIE,token,csrfCookieOpts(req));
    }
    if(sessionCsrf?.set&&sid)sessionCsrf.set(sid,token);
    return token;
}

function csrfProtection(req,res,next,pr,sessionCsrf){
    if(CSRF_SKIP_PATHS.has(req.path))return next();
    if(req.path.startsWith("/bot"))return next();
    if(req.method==="GET"||req.method==="HEAD"||req.method==="OPTIONS")return next();
    const header=req.headers[CSRF_HEADER];
    if(!header)
        return res.status(403).json(pr(0,"请求验证失败，请刷新页面后重试"));
    const cookie=req.cookies[CSRF_COOKIE];
    const sessionToken=req.cookies?.token;
    const sessionMatch=sessionCsrf&&sessionToken&&sessionCsrf.get(sessionToken)===header;
    if((cookie&&cookie===header)||sessionMatch)return next();
    return res.status(403).json(pr(0,"请求验证失败，请刷新页面后重试"));
}

function securityHeaders(req,res,next){
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("X-Frame-Options","SAMEORIGIN");
    res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
    res.setHeader(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "script-src 'self' https://cdn.staticfile.org https://cdn.jsdelivr.net 'unsafe-inline'",
            "style-src 'self' https://cdn.staticfile.org https://cdn.jsdelivr.net 'unsafe-inline'",
            "img-src 'self' data:",
            "connect-src 'self' ws: wss:",
            "font-src 'self' https://cdn.staticfile.org",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join("; ")
    );
    next();
}

function settingBaseline(setting){
    if(!setting)return {};
    return {
        listen:setting.listen,
        theme:setting.theme,
        debug:setting.debug,
        site:setting.site,
        status_agent_url:setting.status_agent_url,
        bot:{
            chatIds:setting.bot?.chatIds,
            webhook:setting.bot?.webhook,
        },
    };
}

module.exports={
    CSRF_COOKIE,
    CSRF_HEADER,
    sessionCookieOpts,
    csrfCookieOpts,
    CSRF_SKIP_PATHS,
    isSecureRequest,
    safeHttpUrl,
    ensureCsrfCookie,
    csrfProtection,
    securityHeaders,
    settingBaseline,
};