const pako = require('pako');
const state = { code: 'xychart-beta\n  title "Sales"\n  x-axis [a,b,c]\n  bar [1,2,3]', mermaid: JSON.stringify({theme:'default'}), updateDiagram: true, rough: false };
const data = new TextEncoder().encode(JSON.stringify(state));
const c = pako.deflate(data, { level: 9 });
let bin = '';
for (const b of c) bin += String.fromCharCode(b);
const b64 = Buffer.from(bin, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
console.log('https://mermaid.ink/svg/pako:' + b64);
