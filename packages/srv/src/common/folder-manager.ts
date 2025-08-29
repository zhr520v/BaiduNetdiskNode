import { __CONST__ } from 'baidu-netdisk-sdk'
import { EFileManageAsync, EUploadRtype } from 'baidu-netdisk-sdk/types'
import micromatch from 'micromatch'
import { type Job, scheduleJob } from 'node-schedule'
import fs from 'node:fs'
import path from 'node:path'
import { errorLog } from './log.js'
import { type IFetchListItem, type UserManager } from './user-manager.js'
import { isCron, pathNormalized } from './utils.js'

export const enum EDIRECTION {
  UPLOAD = 1,
  DOWNLOAD = 2,
  MIXED = 3,
}

export const enum EOPERATION {
  CRT_MOD = 1,
  CRT_MOD_DEL = 2,
}

export const enum ECONFLIC {
  LOCAL = 1,
  REMOTE = 2,
}

export const enum ETRIGGERWAY {
  STARTSTOP = 1, // 定时启停
  EVERYTIME = 2, // 定时检查
}

export interface ITrigger {
  way: ETRIGGERWAY
  starts: string[] // 00:00
  stops: string[] // 00:00
}

export interface IFolder {
  id: string
  local: string
  remote: string
  encrypt: string
  direction: EDIRECTION
  operation: EOPERATION
  conflict: ECONFLIC
  trigger: ITrigger
  excludes: string[]
}

export class FolderManager {
  #userMgr: UserManager
  #id: string
  #local = ''
  #remote = ''
  #encrypt = ''
  #direction = EDIRECTION.UPLOAD
  #operation = EOPERATION.CRT_MOD
  #conflict = ECONFLIC.LOCAL
  #trigger: ITrigger = { way: ETRIGGERWAY.STARTSTOP, starts: [], stops: [] }
  #excludes: string[] = []
  #startJobs: Job[] = []
  #stopJobs: Job[] = []
  #uploadQueue: { local: string; remote: string }[] = []
  #downloadQueue: { local: string; fsid: number }[] = []
  #createLocalQueue: string[] = []
  #deleteLocalQueue: string[] = []
  #createRemoteQueue: string[] = []
  #deleteRemoteQueue: string[] = []
  #createLocalProcessing = false
  #deleteLocalProcessing = false
  #createRemoteProcessing = false
  #deleteRemoteProcessing = false
  #processing = false

  constructor(
    inOpts: {
      userMgr: UserManager
    } & IFolder
  ) {
    this.#userMgr = inOpts.userMgr

    this.#id = inOpts.id

    this.update(inOpts)
  }

  update(inOpts: Omit<IFolder, 'id'>) {
    this.#local = inOpts.local
    this.#remote = inOpts.remote
    this.#encrypt = inOpts.encrypt
    this.#direction = inOpts.direction
    this.#operation = inOpts.operation
    this.#conflict = inOpts.conflict
    this.#excludes = inOpts.excludes

    this.#changeTrigger(inOpts.trigger)
  }

  #changeTrigger(inTrigger: ITrigger) {
    for (const job of this.#startJobs.concat(this.#stopJobs)) {
      job.cancel()
    }

    this.#startJobs = []
    this.#stopJobs = []

    this.#trigger.way = inTrigger.way
    this.#trigger.starts = inTrigger.starts
    this.#trigger.stops = inTrigger.stops

    this.#applyTriggerJobs('start', this.#trigger.starts)

