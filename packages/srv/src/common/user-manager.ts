import { type IBaiduApiError } from 'baidu-netdisk-api/types'
import { type Netdisk } from 'baidu-netdisk-sdk'
import { config } from '../main/config.js'
import { FolderManager, type IFolder } from './folder-manager.js'
import { errorLog } from './log.js'
import { ManualManager } from './manual-manager.js'
import { nanoid, pathNormalized, pick, type PromType } from './utils.js'

export type IFetchListItem = Pick<
  PromType<ReturnType<typeof Netdisk.prototype.getFileListRecursion>>['list'][number],
  'fs_id' | 'local_mtime' | 'path' | 'size'
>

export type IFetchListQueueItem = {
  remote: string
  resolve: (inFetchResult: { folderList: IFetchListItem[]; fileList: IFetchListItem[] }) => void
  reject: () => void
}

export class UserManager {
  #manualMgr: ManualManager
  #folderMgrs: FolderManager[] = []

  #netdisk: Netdisk

  #uploadTasks: {
    taskId: string
    folderId: string
    entity: ReturnType<typeof Netdisk.prototype.uploadTask>
    local: string
    remote: string
  }[] = []

  #downloadTasks: {
    taskId: string
    folderId: string
    entity: ReturnType<typeof Netdisk.prototype.downloadTask>
    fsid: number
    local: string
  }[] = []

  #fetchListTimer: NodeJS.Timeout | undefined = void 0
  #fetchListQueue: {
    remote: string
    resolve: (inFetchResult: {
      folderList: IFetchListItem[]
      fileList: IFetchListItem[]
    }) => void
    reject: (inReason?: any) => void
  }[] = []
  #fetchListProcessing = false

  constructor(inOpts: { netdisk: Netdisk }) {
    this.#netdisk = inOpts.netdisk
    this.#manualMgr = new ManualManager({ userMgr: this })
  }

  addFolder(inFolder: IFolder) {
    const local = pathNormalized(inFolder.local)
    const remote = pathNormalized(inFolder.remote)

    // 判断是否已存在 local&remote
    if (
      this.#folderMgrs.find(item => {
        const info = item.basicInfo()

        return info.local === local && info.remote === remote
      })
    ) {
      throw new Error('此同步路径已经存在')
    }

    const newFolderMgr = new FolderManager({
      userMgr: this,
      id: inFolder.id,
      local: local,
      remote: remote,
      encrypt: inFolder.encrypt,
      direction: inFolder.direction,
      operation: inFolder.operation,
      conflict: inFolder.conflict,
      trigger: inFolder.trigger,
      excludes: inFolder.excludes,
    })

    this.#folderMgrs.push(newFolderMgr)

    return newFolderMgr
  }

  getFolder(inFolderId: string) {
    for (const folderMgr of this.#folderMgrs) {
      const info = folderMgr.basicInfo()

      if (info.id === inFolderId) {
        return folderMgr
      }
    }

    throw new Error('找不到该同步文件夹')
  }

  async removeFolder(inFolderId: string) {
    const folderMgr = this.getFolder(inFolderId)
    this.#folderMgrs = this.#folderMgrs.filter(item => item.basicInfo().id !== inFolderId)

    folderMgr.terminate()

    for (const task of this.#uploadTasks) {
      if (task.folderId === inFolderId) {
        await task.entity.terminate()
      }
    }

    this.#uploadTasks = this.#uploadTasks.filter(item => item.folderId !== inFolderId)

    for (const task of this.#downloadTasks) {
      if (task.folderId === inFolderId) {
        await task.entity.terminate()
      }
    }

    this.#downloadTasks = this.#downloadTasks.filter(item => item.folderId !== inFolderId)
  }

  async playTask(inId: string, inType: 'upload' | 'download') {
    if (inType === 'upload') {
      const task = this.#uploadTasks.find(item => item.taskId === inId)

      if (!task) {
        throw new Error('找不到该上传任务')
      }

      task.entity.run()
    } else if (inType === 'download') {
      const task = this.#downloadTasks.find(item => item.taskId === inId)

      if (!task) {
        throw new Error('找不到该下载任务')
      }

      task.entity.run()
    } else {
      throw new Error('无效的任务类型')
    }
  }

  async pauseTask(inId: string, inType: 'upload' | 'download') {
    if (inType === 'upload') {
      const task = this.#uploadTasks.find(item => item.taskId === inId)

      if (!task) {
        throw new Error('找不到该上传任务')
      }

      await task.entity.stop()
    } else if (inType === 'download') {
      const task = this.#downloadTasks.find(item => item.taskId === inId)

      if (!task) {
        throw new Error('找不到该下载任务')
      }

      await task.entity.stop()
    } else {
      throw new Error('无效的任务类型')
    }
  }

  async removeTask(inId: string, inType: 'upload' | 'download') {
    if (inType === 'upload') {
      const task = this.#uploadTasks.find(item => item.taskId === inId)

      if (!task) {
        throw new Error('找不到该上传任务')
      }

      await task.entity.terminate()

      this.#uploadTasks = this.#uploadTasks.filter(item => item.taskId !== inId)

      this.runUploadQueue()
    } else if (inType === 'download') {
      const task = this.#downloadTasks.find(item => item.taskId === inId)

      if (!task) {
        throw new Error('找不到该下载任务')
      }

      await task.entity.terminate()

      this.#downloadTasks = this.#downloadTasks.filter(item => item.taskId !== inId)

      this.runDownloadQueue()
    } else {
      throw new Error('无效的任务类型')
    }
  }

  fetchList(inRemote: string) {
    return new Promise<{ folderList: IFetchListItem[]; fileList: IFetchListItem[] }>(
      (resolve, reject) => {
        this.#fetchListQueue.push({
          remote: inRemote,
          resolve: resolve,
          reject: reject,
        })

        this.doFetchList()
      }
    )
  }

  async doFetchList() {
    if (this.#fetchListTimer) {
      return
    }

    if (this.#fetchListProcessing) {
      return
    }

    const next = this.#fetchListQueue.shift()

    if (!next) {
      return
    }

    this.#fetchListProcessing = true

    const folderList: IFetchListItem[] = []
    const fileList: IFetchListItem[] = []
    let outCursor = 0
    let outHasMore = false

    try {
      do {
        const { has_more, cursor, list } = await this.#netdisk.getFileListRecursion({
          path: next.remote,
          opts: {
            start: outCursor,
            recursion: 1,
          },
        })

        for (const item of list) {
          if (item.isdir) {
            folderList.push({ fs_id: 0, local_mtime: 0, path: item.path, size: 0 })
            continue
          }

          fileList.push(pick(item, ['fs_id', 'local_mtime', 'path', 'size']))
        }

        outCursor = cursor
        outHasMore = has_more

        if (outHasMore) {
          // getFileListRecursion 接口每分钟请求不得超过 8-10 次
          await new Promise(res => setTimeout(res, 7000))
        }
      } while (outHasMore)

      next.resolve({ folderList, fileList })
    } catch (inErr) {
      try {
        // 31066 表示路径不存在
        if ((inErr as IBaiduApiError).baidu?.errno === 31066) {
          next.resolve({ folderList: [], fileList: [] })
        } else {
          next.reject(inErr)
        }
      } catch {
        next.reject(inErr)
      }
    } finally {
      this.#fetchListTimer = setTimeout(() => {
        this.#fetchListTimer = void 0
        this.doFetchList()
      }, 7000)
      this.#fetchListProcessing = false
    }
  }

  runUploadQueue() {
    if (
      this.#uploadTasks.filter(task => task.entity.info.stepError).length >=
      config.get('maxFailedTasks')
    ) {
      // 错误任务大于等于3个
      return
    }

    if (
      this.#uploadTasks.filter(task => !task.entity.info.stepError).length >=
      config.get('maxUploadTasks')
    ) {
      // 非错误任务大于等于3个
      return
    }

    for (const folderMgr of this.#folderMgrs) {
      const next = folderMgr.shiftUploadQueue()

      if (!next) {
        continue
      }

      const taskId = nanoid()
      const folderInfo = folderMgr.basicInfo()

      const task = this.#netdisk.uploadTask({
        local: next.local,
        remote: next.remote,
        encrypt: folderInfo.encrypt,
        noVerify: config.get('noVerifyUpload'),
        onDone: () => {
          this.#uploadTasks = this.#uploadTasks.filter(item => item.taskId !== taskId)
          this.runUploadQueue()
        },
        onError: inErr => {
          errorLog(`上传任务失败: ${next.local} -> ${next.remote}, ${inErr.message}`)
          this.runUploadQueue()
        },
      })

      this.#uploadTasks.push({
        taskId: taskId,
        folderId: folderInfo.id,
        entity: task,
        local: next.local,
        remote: next.remote,
      })

      task.run()

      this.runUploadQueue()

      break
    }
  }

  runDownloadQueue() {
    if (
      this.#downloadTasks.filter(task => task.entity.info.stepError).length >=
      config.get('maxFailedTasks')
    ) {
      // 错误任务大于等于3个
      return
    }

    if (
      this.#downloadTasks.filter(task => !task.entity.info.stepError).length >=
      config.get('maxDownloadTasks')
    ) {
      // 非错误任务大于等于3个
      return
    }

    const manualNext = this.#manualMgr.shiftDownloadQueue()

    if (manualNext) {
      const taskId = nanoid()

      const task = this.#netdisk.downloadTask({
        withFsid: manualNext.fsid,
        local: manualNext.local,
        encrypt: manualNext.encrypt,
        noVerify: config.get('noVerifyDownload'),
        noVerifyOnDisk: config.get('noVerifyDownloadOnDisk'),
        onDone: () => {
          this.#downloadTasks = this.#downloadTasks.filter(item => item.taskId !== taskId)
          this.runDownloadQueue()
        },
        onError: inErr => {
          errorLog(`下载任务失败: ${manualNext.fsid} -> ${manualNext.local}, ${inErr.message}`)
          this.runDownloadQueue()
        },
      })

      this.#downloadTasks.push({
        taskId: taskId,
        folderId: 'MANUAL_DOWNLOAD',
        entity: task,
        fsid: manualNext.fsid,
        local: manualNext.local,
      })

      task.run()

      this.runDownloadQueue()

      return
    }

    for (const folderMgr of this.#folderMgrs) {
      const next = folderMgr.shiftDownloadQueue()

      if (!next) {
        continue
      }

      const taskId = nanoid()
      const folderInfo = folderMgr.basicInfo()

      const task = this.#netdisk.downloadTask({
        withFsid: next.fsid,
        local: next.local,
        encrypt: folderInfo.encrypt,
        noVerify: config.get('noVerifyDownload'),
        noVerifyOnDisk: config.get('noVerifyDownloadOnDisk'),
        onDone: () => {
          this.#downloadTasks = this.#downloadTasks.filter(item => item.taskId !== taskId)
          this.runDownloadQueue()
        },
        onError: inErr => {
          errorLog(`下载任务失败: ${next.fsid} -> ${next.local}, ${inErr.message}`)
          this.runDownloadQueue()
        },
      })

      this.#downloadTasks.push({
        taskId: taskId,
        folderId: folderInfo.id,
        entity: task,
        fsid: next.fsid,
        local: next.local,
      })

      task.run()

      this.runDownloadQueue()

      break
    }
  }

  getUploadTasks() {
    return this.#uploadTasks
  }

  getDownloadTasks() {
    return this.#downloadTasks
  }

  manualInfo() {
    return {
      downloadQueue: this.#manualMgr.getDownloadQueue().length,
      downloadTasks: this.#downloadTasks
        .filter(i => i.folderId === 'MANUAL_DOWNLOAD')
        .map(i => {
          const info = i.entity.info

          return {
            id: i.taskId,
            local: info.local,
            remote: info.remote,
            oriSize: info.oriSize,
            comSize: info.comSize,
            upBytes: 0,
            downBytes: info.downBytes,
            stepId: info.stepId,
            stepStatus: info.stepStatus,
            stepErrMsg: info.stepError?.message || '',
          }
        }),
    }
  }

  foldersInfo() {
    return this.#folderMgrs.map(item => {
      const info = item.basicInfo()

      return {
        id: info.id,
        local: info.local,
        remote: info.remote,
        encrypt: info.encrypt,
        direction: info.direction,
        operation: info.operation,
        conflict: info.conflict,
        trigger: info.trigger,
        excludes: info.excludes,
        checking: item.getChecking(),
        uploadQueue: item.getUploadQueue().length,
        downloadQueue: item.getDownloadQueue().length,
        uploadTasks: this.#uploadTasks
          .filter(i => i.folderId === info.id)
          .map(i => {
            const info = i.entity.info

            return {
              id: i.taskId,
              local: info.local,
              remote: info.remote,
              oriSize: info.oriSize,
              comSize: info.comSize,
              upBytes: info.upBytes,
              downBytes: info.downBytes,
              stepId: info.stepId,
              stepStatus: info.stepStatus,
              stepErrMsg: info.stepError?.message || '',
            }
          }),
        downloadTasks: this.#downloadTasks
          .filter(i => i.folderId === info.id)
          .map(i => {
            const info = i.entity.info

            return {
              id: i.taskId,
              local: info.local,
              remote: info.remote,
              oriSize: info.oriSize,
              comSize: info.comSize,
              upBytes: 0,
              downBytes: info.downBytes,
              stepId: info.stepId,
              stepStatus: info.stepStatus,
              stepErrMsg: info.stepError?.message || '',
            }
          }),
      }
    })
  }

  async terminate() {
    for (const folderMgr of this.#folderMgrs) {
      folderMgr.terminate()
    }

    for (const task of this.#uploadTasks) {
      await task.entity.terminate()
    }

    for (const task of this.#downloadTasks) {
      await task.entity.terminate()
    }
  }

  get netdisk() {
    return this.#netdisk
  }

  get manualMgr() {
    return this.#manualMgr
  }
}
