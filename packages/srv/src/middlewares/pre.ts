import { type Context, type Next } from 'koa'

export default async (ctx: Context, next: Next) => {
  ctx.status = 588

  await next()

  ctx.status = ctx.status === 588 ? 200 : ctx.status
  ctx.body = ctx.body || 0
}
