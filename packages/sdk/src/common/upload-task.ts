import {
  axios,
  httpDelete,
  httpFileInfo,
  httpUploadFinish,
  httpUploadId,
} from 'baidu-netdisk-api'
import crypto from 'node:crypto'
import fs from 'node:fs'
import util from 'node:util'
import { EFileManageAsync, EStepStatus, EUploadRtype, EUploadSteps } from '../types/enums.js'
import {
  type IDownloadMainDoneBytesRes,
  type IDownloadMainDoneRes,
  type IDownloadMainRunReq,
  type IDownloadMainThreadData,
} from '../workers/download-main.js'
import { type IMd5Req, type IMd5Res } from '../workers/md5.js'
import {
  type IUploadMainDoneBytesRes,
  type IUploadMainRunReq,
  type IUploadMainThreadData,
} from '../workers/upload-main.js'
import {
  __DOWNLOAD_THREADS__,
  __PRESV_ENC_BLOCK_SIZE__,
  __TRY_DELTA__,
  __TRY_TIMES__,
  __UPLOAD_THREADS__,
} from './const.js'
import { Steps } from './steps.js'
import { getUploadUrl } from './upload-url.js'
import { PromBat, type PromType, pathNormalized, pick, tryTimes } from './utils.js'
import { type IErrorRes, WorkerParent, newWorker } from './worker.js'

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
  #rtype: EUploadRtype = EUploadRtype.FAIL
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
  #ivBuf = Buffer.alloc(0)
  #endSliceNo = 0

  #uploadId = ''

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
    rtype?: EUploadRtype
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
    this.#rtype = inOpts.rtype || EUploadRtype.FAIL
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
        { id: EUploadSteps.FILE_INFO, exec: () => this.#stopFileInfo() },
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
          id: EUploadSteps.DOWNLOAD_INFO,
          exec: () => this.#stepPreDownload(),
        },
        {
          id: EUploadSteps.VERIFY_DOWNLOAD,
          exec: () => this.#stepVerifyDownload(),
          stop: (inForce?: boolean) => this.#stopVerifyDownload(inForce),
        },
        { id: EUploadSteps.FINISH, exec: () => this.#stepFinish() },
      ],
      onBeforeRun: async () => {
        if (this.#mtimeMs > 0) {
          const stats = await FS_STAT_ASYNC(this.#local)

          if (this.#mtimeMs !== Math.floor(stats.mtimeMs)) {
            throw new Error(`FILE_CHANGED: ${this.#local}`)
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

  async #stopFileInfo() {
    if (!this.#remote.startsWith(`/apps/${this.#app_name}/`)) {
      // TODO: 允许上传至其他目录
    }

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
      const worker = newWorker<IMd5Req>('md5', {
        local: this.#local,
        oriSize: this.#oriSize,
        chunkMB: this.#chunkMB,
        keyBuf: this.#keyBuf,
        ivBuf: this.#ivBuf,
        endSliceNo: this.#endSliceNo,
      })

      const fixedWorker = new WorkerParent(worker)

      fixedWorker.onRecvData<IMd5Res>('md5', inData => {
        this.#md5full = inData.md5full
        this.#md5s = inData.md5s
        resolve()
      })

      fixedWorker.onRecvData<Error>('error', inError => {
        this.#stopLocalMd5()
        reject(inError)
      })

      this.#md5Worker = fixedWorker
    })

    await this.#stopLocalMd5()
  }

  async #stepUploadId() {
    const info = await tryTimes(
      () =>
        httpUploadId(
          { access_token: this.#access_token },
          {
            path: this.#remote,
            block_list: JSON.stringify(this.#md5s),
            size: this.#comSize,
            rtype: this.#rtype,
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
        remote: this.#remote,
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

      this.#uploadWorker?.onRecvData<IErrorRes>('THREAD_ERROR', inError => {
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
            path: this.#remote,
            size: `${this.#comSize}`,
            uploadid: this.#uploadId,
            rtype: this.#rtype,
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

  async #stepPreDownload() {
    if (this.#noVerify) {
      return
    }

    if (!this.#finishData?.fs_id) {
      throw new Error('No fs_id')
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
      throw new Error('No fileinfo got from server')
    }

    if (this.#keyBuf.length && file.size < __PRESV_ENC_BLOCK_SIZE__ + 16) {
      throw new Error('File size not fit decrypt length')
    }

    if (file.size !== this.#comSize) {
      throw new Error('size not match')
    }

    if (!file.dlink) {
      throw new Error('No dlink got from server')
    }

    this.#dlink = file.dlink

    if (!this.#keyBuf.length) {
      return
    }

    const { data: presvData } = await tryTimes(
      () =>
        axios.get<ArrayBuffer>(this.#dlink, {
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
      throw new Error('iv not match')
    }

    if (this.#md5full.substring(8, 24) !== md5Middle) {
      throw new Error('md5 not match')
    }

    if (this.#oriSize !== oriSize) {
      throw new Error('oriSize not match')
    }

    if (this.#chunkMB !== chunkMB) {
      throw new Error('chunkMB not match')
    }

    if (sum !== presvBuf.subarray(0, 16 + 16 + 8 + 4).reduce((pre, cur) => pre + cur, 0)) {
      throw new Error('verifySum not match')
    }
  }

  async #stepVerifyDownload() {
    if (this.#noVerify) {
      return
    }

    if (!this.#downloadWorker) {
      const splitSlice = 64 / this.#chunkMB

      const pureComSize = this.#comSize - (this.#keyBuf.length ? __PRESV_ENC_BLOCK_SIZE__ : 0)
      const rawSlices = Math.max(Math.ceil(pureComSize / (this.#chunkMB * 1024 * 1024)), 1)

      const totalSlice = Math.ceil(rawSlices / splitSlice)

      const worker = newWorker<IDownloadMainThreadData>('download-main', {
        access_token: this.#access_token,
        local: '',
        chunkMB: this.#chunkMB,
        shrinkComSize: this.#keyBuf.length
          ? this.#comSize - __PRESV_ENC_BLOCK_SIZE__
          : this.#comSize,
        keyBuf: this.#keyBuf,
        ivBuf: this.#ivBuf,
        totalSlice: totalSlice,
        splitSlice: splitSlice,
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

      this.#downloadWorker?.onRecvData<IErrorRes>('THREAD_ERROR', inError => {
        reject(new Error(inError.msg))
      })

      this.#downloadWorker?.onRecvData<IDownloadMainDoneRes>('DOWNLOAD_MAIN_DONE', inData => {
        if (this.#md5full !== inData.md5) {
          this.#stopVerifyDownload(true)

          return reject(new Error('MD5 not match'))
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
      throw new Error(`encrypt key ${inKey} too long, should be within 32 characters`)
    }

    if (/\s/.test(inKey)) {
      throw new Error(`encrypt key ${inKey} should not contain whitespace`)
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

    if (this.#steps.id > EUploadSteps.VERIFY_DOWNLOAD) {
      await httpDelete(
        {
          access_token: this.#access_token,
        },
        {
          filelist: JSON.stringify([this.#remote]),
          async: EFileManageAsync.SYNC,
        }
      ).catch()

      return
    }

    if (this.#steps.id > EUploadSteps.COMBINE) {
      await httpDelete(
        {
          access_token: this.#access_token,
        },
        {
          filelist: JSON.stringify([this.#remote]),
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
    if (
      inSize <=
      2047 * (4 * 1024 * 1024 - 1) + (4 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1)
    ) {
      // 2047 * (04 * 1024 * 1024 - 1) + (04 * 1024 * 1024 - 44 - 1) <≈ 8GB
      chunkMB = 4
    } else if (
      inSize <=
      2047 * (8 * 1024 * 1024 - 1) + (8 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1)
    ) {
      // 2047 * (08 * 1024 * 1024 - 1) + (08 * 1024 * 1024 - 44 - 1) <≈ 16GB
      chunkMB = 8
    } else if (
      inSize <=
      2047 * (16 * 1024 * 1024 - 1) + (16 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1)
    ) {
      // 2047 * (16 * 1024 * 1024 - 1) + (16 * 1024 * 1024 - 44 - 1) <≈ 32GB
      chunkMB = 16
    } else if (
      inSize <=
      2047 * (32 * 1024 * 1024 - 1) + (32 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1)
    ) {
      // 2047 * (32 * 1024 * 1024 - 1) + (32 * 1024 * 1024 - 44 - 1) <≈ 64GB
      chunkMB = 32
    } else if (
      inSize <=
      2047 * (64 * 1024 * 1024 - 1) + (64 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1)
    ) {
      // 2047 * (64 * 1024 * 1024 - 1) + (64 * 1024 * 1024 - 44 - 1) <≈ 128GB
      chunkMB = 64
    } else {
      throw new Error(
        `file too large oversize ${inSize}. maximum size is ${2047 * (64 * 1024 * 1024 - 1) + (64 * 1024 * 1024 - __PRESV_ENC_BLOCK_SIZE__ - 1)}`
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
      throw new Error(`file too large oversize ${inSize}. maximum size is 137438953472`)
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
