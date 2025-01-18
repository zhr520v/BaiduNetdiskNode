import koa from 'koa'
import koaBodyParser from 'koa-bodyparser'
import koaMount from 'koa-mount'
import koaStatic from 'koa-static'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { config } from './main/config.js'
import { reverify } from './main/reverify.js'
import { initUser } from './main/vars.js'
import router from './router.js'

for (const user of config.get('users')) {
  initUser(user)
}

reverify.refreshTokens()

const app = new koa()

app.use(koaBodyParser())
app.use(router.routes())
app.use(
  koaMount(
    '/assets',
    koaStatic(path.resolve('public/assets'), { maxAge: 30 * 24 * 60 * 60 * 1000 })
  )
)
app.use(async ctx => {
  ctx.type = 'html'
  ctx.body = fs.createReadStream(path.resolve('public/index.html'))
})

const httpServer = http.createServer(app.callback())

httpServer.listen(config.get('port'), () => {
  console.log('http listening on port', config.get('port'))
})
