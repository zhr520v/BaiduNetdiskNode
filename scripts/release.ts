import minimist from 'minimist'
import child_process from 'node:child_process'
import fs from 'node:fs'
import pico from 'picocolors'

const args = minimist(process.argv.slice(2))
const pros = args._

if (pros.length === 0) {
  console.error(pico.red(`${pico.bgRed(pico.white(' ERROR '))} No projects specified.`))
  process.exit(0)
}

for (const pro of pros) {
  if (!fs.existsSync(`packages/${pro}`)) {
    console.error(
      pico.red(`${pico.bgRed(pico.white(' ERROR '))} Project ${pico.bold(pro)} does not exist.`)
    )
    process.exit(0)
  }
}

for (const pro of pros) {
  child_process.execSync('pnpm release', { cwd: `packages/${pro}`, stdio: 'inherit' })
}
