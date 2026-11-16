/* Runtime loader — @auipage/react 文档
 *
 * 组件库是 UMD/IIFE 包，需要全局 React。文档按访问方式决定依赖来源：
 *   · localhost / 127.0.0.1 → 项目自己的 node_modules 与 dist（跑真实产物）
 *   · 线上域名 → CDN（unpkg → jsdelivr → npmmirror 依次降级）
 *   · ?cdn=1 → 强制走 CDN（用于本地验证线上分支）
 */
(function () {
    "use strict";

    var script = document.currentScript;
    var base = (script && script.getAttribute("data-base")) || "";
    var demo = (script && script.getAttribute("data-demo")) || "assets/js/demos.js";

    var host = location.hostname;
    var isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
    var forceCdn = /(\?|&)cdn=1/.test(location.search);
    var preferLocal = isLocal && !forceCdn;

    /* 从页面到项目根：docs/index.html → ../，docs/guide/x.html → ../../ */
    var root = base + "../";

    var LOCAL = {
        react: root + "node_modules/react/umd/react.production.min.js",
        reactDom: root + "node_modules/react-dom/umd/react-dom.production.min.js",
        lib: root + "dist/auipage-react.iife.js"
    };

    var CDN = {
        react: [
            "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
            "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js",
            "https://registry.npmmirror.com/react/18.3.1/files/umd/react.production.min.js"
        ],
        reactDom: [
            "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
            "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js",
            "https://registry.npmmirror.com/react-dom/18.3.1/files/umd/react-dom.production.min.js"
        ],
        lib: [
            "https://unpkg.com/@auipage/react@latest/dist/auipage-react.iife.js",
            "https://cdn.jsdelivr.net/npm/@auipage/react@latest/dist/auipage-react.iife.js",
            "https://registry.npmmirror.com/@auipage/react/latest/files/dist/auipage-react.iife.js"
        ]
    };

    function banner(text, kind) {
        var el = document.createElement("div");
        el.className = kind ? "banner banner-" + kind : "banner";
        el.style.borderLeft = "3px solid #facc15";
        el.textContent = text;
        document.body.insertBefore(el, document.body.firstChild.nextSibling);
    }

    function loadScript(url, name) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement("script");
            s.src = url;
            s.async = false;
            s.onload = function () { resolve(name); };
            s.onerror = function () { reject(new Error(name + " :: " + url)); };
            document.head.appendChild(s);
        });
    }

    /* 依次尝试同一资源的多个 CDN 地址 */
    function loadAny(urls, name) {
        var i = 0;
        function next() {
            if (i >= urls.length) return Promise.reject(new Error(name + " unavailable"));
            var url = urls[i++];
            return loadScript(url, name).catch(next);
        }
        return next();
    }

    function sequence(list) {
        return list.reduce(function (chain, item) {
            return chain.then(function () { return loadAny(item.urls, item.name); });
        }, Promise.resolve());
    }

    var plan;

    if (location.protocol === "file:") {
        banner("当前是 file:// 打开：组件需要 React 与 UMD 产物，请在项目根起一个静态服务，例如 npm run dev 后访问 http://localhost:20000/。");
        return;
    }

    if (preferLocal) {
        plan = [
            { name: "react", urls: [LOCAL.react] },
            { name: "react-dom", urls: [LOCAL.reactDom] },
            { name: "auipage-react", urls: [LOCAL.lib] }
        ];
    } else {
        plan = [
            { name: "react", urls: CDN.react },
            { name: "react-dom", urls: CDN.reactDom },
            { name: "auipage-react", urls: CDN.lib }
        ];
    }

    sequence(plan)
        .then(function () {
            return loadScript(new URL(base + demo, document.baseURI).href, "demos");
        })
        .catch(function (err) {
            console.error("[docs] failed:", err);
            banner("依赖没加载成功：" + err.message + "。本地请确认 node_modules 与 dist 存在；线上请检查网络是否可访问 CDN。");
        });
})();
