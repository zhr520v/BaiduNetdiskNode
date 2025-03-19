import path from 'node:path'
import { UserManager } from './user-manager.js'
import { pathNormalized } from './utils.js'

export class ManualManager {
  #userMgr: UserManager
  #downloadQueue: { local: string; fsid: number; encrypt: string }[] = []

  constructor(inOpts: { userMgr: UserManager }) {
    this.#userMgr = inOpts.userMgr
  }

  async addDownloadFolder(inRemote: string, inLocal: string, inEncrypt: string) {
    const { fileList } = await this.#userMgr.fetchList(inRemote)

    for (const file of fileList) {
      const fullPath = pathNormalized(path.join(inLocal, path.relative(inRemote, file.path)))
      this.#putInDownloadQueue({ fsid: file.fs_id, local: fullPath, encrypt: inEncrypt })
    }
  }

  async addDownloadFile(inFsid: number, inLocal: string, inEncrypt: string) {
    this.#putInDownloadQueue({ fsid: inFsid, local: inLocal, encrypt: inEncrypt })
  }

  #putInDownloadQueue(inItem: { fsid: number; local: string; encrypt: string }) {
    this.#downloadQueue.push(inItem)
    this.#userMgr.runDownloadQueue()
  }

  shiftDownloadQueue() {
    return this.#downloadQueue.shift()
  }

  getDownloadQueue() {
    return this.#downloadQueue
  }
}
