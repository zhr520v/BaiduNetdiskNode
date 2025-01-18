import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  type IContext,
  type IHttpLocalFolderListReq,
  type IHttpLocalFolderListRes,
} from '../types/http.js'

export default async (ctx: IContext<IHttpLocalFolderListRes>) => {
  const body = ctx.request.body as IHttpLocalFolderListReq

  const dirs = await readdir(body.path)
  const folders: string[] = []

  for (const dir of dirs) {
    try {
      const stats = await stat(path.resolve(body.path, dir))

      if (stats.isDirectory()) {
        folders.push(dir)
      }
    } catch {}
  }

  ctx.body = {
    folders: folders,
  }
}
