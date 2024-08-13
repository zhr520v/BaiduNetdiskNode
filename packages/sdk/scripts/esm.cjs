const fs = require('fs')

const mjs = []

mjs.push("import BaiduNetdiskSdk from './index.js';")
mjs.push('export default BaiduNetdiskSdk;')

fs.writeFileSync('dist/index.mjs', mjs.join('\n'))
