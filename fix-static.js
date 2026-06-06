const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, 'out');

// 1. Rename _next to assets
const oldNext = path.join(outDir, '_next');
const newNext = path.join(outDir, 'assets');
if (fs.existsSync(oldNext)) {
  fs.cpSync(oldNext, newNext, { recursive: true, force: true });
  fs.rmSync(oldNext, { recursive: true, force: true });
  console.log('Renamed _next -> assets');
}

// 2. Update HTML files: replace /_next/ with /assets/ and fix href links
function processHtml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace _next references
  content = content.replace(/\/\_next\//g, '/assets/');
  
  // Fix href links for static navigation
  content = content.replace(/href="\/career-explorer"/g, 'href="/career-explorer/index.html"');
  content = content.replace(/href="\/job-matcher"/g, 'href="/job-matcher/index.html"');
  content = content.replace(/href="\/resume-optimizer"/g, 'href="/resume-optimizer/index.html"');
  
  // Inject routing script before </head> - but only once
  const script = `<script>(function(){document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.href&&a.href.includes('index.html')&&!e.ctrlKey&&!e.metaKey){e.preventDefault();window.location.href=a.href;}});})();</script>`;
  
  if (!content.includes('index.html') || !content.includes('e.preventDefault')) {
    content = content.replace('</head>', script + '</head>');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Processed:', filePath);
}

// Find all HTML files
function findHtml(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtml(fullPath));
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

const htmlFiles = findHtml(outDir);
for (const f of htmlFiles) {
  processHtml(f);
}

// 3. Update JS chunk files: replace /_next/ with /assets/
const chunksDir = path.join(outDir, 'assets', 'static', 'chunks');
if (fs.existsSync(chunksDir)) {
  for (const entry of fs.readdirSync(chunksDir, { withFileTypes: true })) {
    if (entry.name.endsWith('.js')) {
      const fp = path.join(chunksDir, entry.name);
      let content = fs.readFileSync(fp, 'utf8');
      content = content.replace(/"\/_next\/"/g, '"/assets/"');
      fs.writeFileSync(fp, content, 'utf8');
      console.log('Updated JS:', fp);
    }
  }
}

console.log('Done!');
