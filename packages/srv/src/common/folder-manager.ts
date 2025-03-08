import { __CONST__ } from 'baidu-netdisk-sdk'
import fastglob from 'fast-glob'
import micromatch from 'micromatch'
import { type Job, scheduleJob } from 'node-schedule'
import fs from 'node:fs'
import path from 'node:path'
import { type UserManager } from './user-manager.js'
import { pathNormalized } from './utils.js'

export const enum EDIRECTION {
  UPLOAD = 1,
  DOWNLOAD = 2,
  SYNC = 3,
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
  conflict: ECONFLIC
  trigger: ITrigger
  excludes: string[]
}

export class FolderManager {
  #userMgr: UserManager
  #id: string
  #local: string = ''
  #remote: string = ''
  #encrypt: string = ''
  #direction: EDIRECTION = EDIRECTION.UPLOAD
  #conflict: ECONFLIC = ECONFLIC.LOCAL
  #trigger: ITrigger = { way: ETRIGGERWAY.STARTSTOP, starts: [], stops: [] }
  #excludes: string[] = []
  #scheduledJobs: Job[] = []
  #uploadQueue: { local: string; remote: string }[] = []
  #downloadQueue: { local: string; fsid: number }[] = []
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
    this.#conflict = inOpts.conflict
    this.#excludes = inOpts.excludes

