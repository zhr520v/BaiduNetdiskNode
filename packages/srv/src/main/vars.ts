import { Netdisk } from 'baidu-netdisk-sdk'
import { UserManager } from '../common/user-manager.js'
import { type IUserConfig, config } from './config.js'

export const __VARS__: {
  netdisks: Map<string, Netdisk>
  userMgrs: Map<string, UserManager>
} = {
  netdisks: new Map(),
  userMgrs: new Map(),
}

export function initNetdisk(inUser: IUserConfig) {
  const netdisk = new Netdisk({
    app_name: inUser.app_name,
    access_token: inUser.access_token,
    gUploadThreads: config.get('uploadThreads'),
    gDownloadThreads: config.get('downloadThreads'),
    gTryTimes: config.get('tryTimes'),
    gTryDelta: config.get('tryDelta'),
  })

  __VARS__.netdisks.set(inUser.id, netdisk)

  return netdisk
}

export function initUserManager(inUser: IUserConfig, inNetdisk: Netdisk) {
  const newUserMgr = new UserManager({
    netdisk: inNetdisk,
  })

  __VARS__.userMgrs.set(inUser.id, newUserMgr)

  for (const folder of inUser.folders) {
    newUserMgr.addFolder({
      id: folder.id,
      local: folder.local,
      remote: folder.remote,
      encrypt: folder.encrypt,
      direction: folder.direction,
      conflict: folder.conflict,
      trigger: folder.trigger,
    })
  }
}

export async function removeUserManager(inId: string) {
  const netdisk = __VARS__.netdisks.get(inId)
  const userMgr = __VARS__.userMgrs.get(inId)

  if (userMgr) {
    await userMgr.terminate()
    __VARS__.userMgrs.delete(inId)
  }

  if (netdisk) {
    __VARS__.netdisks.delete(inId)
  }
}

export function initUser(inUser: IUserConfig) {
  const netdisk = initNetdisk(inUser)
  initUserManager(inUser, netdisk)
}
