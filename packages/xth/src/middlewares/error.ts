import { type Context, type Next } from 'koa'

export default async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (inError) {
    ctx.status = ctx.status === 588 ? 400 : ctx.status
    ctx.body = ctx.body || { errmsg: (inError as Error).message || 'Unknown Error Message' }
  }
}
