import { type Context, type Next } from 'koa'
import { verifyToken } from '../common/token.js'

export default async (ctx: Context, next: Next) => {
  const token = ctx.cookies.get('baidusync_token') || ''

  try {
    verifyToken(token)
  } catch {
    ctx.status = 401
    throw new Error('Need Login')
  }

  await next()
}
