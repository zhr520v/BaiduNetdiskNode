const fs = require('fs')

const cjsPath = '../dist/index.js'
const BaiduNetdiskApi = require(cjsPath)
const mjs = []

mjs.push(`import BaiduNetdiskApi from './index.js';`)

for (const key in BaiduNetdiskApi) {
  if (key !== 'default') {
    mjs.push(`export const ${key} = BaiduNetdiskApi.${key};`)
  }
}

mjs.push(`export default BaiduNetdiskApi;`)

fs.writeFileSync('dist/index.mjs', mjs.join('\n'))
