import { type Context, type Next } from 'koa'
import { config } from '../main/config.js'

export default async (ctx: Context, next: Next) => {
  const query = ctx.request.query

  if (typeof query.id !== 'string') {
    throw new Error('id参数类型错误')
  }

  const user = config.get('users').find(item => item.id === query.id)

  if (!user) {
    throw new Error('找不到该用户')
  }

  ctx.user = user

  await next()
}
