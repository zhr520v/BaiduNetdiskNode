import { config } from '../main/config.js'
import { removeUserManager } from '../main/vars.js'
import { type IContext, type IHttpDelUserReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const reqBody = ctx.request.body as IHttpDelUserReq

  const newUsers = config.get('users').filter(u => u.id !== ctx.user.id)
  config.modify({ users: newUsers })

  await removeUserManager(reqBody.id)
}
