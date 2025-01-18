import { config } from '../main/config.js'
import { type IContext, type IHttpBasicRes } from '../types/http.js'

export default async (ctx: IContext<IHttpBasicRes>) => {
  const reqQuery = ctx.request.query as { id?: string }
  let chosen = 0

  const user = config.get('users').find(item => item.id === reqQuery.id)

  if (user) {
    chosen = 1
  }

  ctx.body = {
    users: config.get('users').length,
    chosen: chosen,
  }
}
