const API_KEY = "7df27917135d81456bad53573ae1a3715567288910f17c93b9eed25fe801e2fc";

const targets = [
  "http://144.91.85.40/openwa/api/sessions?name=upscore",
  "http://144.91.85.40/api/sessions?name=upscore",
  "https://144.91.85.40/openwa/api/sessions?name=upscore",
];

(async () => {
  for (const url of targets) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        headers: { "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(10000),
      });
      const text = await res.text();
      console.log(
        `${url}\n  -> ${res.status} in ${Date.now() - t0}ms\n  body: ${text.slice(0, 300)}\n`
      );
    } catch (e) {
      console.log(`${url}\n  -> ERROR in ${Date.now() - t0}ms: ${e.message}\n`);
    }
  }
})();