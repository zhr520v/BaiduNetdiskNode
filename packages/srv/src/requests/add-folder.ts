import { nanoid, pathNormalized } from '../common/utils.js'
import { config, IUserConfig } from '../main/config.js'
import { type IContext, type IHttpAddFolderReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const reqBody = ctx.request.body as IHttpAddFolderReq

  const folderInfo = {
    id: nanoid(),
    local: pathNormalized(reqBody.local),
    remote: pathNormalized(reqBody.remote),
    encrypt: reqBody.encrypt,
    direction: reqBody.direction,
    conflict: reqBody.conflict,
    trigger: reqBody.trigger,
  }

  ctx.userMgr.addFolder(folderInfo)

  const newUsers: IUserConfig[] = []

  for (const user of config.get('users')) {
    if (user.id === ctx.user.id) {
      newUsers.push({ ...user, folders: user.folders.concat([folderInfo]) })
    } else {
      newUsers.push(user)
    }
  }

  config.modify({ users: newUsers })
}
