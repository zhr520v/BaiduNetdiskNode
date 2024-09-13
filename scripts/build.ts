import minimist from 'minimist'
import child_process from 'node:child_process'
import fs from 'node:fs'
import pico from 'picocolors'

const args = minimist(process.argv.slice(2))
const projs = args._

if (projs.length === 0) {
  console.error(pico.red(`${pico.bgRed(pico.white(' ERR '))} No projects specified.\n`))
  process.exit(0)
}

for (const proj of projs) {
  if (!fs.existsSync(`packages/${proj}`)) {
    console.error(
      pico.red(
        `${pico.bgRed(pico.white(' ERR '))} Project ${pico.bold(proj)} does not exist.\n`
      )
    )
    process.exit(0)
  }
}

for (const proj of projs) {
  child_process.execSync('pnpm build', { cwd: `packages/${proj}`, stdio: 'inherit' })

  if (fs.existsSync(`packages/${proj}/dist/package.json`)) {
    const json = fs.readFileSync(`packages/${proj}/dist/package.json`, 'utf8')
    const pkg = JSON.parse(json)
    const deps = pkg.dependencies || []

    for (const dep in deps) {
      if (deps[dep].startsWith('workspace:')) {
        const pkgname = dep.replace('baidu-netdisk-', '')
        const pkgpath = `packages/${pkgname}/package.json`
        const pkgjson = fs.readFileSync(pkgpath, 'utf8')
        const pkgpkg = JSON.parse(pkgjson)
        const pkgversion = pkgpkg.version
        deps[dep] = deps[dep].replace('workspace:', '').replace('*', `^${pkgversion}`)
      }
    }

    fs.writeFileSync(`packages/${proj}/dist/package.json`, JSON.stringify(pkg, null, 2), 'utf8')
  }

  console.log(pico.white(`\n${pico.bgGreen(' OK ')} Project ${pico.blue(proj)} built.\n\n`))
}
