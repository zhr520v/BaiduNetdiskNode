import { config, IUserConfig } from '../main/config.js'
import { type IContext, type IHttpDelFolderReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const reqBody = ctx.request.body as IHttpDelFolderReq

  await ctx.userMgr.removeFolder(reqBody.id)

  const newUsers: IUserConfig[] = []

  for (const user of config.get('users')) {
    if (user.id === ctx.user.id) {
      newUsers.push({
        ...user,
        folders: user.folders.filter(item => item.id !== reqBody.id),
      })
    } else {
      newUsers.push(user)
    }
  }

  config.modify({ users: newUsers })
}
