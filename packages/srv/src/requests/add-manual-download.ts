import fs from 'node:fs'
import path from 'node:path'
import { pathNormalized } from '../common/utils.js'
import { config } from '../main/config.js'
import { type IContext, type IHttpAddManualDownloadReq } from '../types/http.js'

export default async (ctx: IContext) => {
  const { fsid, remote, encrypt } = ctx.request.body as IHttpAddManualDownloadReq

  const location = config.get('downloadLocation')
  const basename = path.basename(remote)
  const fullPath = pathNormalized(path.join(location, basename))
  const isExists = fs.existsSync(fullPath)
  const newPath = isExists ? findNewName(fullPath, !fsid) : fullPath

  if (fsid) {
    await ctx.userMgr.manualMgr.addDownloadFile(fsid, newPath, encrypt)
  } else {
    await ctx.userMgr.manualMgr.addDownloadFolder(remote, newPath, encrypt)
  }
}

function findNewName(inPath: string, inIsDir: boolean, inLastNo = 0) {
  const ext = inIsDir ? '' : path.extname(inPath)
  const prePart = ext ? inPath.split(ext).slice(0, -1).join(ext) : inPath
  const newPath = `${prePart} (${inLastNo + 1})${ext}`

  if (fs.existsSync(newPath)) {
    return findNewName(inPath, inIsDir, inLastNo + 1)
  }

  return newPath
}
