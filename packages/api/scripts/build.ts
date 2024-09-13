import child_process from 'child_process'
import fsExt from 'fs-extra'

fsExt.removeSync('dist')
fsExt.mkdirpSync('dist')

child_process.execSync('pnpm tsc -p scripts/tsconfig.cjs.json')

const omit_keys = ['type', 'main', 'scripts', 'devDependencies', 'moduleOptions']
const packagejson = JSON.parse(fsExt.readFileSync('package.json', { encoding: 'utf-8' }))
const newpackagejson: Record<string, any> = {}

for (const key in packagejson) {
  if (!omit_keys.includes(key)) {
    newpackagejson[key] = packagejson[key]
  }
}

for (const key in packagejson.moduleOptions) {
  newpackagejson[key] = packagejson.moduleOptions[key]
}

fsExt.writeFileSync('dist/package.json', JSON.stringify(newpackagejson, null, 2))
fsExt.copyFileSync('LICENSE', 'dist/LICENSE')
fsExt.copyFileSync('README.md', 'dist/README.md')

child_process.execSync('node scripts/esm.cjs')
