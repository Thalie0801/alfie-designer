import fs from 'node:fs'

const htmlPath = 'index.html'
if (!fs.existsSync(htmlPath)) {
  console.error('❌ index.html introuvable à la racine')
  process.exit(1)
}
const html = fs.readFileSync(htmlPath, 'utf8')
const okEntry = html.includes('src="/src/main.tsx"') || html.includes('src="/src/main.ts"')
if (!okEntry) {
  console.error('❌ index.html doit importer /src/main.tsx|.ts (pas /main.tsx)')
  process.exit(1)
}

for (const f of ['vercel.json', 'vercel.prod.json', 'vercel.preview.json']) {
  if (!fs.existsSync(f)) continue
  const txt = fs.readFileSync(f, 'utf8')
  if (/"outputDirectory"\s*:\s*"public\/app"/.test(txt)) {
    console.error(`❌ ${f} contient outputDirectory=public/app`)
    process.exit(1)
  }
}

console.log('✅ prebuild-guard ok')
