import { type IContext, type IHttpDiskTasksRes } from '../types/http.js'

export default async (ctx: IContext<IHttpDiskTasksRes>) => {
  const manualInfo = ctx.userMgr.manualInfo()

  ctx.body = {
    downloadQueue: manualInfo.downloadQueue,
    downloadTasks: manualInfo.downloadTasks,
  }
}
