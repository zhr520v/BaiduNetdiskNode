import { type AxiosTypes } from 'baidu-netdisk-api/types'
import { type Context, type Next } from 'koa'

export default async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (inErr) {
    const e = inErr as AxiosTypes.AxiosError<{ message?: string }>
    const message = e.response?.data?.message || e.message || '未知错误'

    ctx.status = ctx.status === 588 ? 400 : ctx.status
    ctx.body = { message }
  }
}
