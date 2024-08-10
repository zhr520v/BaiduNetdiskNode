import child_process from 'child_process'
import fs from 'fs'

if (fs.existsSync('dist')) {
  fs.rmdirSync('dist')
}

fs.mkdirSync('dist')

child_process.execSync('pnpm tsc -p scripts/tsconfig.cjs.json')

const omit_keys = ['type', 'main', 'scripts', 'devDependencies', 'moduleOptions']
const packagejson = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf-8' }))
const newpackagejson: { [key: string]: any } = {}

for (const key in packagejson) {
  if (!omit_keys.includes(key)) {
    newpackagejson[key] = packagejson[key]
  }
}

for (const key in packagejson.moduleOptions) {
  newpackagejson[key] = packagejson.moduleOptions[key]
}

fs.writeFileSync('dist/package.json', JSON.stringify(newpackagejson, null, 2))
fs.copyFileSync('LICENSE', 'dist/LICENSE')
fs.copyFileSync('README.md', 'dist/README.md')

child_process.execSync('node scripts/esm.cjs')
