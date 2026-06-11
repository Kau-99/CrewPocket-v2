// Mantém o `firebase emulators:exec` vivo para o webServer do Playwright.
// (emulators:start morre quando o stdin fecha — NPE no rules runtime.)
console.log("emulators keepalive running");
setInterval(() => {}, 60_000);
