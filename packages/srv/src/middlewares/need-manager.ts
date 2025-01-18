import { type Context, type Next } from 'koa'
import { __VARS__ } from '../main/vars.js'

export default async (ctx: Context, next: Next) => {
  const userMgr = __VARS__.userMgrs.get(ctx.user.id)

  if (!userMgr) {
    throw new Error('找不到该用户同步管理器')
  }

  ctx.userMgr = userMgr

  await next()
}
