const pako = require('pako');
function enc(code) {
  const state = { code, mermaid: JSON.stringify({theme:'default'}), updateDiagram: true, rough: false };
  const data = new TextEncoder().encode(JSON.stringify(state));
  const c = pako.deflate(data, { level: 9 });
  let bin = '';
  for (const b of c) bin += String.fromCharCode(b);
  return Buffer.from(bin, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}
const samples = {
  waterfall: `waterfall\ntitle Q4 Revenue Bridge\ny-axis "Revenue (M$)" 0 --> 130\nseries\nstart 85 : Q3 Actual\n+25 : New Sales\nend 105 : Q4 Actual`,
  bubblechart: `bubblechart\ntitle BCG\nx-axis "Share" 0 --> 10\ny-axis "Growth" 0 --> 25\ndata\nA : 8.2, 20, 340, Software`,
  heatmap: `heatmap\ntitle H\nx-axis W1, W2\ny-axis Sales, Marketing\ndata\nSales : 20, 45`,
  orgchart: `orgchart\nCEO [CEO]\nCTO [CTO]\nCEO -> CTO`,
  evchart: `evchart\ntitle EVA\ndays 1, 2, 3\npv 10, 20, 30\nev 8, 15, 22\nac 12, 25, 35\ngrid on`,
};
(async () => {
  for (const [name, code] of Object.entries(samples)) {
    const url = 'https://mermaid.ink/svg/pako:' + enc(code);
    try {
      const r = await fetch(url);
      const t = await r.text();
      console.log(name, r.status, t.slice(0, 60).replace(/\n/g, ' '));
    } catch (e) { console.log(name, 'ERR', e.message); }
  }
})();
