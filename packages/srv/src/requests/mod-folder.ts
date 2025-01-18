import { type IFolder } from '../common/folder-manager.js'
import { type IUserConfig, config } from '../main/config.js'
import { type IContext, type IHttpModFolderReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const reqBody = ctx.request.body as IHttpModFolderReq

  const folderMgr = ctx.userMgr.getFolder(reqBody.id)

  folderMgr.update(reqBody.folder)

  const folderInfo = folderMgr.basicInfo()
  const newUsers: IUserConfig[] = []

  for (const user of config.get('users')) {
    if (user.id === ctx.user.id) {
      const folders: IFolder[] = []

      for (const folder of user.folders) {
        if (folder.id === reqBody.id) {
          folders.push(folderInfo)
        } else {
          folders.push(folder)
        }
      }

      newUsers.push({ ...user, folders })
    } else {
      newUsers.push(user)
    }
  }

  config.modify({ users: newUsers })
}
