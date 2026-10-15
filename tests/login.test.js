"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer-core");

const ROOT = path.join(__dirname, "..");
const BASE_URL = "http://localhost:3000";
const VALID = { email: "admin@microbesoin.fr", password: "123456" };

const CHROME_CANDIDATES = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean);

function findChrome() {
    for (const candidate of CHROME_CANDIDATES) {
        try {
            if (fs.existsSync(candidate)) return candidate;
        } catch (err) { /* ignore */ }
    }
    throw new Error("Chrome/Edge introuvable. Definis la variable CHROME_PATH.");
}

function startServer() {
    const proc = spawn(process.execPath, ["server.js"], { cwd: ROOT, stdio: "ignore" });
    return proc;
}

async function waitForServer(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(BASE_URL + "/");
            if (res.ok) return;
        } catch (err) { /* not ready yet */ }
        await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error("Le serveur n'a pas demarre dans le delai imparti.");
}

let server;
let browser;
let page;

async function logIn(email, password) {
    await page.goto(BASE_URL + "/index.html", { waitUntil: "networkidle0" });
    await page.type("#email", email);
    await page.type("#password", password);

    const navigation = page
        .waitForNavigation({ waitUntil: "networkidle0", timeout: 3000 })
        .catch(() => null);

    await page.click("#submit-btn");
    await new Promise((r) => setTimeout(r, 1200));
    await navigation;
}

before(async () => {
    server = startServer();
    await waitForServer(10000);
    browser = await puppeteer.launch({
        executablePath: findChrome(),
        headless: true,
        args: ["--no-sandbox"]
    });
    page = await browser.newPage();
});

after(async () => {
    if (browser) await browser.close();
    if (server) server.kill();
});

test("connexion valide : redirige vers la page vide", async () => {
    await logIn(VALID.email, VALID.password);
    assert.match(page.url(), /page-vide\.html$/);
});

test("mot de passe incorrect : affiche un message d'erreur", async () => {
    await logIn(VALID.email, "mauvais-mot-de-passe");
    assert.match(page.url(), /index\.html$/);
    const state = await page.evaluate(() => {
        const box = document.getElementById("api-error");
        return { hidden: box.hidden, text: box.textContent.trim() };
    });
    assert.equal(state.hidden, false);
    assert.match(state.text, /incorrect/i);
});

test("email invalide : erreur de validation sur le champ", async () => {
    await logIn("pas-un-email", VALID.password);
    assert.match(page.url(), /index\.html$/);
    const error = await page.$eval('[data-error-for="email"]', (el) => el.textContent.trim());
    assert.notEqual(error, "");
});

test("champ vide : erreurs obligatoires", async () => {
    await logIn("", "");
    assert.match(page.url(), /index\.html$/);
    const errors = await page.evaluate(() => ({
        email: document.querySelector('[data-error-for="email"]').textContent.trim(),
        password: document.querySelector('[data-error-for="password"]').textContent.trim()
    }));
    assert.notEqual(errors.email, "");
    assert.notEqual(errors.password, "");
});