    if (this.#trigger.way === ETRIGGERWAY.STARTSTOP) {
      this.#applyTriggerJobs('stop', this.#trigger.stops)
    }
  }

  #applyTriggerJobs(jobType: 'start' | 'stop', timeStrs: string[]) {
    const crons = []

    for (const timeStr of timeStrs) {
      if (isCron(timeStr)) {
        crons.push(timeStr)
        continue
      }

      if (/^\d{2}:\d{2}$/.test(timeStr)) {
        const [hour, minute] = timeStr.split(':')
        crons.push(`${minute} ${hour} * * *`)
        continue
      }
    }

    for (const cron of crons) {
      if (jobType === 'start') {
        this.#startJobs.push(scheduleJob(cron, () => this.runSync()))
        continue
      }

      if (jobType === 'stop') {
        this.#stopJobs.push(scheduleJob(cron, () => this.stopSync()))
        continue
      }
    }
  }

  getNextStartTime() {
    const nextTimes = this.#startJobs.map(job => job.nextInvocation()?.getTime() || 0)

    return nextTimes.length ? Math.min(...nextTimes) : 0
  }

  getNextStopTime() {
    const nextTimes = this.#stopJobs.map(job => job.nextInvocation()?.getTime() || 0)

    return nextTimes.length ? Math.min(...nextTimes) : 0
  }

  async runSync() {
    if (this.#processing) {
      return
    }

    this.#processing = true

    try {
      const { folderList: fdList, fileList: feList } = await this.#userMgr.fetchList(
        this.#remote
      )
      const localResult = await relativeGlob(this.#local, this.#local, this.#excludes)
      const remoteResult = relativeGlobLike(fdList, feList, this.#remote, this.#excludes)

      const localFolders = localResult.folders
      const localExcludedFolders = localResult.excludedFolders

      const remoteFolders = remoteResult.folders
      const remoteExcludedFolders = remoteResult.excludedFolders

      const localFiles = localResult.files.map(item => ({
        fs_id: 0,
        path: item.path,
        mtime: item.mtime,
        size: getComSize(item.size, !!this.#encrypt),
      }))
      const localExcludedFiles = localResult.excludedFiles

      const remoteFiles = remoteResult.files.map(item => ({
        fs_id: item.fs_id,
        path: item.path,
        mtime: item.local_mtime,
        size: item.size,
      }))
      const remoteExcludedFiles = remoteResult.excludedFiles

      const onlyLocalFolders = localFolders.filter(s => !remoteFolders.find(o => o === s))
      const onlyRemoteFolders = remoteFolders.filter(s => !localFolders.find(o => o === s))

      const onlyLocalFiles = localFiles.filter(s => !remoteFiles.find(o => o.path === s.path))
      const onlyRemoteFiles = remoteFiles.filter(s => !localFiles.find(o => o.path === s.path))

      const notMatchFiles = localFiles.filter(l => {
        const r = remoteFiles.find(i => i.path === l.path)

        if (!r) {
          return false
        }

        if (l.mtime === r.mtime && l.size === r.size) {
          return false
        }

        return true
      })

      // 将要上传的本地文件夹
      const onlyLocalLongestFolders = onlyLocalFolders
        .filter(s => !onlyLocalFolders.some(o => o.startsWith(s + '/'))) // 如果有文件夹是自己的子，则排除自己
        .filter(s => !onlyLocalFiles.some(o => o.path.startsWith(s + '/'))) // 如果有文件是自己的子，则排除自己
      // 将要下载的云端文件夹
      const onlyRemoteLongestFolders = onlyRemoteFolders
        .filter(s => !onlyRemoteFolders.some(o => o.startsWith(s + '/')))
        .filter(s => !onlyRemoteFiles.some(o => o.path.startsWith(s + '/')))

      // 将要删除的本地文件夹
      const onlyLocalShortestFolders = onlyLocalFolders
        .filter(s => !localExcludedFolders.some(o => o.startsWith(s + '/'))) // 如果有忽略的文件夹是自己的子，则排除自己
        .filter(s => !localExcludedFiles.some(o => o.startsWith(s + '/'))) // 如果有忽略的文件是自己的子，则排除自己
        .filter((s, i, a) => !a.some(o => s.startsWith(o + '/'))) // 如果存在文件夹是自己的父，则排除自己
      // 将要删除的云端文件夹
      const onlyRemoteShortestFolders = onlyRemoteFolders
        .filter(s => !remoteExcludedFolders.some(o => o.startsWith(s + '/')))
        .filter(s => !remoteExcludedFiles.some(o => o.startsWith(s + '/')))
        .filter((s, i, a) => !a.some(o => s.startsWith(o + '/')))

      if (this.#direction === EDIRECTION.UPLOAD) {
        const fullUploadList = onlyLocalFiles.concat(notMatchFiles)

        for (const i of fullUploadList) {
          this.#putInUploadQueue({
            local: pathNormalized(path.join(this.#local, i.path)),
            remote: pathNormalized(path.join(this.#remote, i.path)),
          })
        }

        this.#createRemoteQueue = this.#createRemoteQueue.concat(
          onlyLocalLongestFolders.map(i => pathNormalized(path.join(this.#remote, i)))
        )

        if (this.#operation === EOPERATION.CRT_MOD_DEL) {
          const deleteList = onlyRemoteFiles
            .filter(s => !onlyRemoteShortestFolders.some(o => s.path.startsWith(o + '/')))
            .map(i => i.path)
            .concat(onlyRemoteShortestFolders)
            .map(i => pathNormalized(path.join(this.#remote, i)))

          this.#deleteRemoteQueue = this.#deleteRemoteQueue.concat(deleteList)
        }
      } else if (this.#direction === EDIRECTION.DOWNLOAD) {
        const fullDownloadList = onlyRemoteFiles.concat(notMatchFiles)

        for (const item of fullDownloadList) {
          this.#putInDownloadQueue({
            fsid: item.fs_id,
            local: pathNormalized(path.join(this.#local, item.path)),
          })
        }

        this.#createLocalQueue = this.#createLocalQueue.concat(
          onlyRemoteLongestFolders.map(i => pathNormalized(path.join(this.#local, i)))
        )

        if (this.#operation === EOPERATION.CRT_MOD_DEL) {
          const deleteList = onlyLocalFiles
            .filter(s => !onlyLocalShortestFolders.some(o => s.path.startsWith(o + '/')))
            .map(i => i.path)
            .concat(onlyLocalShortestFolders)
            .map(i => pathNormalized(path.join(this.#local, i)))

          this.#deleteLocalQueue = this.#deleteLocalQueue.concat(deleteList)
        }
      } else if (this.#direction === EDIRECTION.MIXED) {
        if (this.#conflict === ECONFLIC.LOCAL) {
          const fullUploadList = onlyLocalFiles.concat(notMatchFiles)

          for (const i of fullUploadList) {
            this.#putInUploadQueue({
              local: pathNormalized(path.join(this.#local, i.path)),
              remote: pathNormalized(path.join(this.#remote, i.path)),
            })
          }

          this.#createRemoteQueue = this.#createRemoteQueue.concat(
            onlyLocalLongestFolders.map(i => pathNormalized(path.join(this.#remote, i)))
          )

          for (const i of onlyRemoteFiles) {
            this.#putInDownloadQueue({
              fsid: i.fs_id,
              local: pathNormalized(path.join(this.#local, i.path)),
            })
          }

          this.#createLocalQueue = this.#createLocalQueue.concat(
            onlyRemoteLongestFolders.map(i => pathNormalized(path.join(this.#local, i)))
          )
        } else if (this.#conflict === ECONFLIC.REMOTE) {
          for (const i of onlyLocalFiles) {
            this.#putInUploadQueue({
              local: pathNormalized(path.join(this.#local, i.path)),
              remote: pathNormalized(path.join(this.#remote, i.path)),
            })
          }

          this.#createRemoteQueue = this.#createRemoteQueue.concat(
            onlyLocalLongestFolders.map(i => pathNormalized(path.join(this.#remote, i)))
          )

          const fullDownloadList = onlyRemoteFiles.concat(notMatchFiles)

          for (const i of fullDownloadList) {
            this.#putInDownloadQueue({
              fsid: i.fs_id,
              local: pathNormalized(path.join(this.#local, i.path)),
            })
          }

          this.#createLocalQueue = this.#createLocalQueue.concat(
            onlyRemoteLongestFolders.map(i => pathNormalized(path.join(this.#local, i)))
          )
        }
      }

      this.#runDeleteLocalQueue()
      this.#runCreateLocalQueue()
      this.#runDeleteRemoteQueue()
      this.#runCreateRemoteQueue()
      this.#userMgr.runUploadQueue()
      this.#userMgr.runDownloadQueue()
    } catch (inErr) {
      errorLog(`检查任务启动失败: ${(inErr as Error).message}`)
    } finally {
      this.#processing = false
    }
  }

  stopSync() {
    const uploadTasks = this.#userMgr.getUploadTasks()

    for (const task of uploadTasks) {
      if (task.folderId === this.#id) {
        task.entity.stop()
      }
    }

    const downloadTasks = this.#userMgr.getDownloadTasks()

    for (const task of downloadTasks) {
      if (task.folderId === this.#id) {
        task.entity.stop()
      }
    }
  }

  #putInUploadQueue(inItem: { local: string; remote: string }) {
    const uploadTasks = this.#userMgr.getUploadTasks()

    for (const task of uploadTasks) {
      if (task.local === inItem.local && task.remote === inItem.remote) {
        if (task.entity.info.stepError) {
          this.#userMgr.removeTask(task.taskId, 'upload')
          this.#uploadQueue.push(inItem)

          return
        }

        return
      }
    }

    for (const queue of this.#uploadQueue) {
      if (queue.local === inItem.local && queue.remote === inItem.remote) {
        return
      }
    }

    this.#uploadQueue.push(inItem)
  }

  #putInDownloadQueue(inItem: { fsid: number; local: string }) {
    const downloadTasks = this.#userMgr.getDownloadTasks()

    for (const task of downloadTasks) {
      if (task.fsid === inItem.fsid && task.local === inItem.local) {
        if (task.entity.info.stepError) {
          this.#userMgr.removeTask(task.taskId, 'download')
          this.#downloadQueue.push(inItem)

          return
        }

        return
      }
    }

    for (const queue of this.#downloadQueue) {
      if (queue.fsid === inItem.fsid && queue.local === inItem.local) {
        return
      }
    }

    this.#downloadQueue.push(inItem)
  }

  async #runCreateLocalQueue() {
    if (this.#createLocalProcessing) {
      return
    }

    const next = this.#createLocalQueue.shift()

    if (!next) {
      return
    }

    this.#createLocalProcessing = true

    try {
      await fs.promises.mkdir(next, { recursive: true })
    } catch (inErr) {
      errorLog(`新建本地文件夹失败: ${(inErr as Error).message}`)
    } finally {
      this.#createLocalProcessing = false
    }

    this.#runCreateLocalQueue()
  }

  async #runDeleteLocalQueue() {
    if (this.#deleteLocalProcessing) {
      return
    }

    const next = this.#deleteLocalQueue.shift()

    if (!next) {
      return
    }

    this.#deleteLocalProcessing = true

    try {
      await fs.promises.rm(next, { recursive: true, force: true })
    } catch (inErr) {
      errorLog(`删除本地文件(夹)失败: ${(inErr as Error).message}`)
    } finally {
      this.#deleteLocalProcessing = false
    }

    this.#runDeleteLocalQueue()
  }

  async #runCreateRemoteQueue() {
    if (this.#createRemoteProcessing) {
      return
    }

    const next = this.#createRemoteQueue.shift()

    if (!next) {
      return
    }

    this.#createRemoteProcessing = true

    try {
      await this.#userMgr.netdisk.createFolder({
        path: next,
        opts: {
          rtype: EUploadRtype.FAIL,
        },
      })
    } catch (inErr) {
      errorLog(`新建云端文件夹失败: ${(inErr as Error).message}`)
    } finally {
      this.#createRemoteProcessing = false
    }

    this.#runCreateRemoteQueue()
  }

  async #runDeleteRemoteQueue() {
    if (this.#deleteRemoteProcessing) {
      return
    }

    const nexts = this.#deleteRemoteQueue.slice(0, 50)
    this.#deleteRemoteQueue = this.#deleteRemoteQueue.slice(50)

    if (nexts.length === 0) {
      return
    }

    this.#deleteRemoteProcessing = true

    try {
      await this.#userMgr.netdisk.deleteFoldersOrFiles({
        list: nexts.map(i => ({ source: i })),
        async: EFileManageAsync.SYNC,
      })
    } catch (inErr) {
      errorLog(`删除云端文件(夹)失败: ${(inErr as Error).message}`)
    } finally {
      this.#deleteRemoteProcessing = false
    }

    this.#runDeleteRemoteQueue()
  }

  basicInfo(): IFolder {
    return {
      id: this.#id,
      local: this.#local,
      remote: this.#remote,
      encrypt: this.#encrypt,
      direction: this.#direction,
      operation: this.#operation,
      conflict: this.#conflict,
      trigger: this.#trigger,
      excludes: this.#excludes,
    }
  }

  getChecking() {
    return this.#processing
  }

  getUploadQueue() {
    return this.#uploadQueue
  }

  shiftUploadQueue() {
    return this.#uploadQueue.shift()
  }

  getDownloadQueue() {
    return this.#downloadQueue
  }

  shiftDownloadQueue() {
    return this.#downloadQueue.shift()
  }

  terminate() {
    for (const job of this.#startJobs.concat(this.#stopJobs)) {
      job.cancel()
    }
  }
}

async function relativeGlob(inPath: string, inRoot: string, inExcludes: string[]) {
  let folders: string[] = []
  let files: { path: string; mtime: number; size: number }[] = []
  let excludedFolders: string[] = []
  let excludedFiles: string[] = []

  const dirs = await fs.promises.readdir(inPath)

  for (const dir of dirs) {
    const absolute = path.resolve(inPath, dir)
    const relative = pathNormalized(path.relative(inRoot, absolute))

    const excluded = isExcluded(relative, inExcludes)

    const stats = await fs.promises.stat(absolute)

    if (stats.isDirectory()) {
      if (excluded) {
        excludedFolders.push(relative)
      } else {
        folders.push(relative)

        const sub = await relativeGlob(absolute, inRoot, inExcludes)

        folders = folders.concat(sub.folders)
        files = files.concat(sub.files)
        excludedFolders = excludedFolders.concat(sub.excludedFolders)
        excludedFiles = excludedFiles.concat(sub.excludedFiles)
      }
    } else {
      if (excluded) {
        excludedFiles.push(relative)
      } else {
        files.push({
          path: relative,
          mtime: Math.floor(stats.mtimeMs / 1000),
          size: stats.size,
        })
      }
    }
  }

  return {
    folders: folders.filter(s => !excludedFolders.some(o => s.startsWith(o + '/'))),
    files: files.filter(s => !excludedFolders.some(o => s.path.startsWith(o + '/'))),
    excludedFolders: excludedFolders.filter(
      s => !excludedFolders.some(o => s.startsWith(o + '/'))
    ),
    excludedFiles: excludedFiles.filter(s => !excludedFolders.some(o => s.startsWith(o + '/'))),
  }
}

function relativeGlobLike(
  inFolders: IFetchListItem[],
  inFiles: IFetchListItem[],
  inRoot: string,
  inExcludes: string[]
) {
  const folders: string[] = []
  const files: IFetchListItem[] = []
  const excludedFolders: string[] = []
  const excludedFiles: string[] = []

  for (const folder of inFolders) {
    const relative = pathNormalized(path.relative(inRoot, folder.path))
    const excluded = isExcluded(relative, inExcludes)

    if (excluded) {
      excludedFolders.push(relative)
    } else {
      folders.push(relative)
    }
  }

  for (const file of inFiles) {
    const relative = pathNormalized(path.relative(inRoot, file.path))
    const excluded = isExcluded(relative, inExcludes)

    if (excluded) {
      excludedFiles.push(relative)
    } else {
      files.push(Object.assign({}, file, { path: relative }))
    }
  }

  return {
    folders: folders.filter(s => !excludedFolders.some(o => s.startsWith(o + '/'))),
    files: files.filter(s => !excludedFolders.some(o => s.path.startsWith(o + '/'))),
    excludedFolders: excludedFolders.filter(
      s => !excludedFolders.some(o => s.startsWith(o + '/'))
    ),
    excludedFiles: excludedFiles.filter(s => !excludedFolders.some(o => s.startsWith(o + '/'))),
  }
}

function isExcluded(inPath: string, inExcludes: string[]) {
  return inExcludes.length > 0 && micromatch.isMatch(inPath, inExcludes, { dot: true })
}

const __PRESV_ENC_BLOCK_SIZE__ = __CONST__.__PRESV_ENC_BLOCK_SIZE__

function getComSize(inSize: number, inUseEncrypt: boolean) {
  let chunkMB = 0

  if (inUseEncrypt) {
    if (inSize <= 8589932544 - __PRESV_ENC_BLOCK_SIZE__) {
      // 2047 * (04 * 1024 * 1024 - 1) + (04 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1) <≈ 8GB
      chunkMB = 4
    } else if (inSize <= 17179867136 - __PRESV_ENC_BLOCK_SIZE__) {
      // 2047 * (08 * 1024 * 1024 - 1) + (08 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1) <≈ 16GB
      chunkMB = 8
    } else if (inSize <= 34359736320 - __PRESV_ENC_BLOCK_SIZE__) {
      // 2047 * (16 * 1024 * 1024 - 1) + (16 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1) <≈ 32GB
      chunkMB = 16
    } else if (inSize <= 68719474688 - __PRESV_ENC_BLOCK_SIZE__) {
      // 2047 * (32 * 1024 * 1024 - 1) + (32 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1) <≈ 64GB
      chunkMB = 32
    } else if (inSize <= 137438951424 - __PRESV_ENC_BLOCK_SIZE__) {
      // 2047 * (64 * 1024 * 1024 - 1) + (64 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1) <≈ 128GB
      chunkMB = 64
    } else {
      throw new Error(
        `文件大小 ${inSize} 超过限制. 最大支持 ${137438951424 - __PRESV_ENC_BLOCK_SIZE__}`
      )
    }
  } else {
    if (inSize <= 8589934592) {
      // 04 * 1024 * 1024 * 2048 = 8GB
      chunkMB = 4
    } else if (inSize <= 17179869184) {
      // 08 * 1024 * 1024 * 2048 = 16GB
      chunkMB = 8
    } else if (inSize <= 34359738368) {
      // 16 * 1024 * 1024 * 2048 = 32GB
      chunkMB = 16
    } else if (inSize <= 68719476736) {
      // 32 * 1024 * 1024 * 2048 = 64GB
      chunkMB = 32
    } else if (inSize <= 137438953472) {
      // 64 * 1024 * 1024 * 2048 = 128GB
      chunkMB = 64
    } else {
      throw new Error(`文件大小 ${inSize} 超过限制. 最大支持 137438953472`)
    }
  }

  const chunkSize = inUseEncrypt ? chunkMB * 1024 * 1024 - 1 : chunkMB * 1024 * 1024
  const fixedSliceNo = Math.floor(inSize / chunkSize)
  const rest = inSize % chunkSize
  const fixedRest = inUseEncrypt
    ? (rest % 16 === 0 ? rest + 16 : rest + 16 - (rest % 16)) + __PRESV_ENC_BLOCK_SIZE__
    : rest

  return fixedSliceNo * chunkMB * 1024 * 1024 + fixedRest
}