    this.#changeTrigger(inOpts.trigger)
  }

  #changeTrigger(inTrigger: ITrigger) {
    for (const job of this.#scheduledJobs) {
      job.cancel()
    }

    this.#scheduledJobs = []

    this.#trigger.way = inTrigger.way
    this.#trigger.starts = inTrigger.starts
    this.#trigger.stops = inTrigger.stops

    for (const item of this.#trigger.starts) {
      const [hour, minute] = item.split(':')
      this.#scheduledJobs.push(scheduleJob(`${minute} ${hour} * * *`, () => this.runSync()))
    }

    if (this.#trigger.way === ETRIGGERWAY.STARTSTOP) {
      for (const item of this.#trigger.stops) {
        const [hour, minute] = item.split(':')
        this.#scheduledJobs.push(scheduleJob(`${minute} ${hour} * * *`, () => this.stopSync()))
      }
    }
  }

  async runSync() {
    if (this.#processing) {
      return
    }

    this.#processing = true

    try {
      const remoteList = await this.#userMgr.fetchList(this.#remote)

      if (this.#direction === EDIRECTION.UPLOAD) {
        const localList = await glob(this.#local, this.#excludes)

        for (const item of localList) {
          const targetRemotePath = pathNormalized(
            path.join(this.#remote, path.relative(this.#local, item.path))
          )

          const foundRemoteItem = remoteList.find(item => item.path === targetRemotePath)

          if (!foundRemoteItem) {
            this.#putInUploadQueue({ local: item.path, remote: targetRemotePath })

            continue
          }

          if (foundRemoteItem.local_mtime !== item.mtime) {
            this.#putInUploadQueue({ local: item.path, remote: targetRemotePath })

            continue
          }

          const comSize = getComSize(item.size, !!this.#encrypt)

          if (foundRemoteItem.size !== comSize) {
            this.#putInUploadQueue({ local: item.path, remote: targetRemotePath })

            continue
          }
        }
      } else if (this.#direction === EDIRECTION.DOWNLOAD) {
        for (const item of remoteList) {
          if (!item.path.startsWith(this.#remote)) {
            continue
          }

          if (
            isExcluded(pathNormalized(path.relative(this.#remote, item.path)), this.#excludes)
          ) {
            continue
          }

          const targetLocalPath = pathNormalized(
            path.join(this.#local, path.relative(this.#remote, item.path))
          )

          try {
            const stats = await fs.promises.stat(targetLocalPath)

            if (Math.floor(stats.mtimeMs / 1000) !== item.local_mtime) {
              this.#putInDownloadQueue({ fsid: item.fs_id, local: targetLocalPath })

              continue
            }

            if (getComSize(stats.size, !!this.#encrypt) !== item.size) {
              this.#putInDownloadQueue({ fsid: item.fs_id, local: targetLocalPath })

              continue
            }
          } catch {
            // 本地文件不存在
            this.#putInDownloadQueue({ fsid: item.fs_id, local: targetLocalPath })

            continue
          }
        }
      } else if (this.#direction === EDIRECTION.SYNC) {
        const solvedConflict: string[] = []
        const localList = await glob(this.#local, this.#excludes)

        for (const item of localList) {
          const targetRemotePath = pathNormalized(
            path.join(this.#remote, path.relative(this.#local, item.path))
          )

          const foundRemoteItem = remoteList.find(item => item.path === targetRemotePath)

          if (!foundRemoteItem) {
            this.#putInUploadQueue({ local: item.path, remote: targetRemotePath })

            continue
          }

          if (foundRemoteItem.local_mtime !== item.mtime) {
            if (this.#conflict === ECONFLIC.LOCAL) {
              this.#putInUploadQueue({ local: item.path, remote: targetRemotePath })
              solvedConflict.push(foundRemoteItem.path)
            }

            continue
          }

          const comSize = getComSize(item.size, !!this.#encrypt)

          if (foundRemoteItem.size !== comSize) {
            if (this.#conflict === ECONFLIC.LOCAL) {
              this.#putInUploadQueue({ local: item.path, remote: targetRemotePath })

              solvedConflict.push(foundRemoteItem.path)
            }

            continue
          }
        }

        for (const item of remoteList) {
          if (!item.path.startsWith(this.#remote)) {
            continue
          }

          if (solvedConflict.includes(item.path)) {
            continue
          }

          if (
            isExcluded(pathNormalized(path.relative(this.#remote, item.path)), this.#excludes)
          ) {
            continue
          }

          const targetLocalPath = pathNormalized(
            path.join(this.#local, path.relative(this.#remote, item.path))
          )

          try {
            const stats = await fs.promises.stat(targetLocalPath)

            if (Math.floor(stats.mtimeMs / 1000) !== item.local_mtime) {
              if (this.#conflict === ECONFLIC.REMOTE) {
                this.#putInDownloadQueue({ fsid: item.fs_id, local: targetLocalPath })
              }

              continue
            }

            if (getComSize(stats.size, !!this.#encrypt) !== item.size) {
              if (this.#conflict === ECONFLIC.REMOTE) {
                this.#putInDownloadQueue({ fsid: item.fs_id, local: targetLocalPath })
              }

              continue
            }
          } catch {
            this.#putInDownloadQueue({ fsid: item.fs_id, local: targetLocalPath })

            continue
          }
        }
      }

      this.#userMgr.runUploadQueue()
      this.#userMgr.runDownloadQueue()
    } catch {
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

  basicInfo(): IFolder {
    return {
      id: this.#id,
      local: this.#local,
      remote: this.#remote,
      encrypt: this.#encrypt,
      direction: this.#direction,
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
    for (const job of this.#scheduledJobs) {
      job.cancel()
    }
  }
}

async function glob(inPath: string, inExcludes: string[] = []) {
  const dirs = await fastglob.glob('**/*', {
    cwd: inPath,
    dot: true,
    ignore: inExcludes,
  })

  const result: { path: string; mtime: number; size: number }[] = []

  for (const dir of dirs) {
    const fullPath = path.join(inPath, dir)
    const stats = await fs.promises.stat(fullPath)

    result.push({
      path: pathNormalized(fullPath),
      mtime: Math.floor(stats.mtimeMs / 1000),
      size: stats.size,
    })
  }

  return result
}

function isExcluded(inPath: string, inExcludes: string[]) {
  return inExcludes.length > 0 && micromatch.isMatch(inPath, inExcludes)
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
