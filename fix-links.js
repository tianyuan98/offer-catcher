const fs = require('fs');
const path = require('path');

// Fix index.html links
let idx = fs.readFileSync('docs/index.html', 'utf8');
idx = idx.replace(/"\/career-explorer\//g, '"./career-explorer/');
idx = idx.replace(/"\/job-matcher\//g, '"./job-matcher/');
idx = idx.replace(/"\/resume-optimizer\//g, '"./resume-optimizer/');
fs.writeFileSync('docs/index.html', idx);
console.log('Fixed index.html links');

// Fix sub-page links
const subs = ['career-explorer', 'job-matcher', 'resume-optimizer', '404'];
for (const dir of subs) {
  const fp = path.join('docs', dir, 'index.html');
  if (!fs.existsSync(fp)) continue;
  let content = fs.readFileSync(fp, 'utf8');
  content = content.replace(/"\//g, '"../');
  fs.writeFileSync(fp, content);
  console.log('Fixed:', fp);
}
console.log('Navigation links fixed.');
