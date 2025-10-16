import fs from 'node:fs'

const filePath = 'index.html'
const html = fs.readFileSync(filePath, 'utf8')
const ok = html.includes('src="/src/main.tsx"') || html.includes('src="/src/main.ts"')

if (!ok) {
  console.error('❌', filePath, 'doit importer /src/main.tsx|.ts')
  process.exit(1)
}

console.log('✅ prebuild-check ok')
