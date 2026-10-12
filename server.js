/*
 * Serveur de développement MicroBesoin
 * ------------------------------------
 * Sert les fichiers statiques (index.html, css, js) et simule
 * l'API de connexion pour tester les retours du back-end.
 *
 * Démarrage :   node server.js
 * Puis ouvrir : http://localhost:3000
 *
 * Compte de test : admin@microbesoin.fr / 123456
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon"
};

const VALID_USER = { email: "admin@microbesoin.fr", password: "123456" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sendJSON(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise(function (resolve) {
        let chunk = "";
        req.on("data", function (c) { chunk += c; });
        req.on("end", function () {
            try { resolve(JSON.parse(chunk || "{}")); }
            catch (e) { resolve(null); }
        });
    });
}

async function handleLogin(req, res) {
    const body = await readBody(req);

    if (!body || !body.email || !body.password) {
        return sendJSON(res, 400, { error: "Email et mot de passe sont requis." });
    }
    if (!EMAIL_RE.test(body.email)) {
        return sendJSON(res, 400, { error: "Le format de l'adresse email est invalide." });
    }
    if (body.email !== VALID_USER.email || body.password !== VALID_USER.password) {
        return sendJSON(res, 401, { error: "Email ou mot de passe incorrect." });
    }
    return sendJSON(res, 200, {
        token: "demo-token-" + Date.now(),
        user: { email: body.email, name: "Admin" }
    });
}

function serveStatic(req, res) {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";

    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, function (err, content) {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 - Fichier introuvable : " + urlPath);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(content);
    });
}

const server = http.createServer(function (req, res) {
    if (req.method === "POST" && req.url === "/api/login") {
        handleLogin(req, res);
        return;
    }
    if (req.method === "GET") {
        serveStatic(req, res);
        return;
    }
    res.writeHead(405); res.end("Method Not Allowed");
});

server.listen(PORT, function () {
    console.log("Serveur MicroBesoin démarré sur http://localhost:" + PORT);
    console.log("Compte de test : admin@microbesoin.fr / 123456");
});
