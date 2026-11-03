const pako = require('pako');
function enc(code, theme) {
  const state = { code, mermaid: JSON.stringify({theme: theme||'default'}), updateDiagram: true, rough: false };
  const data = new TextEncoder().encode(JSON.stringify(state));
  const c = pako.deflate(data, { level: 9 });
  let bin = '';
  for (const b of c) bin += String.fromCharCode(b);
  return Buffer.from(bin, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}
(async () => {
  const url = 'https://mermaid.ink/svg/pako:' + enc('flowchart TD\nA-->B');
  const r = await fetch(url);
  const t = await r.text();
  console.log('flowchart', r.status, t.slice(0, 80).replace(/\n/g,' '));
  console.log('--- dark variant');
  const r2 = await fetch('https://mermaid.ink/svg/pako:' + enc('flowchart TD\nA-->B','dark'));
  console.log('flowchart dark', r2.status);
})();
