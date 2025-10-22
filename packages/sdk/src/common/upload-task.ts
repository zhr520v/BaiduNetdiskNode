import {
  httpDelete,
  httpFileInfo,
  httpUploadFinish,
  httpUploadId,
  request,
} from 'baidu-netdisk-api'
import { type IBaiduApiError } from 'baidu-netdisk-api/types'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import util from 'node:util'
import {
  EFileManageAsync,
  EFileManageOndup,
  EStepStatus,
  EUploadRtype,
  EUploadSteps,
} from '../types/enums.js'
import {
  type IDownloadMainDoneBytesRes,
  type IDownloadMainDoneRes,
  type IDownloadMainRunReq,
  type IDownloadMainThreadData,
} from '../workers/download-main.js'
import { type IMd5DoneRes, type IMd5ThreadData } from '../workers/md5.js'
import {
  type IUploadMainDoneBytesRes,
  type IUploadMainRunReq,
  type IUploadMainThreadData,
} from '../workers/upload-main.js'
import {
  __DOWNLOAD_THREADS__,
  __PRESV_ENC_BLOCK_SIZE__,
  __REMOTE_TMP_FOLDER__,
  __TRY_DELTA__,
  __TRY_TIMES__,
  __UPLOAD_THREADS__,
} from './const.js'
import { fileManage } from './file-manage.js'
import { Steps } from './steps.js'
import { getUploadUrl } from './upload-url.js'
import { pathNormalized, pick, PromBat, type PromType, tryTimes } from './utils.js'
import { type IThreadError, newWorker, WorkerParent } from './worker.js'

const FS_STAT_ASYNC = util.promisify(fs.stat)

export type IUploadFinish = Pick<
  PromType<ReturnType<typeof httpUploadFinish>>['data'],
  'category' | 'ctime' | 'fs_id' | 'isdir' | 'md5' | 'mtime' | 'name' | 'path' | 'size'
>

export class UploadTask {
  #app_name = ''
  #access_token = ''
  #local = ''
  #remote = ''
  #noOverwrite = false
  #threads = __UPLOAD_THREADS__
  #noSilent = false
  #tryTimes = __TRY_TIMES__
  #tryDelta = __TRY_DELTA__
  #apiOpts: Pick<
    Parameters<typeof httpUploadFinish>[1],
    'exif_info' | 'is_revision' | 'mode' | 'zip_quality' | 'zip_sign'
  > = {}

  #ctimeMs = 0
  #mtimeMs = 0
  #oriSize = 0

  #md5Worker: WorkerParent | null = null
  #comSize = 0
  #chunkMB = 4
  #md5s: string[] = []
  #md5full = ''
  #keyBuf = Buffer.alloc(0)
  #ivBuf: Buffer = Buffer.alloc(0)
  #endSliceNo = 0

  #uploadId = ''
  #remoteTmp = ''
  #remoteDupNewPath = ''
  #remoteDupNewPathUsed = false

  #uploadWorker: WorkerParent | undefined
  #upBytes = 0

  #noVerify = false
  #downThreads = __DOWNLOAD_THREADS__
  #dlink = ''

  #downloadWorker: WorkerParent | undefined
  #downBytes = 0

  #finishData: IUploadFinish | undefined

  #steps: Steps
  #doneProm: PromBat<IUploadFinish> | undefined
  #onDone: ((inData: IUploadFinish) => void) | undefined
  #onError: (inError: Error) => void = () => {}
  #onStatusChanged: (inNewStatus: EStepStatus, inError: Error | null) => void = () => {}

