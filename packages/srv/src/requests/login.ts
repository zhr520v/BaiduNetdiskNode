import { newToken } from '../common/token.js'
import { config } from '../main/config.js'
import { type IContext, type IHttpLoginReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const { username, password } = ctx.request.body as IHttpLoginReq

  const configUsername = config.get('username') || 'admin'
  const configPassword = config.get('password') || 'admin'

  if (username !== configUsername || password !== configPassword) {
    throw new Error('用户名或密码错误')
  }

  const token = newToken()

  ctx.cookies.set('baidusync_token', token, {
    httpOnly: true,
  })
}
