import koa from 'koa'
import koaBodyParser from 'koa-bodyparser'
import http from 'node:http'
import { config } from './main/config.js'
import router from './router.js'

const app = new koa()

app.use(koaBodyParser())
app.use(router.routes())

const httpServer = http.createServer(app.callback())

httpServer.listen(config.get('port'), () => {
  console.log('http listening on port', config.get('port'))
})