  constructor(inOpts: {
    app_name: string
    access_token: string
    local: string
    remote: string
    noOverwrite?: boolean
    encrypt?: string
    threads?: number
    noSilent?: boolean
    tryTimes?: number
    tryDelta?: number
    noVerify?: boolean
    downloadThreads?: number
    apiOpts?: Pick<
      Parameters<typeof httpUploadFinish>[1],
      'exif_info' | 'is_revision' | 'mode' | 'zip_quality' | 'zip_sign'
    >
    onDone?: (inData: IUploadFinish) => void
    onError?: (inError: Error) => void
    onStatusChanged?: (inNewStatus: EStepStatus, inError: Error | null) => void
  }) {
    this.#app_name = inOpts.app_name
    this.#access_token = inOpts.access_token
    this.#local = inOpts.local
    this.#remote = pathNormalized(inOpts.remote)
    this.#noOverwrite = inOpts.noOverwrite || this.#noOverwrite
    this.#threads = inOpts.threads || this.#threads
    this.#noSilent = inOpts.noSilent || this.#noSilent
    this.#tryTimes = inOpts.tryTimes || this.#tryTimes
    this.#tryDelta = inOpts.tryDelta || this.#tryDelta
    this.#noVerify = inOpts.noVerify || this.#noVerify
    this.#downThreads = inOpts.downloadThreads || this.#downThreads
    this.#apiOpts = inOpts.apiOpts || this.#apiOpts
    this.#onDone = inOpts.onDone || this.#onDone
    this.#onError = inOpts.onError || this.#onError
    this.#onStatusChanged = inOpts.onStatusChanged || this.#onStatusChanged

    this.#doneProm = this.#onDone ? this.#doneProm : new PromBat<IUploadFinish>()

    this.#formatEncrypt(inOpts.encrypt)

    this.#steps = new Steps({
      steps: [
        { id: EUploadSteps.FILE_INFO, exec: () => this.#stepFileInfo() },
        {
          id: EUploadSteps.LOCAL_MD5,
          exec: () => this.#stepLocalMd5(),
          stop: () => this.#stopLocalMd5(),
        },
        { id: EUploadSteps.UPLOAD_ID, exec: () => this.#stepUploadId() },
        {
          id: EUploadSteps.UPLOAD_SLICES,
          exec: () => this.#stepUploadSlices(),
          stop: (inForce?: boolean) => this.#stopUploadSlices(inForce),
        },
        {
          id: EUploadSteps.COMBINE,
          exec: () => this.#stepCombine(),
        },
        {
          id: EUploadSteps.MOVE,
          exec: () => this.#stepMove(),
        },
        {
          id: EUploadSteps.DOWNLOAD_INFO,
          exec: () => this.#stepPreDownload(),
        },
        {
          id: EUploadSteps.VERIFY_DOWNLOAD,
          exec: () => this.#stepVerifyDownload(),
          stop: (inForce?: boolean) => this.#stopVerifyDownload(inForce),
        },
        {
          id: EUploadSteps.REMOVE_DUP,
          exec: () => this.#stepRemoveDup(),
        },
        { id: EUploadSteps.FINISH, exec: () => this.#stepFinish() },
      ],
      onBeforeRun: async () => {
        if (this.#mtimeMs > 0) {
          const stats = await FS_STAT_ASYNC(this.#local)

          if (this.#mtimeMs !== Math.floor(stats.mtimeMs)) {
            throw new Error(`文件已被修改，请重新上传: ${this.#local}`)
          }
        }
      },
      onStatusChanged: inNewStatus => {
        if (inNewStatus === EStepStatus.STOPPED && this.#steps.error && this.#noSilent) {
          this.#doneProm?.rej(this.#steps.error)
          this.#onError(this.#steps.error)
        }

        this.#onStatusChanged(inNewStatus, this.#steps.error)
      },
    })
  }

  async #stepFileInfo() {
    const stats = await FS_STAT_ASYNC(this.#local)

    this.#ctimeMs = Math.floor(stats.ctimeMs)
    this.#mtimeMs = Math.floor(stats.mtimeMs)
    this.#oriSize = stats.size

    const needfulParams = getChunkMBComSize(stats.size, !!this.#keyBuf.length)
    this.#comSize = needfulParams.comSize
    this.#chunkMB = needfulParams.chunkMB
    this.#endSliceNo = Math.max(
      Math.ceil(
        this.#keyBuf.length
          ? this.#oriSize / (this.#chunkMB * 1024 * 1024 - 1)
          : this.#oriSize / (this.#chunkMB * 1024 * 1024)
      ) - 1,
      0
    )
  }

  async #stepLocalMd5() {
    await new Promise<void>((resolve, reject) => {
      const worker = newWorker<IMd5ThreadData>('md5', {
        local: this.#local,
        oriSize: this.#oriSize,
        chunkMB: this.#chunkMB,
        keyBuf: this.#keyBuf,
        ivBuf: this.#ivBuf,
        endSliceNo: this.#endSliceNo,
      })

      const fixedWorker = new WorkerParent(worker)

      fixedWorker.onRecvData<IMd5DoneRes>('MD5_DONE', inData => {
        this.#md5full = inData.md5full
        this.#md5s = inData.md5s
        resolve()
      })

      fixedWorker.onRecvData<IThreadError>('THREAD_ERROR', inError => {
        this.#stopLocalMd5()
        reject(inError)
      })

      this.#md5Worker = fixedWorker
    })

    const tmpName = `${this.#md5full.substring(0, 16)}${crypto.randomBytes(8).toString('hex').toUpperCase()}`
    this.#remoteTmp = `/apps/${this.#app_name}/${__REMOTE_TMP_FOLDER__}/${tmpName}`
    this.#remoteDupNewPath = `${this.#remote}.${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    await this.#stopLocalMd5()
  }

  async #stepUploadId() {
    const info = await tryTimes(
      () =>
        httpUploadId(
          { access_token: this.#access_token },
          {
            path: this.#remoteTmp,
            block_list: JSON.stringify(this.#md5s),
            size: this.#comSize,
            rtype: this.#noOverwrite ? EUploadRtype.FAIL : EUploadRtype.OVERWRITE,
          }
        ),
      { times: this.#tryTimes, delta: this.#tryDelta }
    )

    this.#uploadId = info.data.uploadid
  }

  async #stepUploadSlices() {
    const uploadUrl = await tryTimes(() => getUploadUrl(), {
      times: this.#tryTimes,
      delta: this.#tryDelta,
    })

    if (!this.#uploadWorker) {
      const worker = newWorker<IUploadMainThreadData>('upload-main', {
        access_token: this.#access_token,
        local: this.#local,
        remote: this.#remoteTmp,
        oriSize: this.#oriSize,
        chunkMB: this.#chunkMB,
        keyBuf: this.#keyBuf,
        ivBuf: this.#ivBuf,
        md5full: this.#md5full,
        endSliceNo: this.#endSliceNo,
        uploadId: this.#uploadId,
      })

      this.#uploadWorker = new WorkerParent(worker)
    }

    await new Promise<void>((resolve, reject) => {
      this.#uploadWorker?.onRecvData<IUploadMainDoneBytesRes>(
        'UPLOAD_MAIN_DONE_BYTES',
        inData => {
          this.#upBytes += inData.bytes
        }
      )

      this.#uploadWorker?.onRecvData<IThreadError>('THREAD_ERROR', inError => {
        reject(new Error(inError.msg))
      })

      this.#uploadWorker?.onRecvData('UPLOAD_MAIN_DONE', () => resolve())

      this.#uploadWorker?.sendData<IUploadMainRunReq>('UPLOAD_MAIN_RUN', {
        threads: this.#threads,
        uploadUrl: uploadUrl,
        tryTimes: this.#tryTimes,
        tryDelta: this.#tryDelta,
      })
    })

    await this.#stopUploadSlices(true)
  }

  async #stepCombine() {
    const { data } = await tryTimes(
      () =>
        httpUploadFinish(
          {
            access_token: this.#access_token,
          },
          {
            ...this.#apiOpts,
            block_list: JSON.stringify(this.#md5s),
            path: this.#remoteTmp,
            size: `${this.#comSize}`,
            uploadid: this.#uploadId,
            rtype: this.#noOverwrite ? EUploadRtype.FAIL : EUploadRtype.OVERWRITE,
            local_ctime: `${Math.floor(this.#ctimeMs / 1000)}`,
            local_mtime: `${Math.floor(this.#mtimeMs / 1000)}`,
          }
        ),
      { times: this.#tryTimes, delta: this.#tryDelta }
    )

    this.#finishData = pick(data, [
      'category',
      'ctime',
      'fs_id',
      'isdir',
      'md5',
      'mtime',
      'name', // baidudocs named "server_filename"
      'path',
      'size',
    ])
  }

  async #stepMove() {
    await tryTimes(
      async () => {
        try {
          await fileManage({
            access_token: this.#access_token,
            opera: 'move',
            list: [
              {
                source: this.#remoteTmp,
                target: this.#remote,
                ondup: this.#noOverwrite ? EFileManageOndup.FAIL : EFileManageOndup.OVERWRITE,
              },
            ],
            async: EFileManageAsync.SYNC,
          })
        } catch (inErr) {
          const e = inErr as IBaiduApiError
          const resData = e.baidu as { info?: { errno?: number }[] }

          // 即使 ondup=overwrite 在 async=0 时也会返回 -8 错误文件已存在
          if (resData.info?.[0]?.errno === -8) {
            try {
              await fileManage({
                access_token: this.#access_token,
                opera: 'rename',
                list: [
                  { source: this.#remote, newname: path.basename(this.#remoteDupNewPath) },
                ],
                async: EFileManageAsync.SYNC,
              })

              this.#remoteDupNewPathUsed = true
            } catch {}
          }

          throw e
        }
      },
      { times: this.#tryTimes, delta: this.#tryDelta }
    )

    if (this.#finishData) {
      this.#finishData.name = this.#remote
      this.#finishData.path = this.#remote
    }
  }

  async #stepPreDownload() {
    if (this.#noVerify) {
      return
    }

    if (!this.#finishData?.fs_id) {
      throw new Error('文件信息缺少fs_id')
    }

    const { data } = await tryTimes(
      () =>
        httpFileInfo({
          access_token: this.#access_token,
          fsids: JSON.stringify([this.#finishData?.fs_id]),
          dlink: 1,
        }),
      { times: this.#tryTimes, delta: this.#tryDelta }
    )

    const file = data.list[0]

    if (!file) {
      throw new Error('文件信息获取失败')
    }

    if (this.#keyBuf.length && file.size < __PRESV_ENC_BLOCK_SIZE__ + 16) {
      throw new Error('文件大小不符合解密条件')
    }

    if (file.size !== this.#comSize) {
      throw new Error('文件原始大小不匹配')
    }

    if (!file.dlink) {
      throw new Error('文件下载链接获取失败')
    }

    this.#dlink = file.dlink

    if (!this.#keyBuf.length) {
      return
    }

    const { data: presvData } = await tryTimes(
      () =>
        request<ArrayBuffer>({
          url: this.#dlink,
          method: 'GET',
          params: {
            access_token: this.#access_token,
          },
          headers: {
            'User-Agent': 'pan.baidu.com',
            Range: `bytes=${this.#comSize - __PRESV_ENC_BLOCK_SIZE__}-${this.#comSize - 1}`,
          },
          responseType: 'arraybuffer',
          responseEncoding: 'binary',
        }),
      { times: this.#tryTimes, delta: this.#tryDelta }
    )

    const presvBuf = Buffer.from(presvData)

    const ivBuf = presvBuf.subarray(0, 16)
    const md5Middle = presvBuf.subarray(16, 16 + 16).toString()
    const oriSize = Number(presvBuf.readBigUInt64BE(16 + 16))
    const chunkMB = presvBuf.readUint32BE(16 + 16 + 8)
    const sum = presvBuf.readUInt32BE(16 + 16 + 8 + 4)

    if (this.#ivBuf.compare(ivBuf) !== 0) {
      throw new Error('加密IV不匹配')
    }

    if (this.#md5full.substring(8, 24) !== md5Middle) {
      throw new Error('加密信息记载MD5不匹配')
    }

    if (this.#oriSize !== oriSize) {
      throw new Error('加密信息记载原始大小不匹配')
    }

    if (this.#chunkMB !== chunkMB) {
      throw new Error('加密信息记载分块大小不匹配')
    }

    if (sum !== presvBuf.subarray(0, 16 + 16 + 8 + 4).reduce((pre, cur) => pre + cur, 0)) {
      throw new Error('加密信息记载校验和不匹配')
    }
  }

  async #stepVerifyDownload() {
    if (this.#noVerify) {
      return
    }

    if (!this.#downloadWorker) {
      const chunkBytes = this.#chunkMB * 1024 * 1024
      const plainChunkBytes = this.#keyBuf.length ? chunkBytes - 1 : chunkBytes
      const pureComSize = this.#comSize - (this.#keyBuf.length ? __PRESV_ENC_BLOCK_SIZE__ : 0)
      const totalSlice = Math.max(Math.ceil(pureComSize / chunkBytes), 1)

      const worker = newWorker<IDownloadMainThreadData>('download-main', {
        access_token: this.#access_token,
        local: '',
        chunkMB: this.#chunkMB,
        chunkBytes,
        plainChunkBytes,
        shrinkComSize: this.#keyBuf.length
          ? this.#comSize - __PRESV_ENC_BLOCK_SIZE__
          : this.#comSize,
        keyBuf: this.#keyBuf,
        ivBuf: this.#ivBuf,
        totalSlice: totalSlice,
        returnBuffer: true,
        noWrite: true,
        noVerifyOnDisk: true,
      })

      this.#downloadWorker = new WorkerParent(worker)
    }

    await new Promise<void>((resolve, reject) => {
      this.#downloadWorker?.onRecvData<IDownloadMainDoneBytesRes>(
        'DOWNLOAD_MAIN_DONE_BYTES',
        inData => {
          this.#downBytes += inData.bytes
        }
      )

      this.#downloadWorker?.onRecvData<IThreadError>('THREAD_ERROR', inError => {
        reject(new Error(inError.msg))
      })

      this.#downloadWorker?.onRecvData<IDownloadMainDoneRes>('DOWNLOAD_MAIN_DONE', inData => {
        if (this.#md5full !== inData.md5) {
          this.#stopVerifyDownload(true)

          return reject(new Error('下载文件MD5与上传文件MD5不匹配'))
        }

        resolve()
      })

      this.#downloadWorker?.sendData<IDownloadMainRunReq>('DOWNLOAD_MAIN_RUN', {
        dlink: this.#dlink,
        threads: this.#threads,
        tryTimes: this.#tryTimes,
        tryDelta: this.#tryDelta,
      })
    })

    await this.#stopVerifyDownload(true)
  }

  async #stepRemoveDup() {
    if (this.#remoteDupNewPathUsed) {
      await fileManage({
        access_token: this.#access_token,
        opera: 'delete',
        list: [{ source: this.#remoteDupNewPath }],
        async: EFileManageAsync.SYNC,
      })
    }
  }

  async #stepFinish() {
    this.#doneProm?.res(this.#finishData!)
    this.#onDone?.(this.#finishData!)
  }

  async #stopLocalMd5() {
    await this.#md5Worker?.terminate()
  }

  async #stopUploadSlices(inForce?: boolean) {
    this.#uploadWorker?.sendData('UPLOAD_MAIN_STOP')

    if (inForce) {
      await this.#uploadWorker?.terminate()
      this.#upBytes = 0
      this.#uploadWorker = void 0
    }
  }

  async #stopVerifyDownload(inForce?: boolean) {
    this.#downloadWorker?.sendData('DOWNLOAD_MAIN_STOP')

    if (inForce) {
      await this.#downloadWorker?.terminate()
      this.#downBytes = 0
      this.#downloadWorker = void 0
    }
  }

  #formatEncrypt(inKey?: string) {
    if (!inKey) {
      return
    }

    if (inKey.length > 32) {
      throw new Error(`密钥 ${inKey} 过长, 不能超过 32 个字符`)
    }

    if (/\s/.test(inKey)) {
      throw new Error(`密钥 ${inKey} 不能包含空格`)
    }

    this.#keyBuf = Buffer.from(inKey.padEnd(32, '0'))
    this.#ivBuf = crypto.randomBytes(16)
  }

  run() {
    if (this.#steps.error) {
      this.#doneProm = this.#onDone ? this.#doneProm : new PromBat<IUploadFinish>()
    }

    this.#steps.run()
  }

  async stop() {
    await this.#steps.stop()
  }

  async terminate() {
    await this.#steps.stop(true)

    if (this.#steps.id > EUploadSteps.MOVE) {
      await httpDelete(
        {
          access_token: this.#access_token,
        },
        {
          filelist: JSON.stringify([this.#remote]),
          async: EFileManageAsync.SYNC,
        }
      ).catch()

      if (this.#remoteDupNewPathUsed) {
        await fileManage({
          access_token: this.#access_token,
          opera: 'delete',
          list: [{ source: this.#remoteDupNewPath, newname: path.basename(this.#remote) }],
          async: EFileManageAsync.SYNC,
        }).catch()
      }

      return
    }

    if (this.#steps.id > EUploadSteps.COMBINE) {
      await httpDelete(
        {
          access_token: this.#access_token,
        },
        {
          filelist: JSON.stringify([this.#remoteTmp]),
          async: EFileManageAsync.SYNC,
        }
      ).catch()

      return
    }
  }

  get done() {
    return this.#doneProm?.prom
  }

  get info() {
    return {
      local: this.#local,
      remote: this.#remote,
      oriSize: this.#oriSize,
      comSize: this.#comSize,
      upBytes: this.#upBytes,
      downBytes: this.#downBytes,
      stepId: this.#steps.id,
      stepError: this.#steps.error,
      stepStatus: this.#steps.status,
    }
  }
}

function getChunkMBComSize(inSize: number, inUseEncrypt: boolean) {
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

  return {
    chunkMB: chunkMB,
    comSize: fixedSliceNo * chunkMB * 1024 * 1024 + fixedRest,
  }
}
