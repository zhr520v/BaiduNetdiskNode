import { httpFileManager } from 'baidu-netdisk-api'
import path from 'node:path'
import { pick } from './utils'

export enum EOndup {
  FAIL = 'fail',
  OVERWRITE = 'overwrite',
  NEWCOPY = 'newcopy',
  SKIP = 'skip',
}

export enum EAsync {
  SYNC = 0,
  ADAPTIVE = 1,
  ASYNC = 2,
}

export async function fileManage(inOpts: {
  access_token: string
  opera: 'copy' | 'move' | 'rename' | 'delete'
  list: {
    source: string
    target?: string
    newname?: string
    ondup?: EOndup
  }[]
  ondup?: EOndup
  async?: EAsync
}) {
  const list = inOpts.list.map(item => {
    const source = item.source
    const target = item.target || ''
    const targetFolder = path.dirname(target)
    const targetName = path.basename(target)

    return {
      path: source,
      dest: targetFolder,
      newname: item.newname || targetName,
      ...pick(item, ['ondup']),
    }
  })

  const { data } = await httpFileManager(
    { access_token: inOpts.access_token, opera: inOpts.opera },
    {
      filelist: JSON.stringify(list),
      async: inOpts.async || 0,
      ...pick(inOpts, ['ondup']),
    }
  )

  return pick(data, ['info', 'taskid'])
}
