import { type IContext, type IHttpFoldersInfoRes } from '../types/http.js'

export default async (ctx: IContext<IHttpFoldersInfoRes>) => {
  const foldersInfo = ctx.userMgr.foldersInfo()

  ctx.body = { folders: foldersInfo }
}
