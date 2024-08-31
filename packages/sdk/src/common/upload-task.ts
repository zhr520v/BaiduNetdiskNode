import { httpUploadFinish, httpUploadId } from '@baidu-netdisk/api'
import crypto from 'crypto'
import fs from 'fs'
import util from 'util'
import { IMd5Req, IMd5Res } from '../workers/md5'
import { ISliceReq, ISliceRes, ISpeedRes, IUploadReq } from '../workers/upload'
import {
  PromType,
  __PRESV_ENC_BLOCK_SIZE__,
  __TRY_DELTA__,
  __TRY_TIMES__,
  __UPLOAD_THREADS__,
} from './alpha'
import { EStatus, Steps } from './steps'
import { getUploadUrl } from './upload-url'
import { PromBat, pathNormalized, pick } from './utils'
import { IErrorRes, WorkerParent, newWorker } from './worker'

const FS_STAT_ASYNC = util.promisify(fs.stat)

export const ERtype = {
  FAIL: 0,
  RENAME: 1,
  DIFF_RENAME: 2,
  OVERWRITE: 3,
}

interface IUploadFinish
  extends Pick<
    PromType<ReturnType<typeof httpUploadFinish>>['data'],
    'category' | 'ctime' | 'fs_id' | 'isdir' | 'md5' | 'mtime' | 'name' | 'path' | 'size'
  > {}

export class UploadTask {
  #app_name = ''
  #access_token = ''
  #local = ''
  #remote = ''
  #rtype: (typeof ERtype)[keyof typeof ERtype] = ERtype.FAIL
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
  #chunkMb = 4
  #md5s: string[] = []
  #md5full = ''
  #keyBuf = Buffer.alloc(0)
  #ivBuf = Buffer.alloc(0)
  #endSliceNo = 0

  #uploadId = ''
  #uploadUrl = ''
  #doneSlices: number[] = []
  #restSlices: number[] = []
  #wPool: { worker: WorkerParent; currSliceNo?: number | undefined }[] = []
  #wPoolTryTimes = 1

  #speedTimer: NodeJS.Timeout | null = null
  #lastDate = Date.now()
  #lastBytes = 0
  #upedBytes = 0
  #uploadSpeed = 0

  #steps: Steps
  #donePromBat: PromBat<IUploadFinish> = new PromBat()
  onDone: (inData: IUploadFinish) => void = () => {}
  onError: (inError: Error) => void = () => {}
  onStatusChanged: (
    inNewStatus: (typeof EStatus)[keyof typeof EStatus],
    inError: Error | null
  ) => void = () => {}

  constructor(inOpts: {
    app_name: string
    access_token: string
    local: string
    remote: string
    rtype?: (typeof ERtype)[keyof typeof ERtype]
    encrypt?: string
    threads?: number
    noSilent?: boolean
    tryTimes?: number
    tryDelta?: number
    apiOpts?: Pick<
      Parameters<typeof httpUploadFinish>[1],
      'exif_info' | 'is_revision' | 'mode' | 'zip_quality' | 'zip_sign'
    >
    onDone?: (inData: IUploadFinish) => void
    onError?: (inError: Error) => void
    onStatusChanged?: (
      inNewStatus: (typeof EStatus)[keyof typeof EStatus],
      inError: Error | null
    ) => void
  }) {
    this.#app_name = inOpts.app_name
    this.#access_token = inOpts.access_token
    this.#local = inOpts.local
    this.#remote = pathNormalized(inOpts.remote)
    this.#rtype = inOpts.rtype || ERtype.FAIL
    this.#threads = inOpts.threads || this.#threads
    this.#noSilent = inOpts.noSilent || this.#noSilent
    this.#tryTimes = inOpts.tryTimes || this.#tryTimes
    this.#tryDelta = inOpts.tryDelta || this.#tryDelta
    this.#apiOpts = inOpts.apiOpts || this.#apiOpts
    this.onDone = inOpts.onDone || this.onDone
    this.onError = inOpts.onError || this.onError
    this.onStatusChanged = inOpts.onStatusChanged || this.onStatusChanged

    this.#formatEncrypt(inOpts.encrypt)

    this.#steps = new Steps({
      steps: [
        { name: 'GET_FILE_INFO', exec: () => this.#__STEP__GetFileInfo__() },
        {
          name: 'GET_LOCAL_MD5',
          exec: () => this.#__STEP__GetLocalMd5__(),
          stop: () => this.#__STOP__GetLocalMd5__(),
        },
        { name: 'GET_UPLOAD_ID', exec: () => this.#__STEP__GetUploadId__() },
        {
          name: 'UPLOAD_SLICES',
          exec: () => this.#__STEP__UploadSlices__(),
          stop: () => this.#__STOP__UploadSlices__(),
        },
        { name: 'UPLOAD_FINISH', exec: () => this.#__STEP__UploadFinish__() },
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
        if (inNewStatus === EStatus.STOPPED && this.#steps.error && this.#noSilent) {
          this.#donePromBat.rej(this.#steps.error)
          this.onError(this.#steps.error)
        }

        this.onStatusChanged(inNewStatus, this.#steps.error)
      },
    })
  }

  async #__STEP__GetFileInfo__() {
    const stats = await FS_STAT_ASYNC(this.#local)

    this.#ctimeMs = Math.floor(stats.ctimeMs)
    this.#mtimeMs = Math.floor(stats.mtimeMs)
    this.#oriSize = stats.size

    const needfulParams = getChunkMbComSize(stats.size, !!this.#keyBuf.length)
    this.#comSize = needfulParams.comSize
    this.#chunkMb = needfulParams.chunkMb
    this.#endSliceNo = Math.max(
      Math.ceil(
        this.#keyBuf.length
          ? this.#oriSize / (this.#chunkMb * 1024 * 1024 - 1)
          : this.#oriSize / (this.#chunkMb * 1024 * 1024)
      ) - 1,
      0
    )

    for (let i = 0; i <= this.#endSliceNo; i++) {
      this.#restSlices.push(i)
    }
  }

  async #__STEP__GetLocalMd5__() {
    await new Promise<void>((resolve, reject) => {
      const worker = newWorker<IMd5Req>('md5', {
        local: this.#local,
        oriSize: this.#oriSize,
        chunkMb: this.#chunkMb,
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
        this.#__STOP__GetLocalMd5__().catch()
        reject(inError)
      })

      this.#md5Worker = fixedWorker
    })

    await this.#__STOP__GetLocalMd5__()
  }

  async #__STEP__GetUploadId__() {
    const info = await httpUploadId(
      { access_token: this.#access_token },
      {
        path: this.#remote,
        block_list: JSON.stringify(this.#md5s),
        size: this.#comSize,
        rtype: this.#rtype,
      }
    )

    this.#uploadId = info.data.uploadid
  }

  async #__STEP__UploadSlices__() {
    this.#uploadUrl = await getUploadUrl()

    this.#timerSpeed()

    await new Promise<void>((resolve, reject) => {
      const threads = Math.min(this.#restSlices.length, this.#threads)

      const onSpeed = (inBytes: number) => {
        this.#lastBytes = this.#lastBytes + inBytes
      }

      const onUploaded = (inThreadId: number, inSliceNo: number, inBytes: number) => {
        this.#doneSlices.push(inSliceNo)
        this.#upedBytes = this.#upedBytes + inBytes

        for (const item of this.#wPool) {
          if (item.worker.threadId === inThreadId) {
            item.currSliceNo = void 0
          }
        }

        if (this.#doneSlices.length === this.#md5s.length) {
          return resolve()
        }

        this.#dispatchSlices()
      }

      const onError = (inThreadId: number, inError: IErrorRes) => {
        const tWorker = this.#wPool.find(item => item.worker.threadId === inThreadId)

        this.#wPool = this.#wPool.filter(item => item.worker.threadId !== inThreadId)
        tWorker?.worker.terminate()

        if (tWorker?.currSliceNo !== void 0) {
          this.#restSlices.unshift(tWorker.currSliceNo)
        }

        if (this.#wPool.length === 0) {
          if (this.#wPoolTryTimes < this.#tryTimes) {
            this.#newUploadWorker({
              onSpeed: onSpeed,
              onUploaded: onUploaded,
              onError: onError,
            })

            this.#wPoolTryTimes = this.#wPoolTryTimes + 1
          } else {
            return reject(new Error(inError.msg))
          }
        }

        this.#dispatchSlices()
      }

      for (let i = 0; i < threads; i++) {
        this.#newUploadWorker({
          onSpeed: onSpeed,
          onUploaded: onUploaded,
          onError: onError,
        })
      }

      this.#dispatchSlices()
    })

    await this.#__STOP__UploadSlices__()
  }

  async #__STEP__UploadFinish__() {
    const { data } = await httpUploadFinish(
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
    )

    const returnData = pick(data, [
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

    this.#donePromBat.res(returnData)
    this.onDone(returnData)
  }

  async #__STOP__GetLocalMd5__() {
    await this.#md5Worker?.terminate()
  }

  async #__STOP__UploadSlices__() {
    for (const item of this.#wPool) {
      await item.worker.terminate()

      if (item.currSliceNo !== void 0) {
        this.#restSlices.unshift(item.currSliceNo)
      }
    }

    this.#wPool = []
    this.#wPoolTryTimes = 1
    this.#lastBytes = 0

    if (this.#speedTimer) {
      clearTimeout(this.#speedTimer)
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

  #newUploadWorker(inOpts: {
    onSpeed: (inThreadId: number, inBytes: number) => void
    onUploaded: (inThreadId: number, inSliceNo: number, inBytes: number) => void
    onError: (inThreadId: number, inError: IErrorRes) => void
  }) {
    const worker = newWorker<IUploadReq>('upload', {
      access_token: this.#access_token,
      local: this.#local,
      remote: this.#remote,
      oriSize: this.#oriSize,
      chunkMb: this.#chunkMb,
      keyBuf: this.#keyBuf,
      ivBuf: this.#ivBuf,
      tryTimes: this.#tryTimes,
      tryDelta: this.#tryDelta,
      uploadUrl: this.#uploadUrl,
      uploadId: this.#uploadId,
    })

    const fixedWorker = new WorkerParent(worker)

    fixedWorker.onRecvData<ISpeedRes>('speed', inData => {
      inOpts.onSpeed(worker.threadId, inData.bytes)
    })

    fixedWorker.onRecvData<ISliceRes>('uploaded', inData => {
      inOpts.onUploaded(worker.threadId, inData.sliceNo, inData.bytes)
    })

    fixedWorker.onRecvData<IErrorRes>('error', inError => {
      inOpts.onError(worker.threadId, inError)
    })

    this.#wPool.push({
      worker: fixedWorker,
    })
  }

  #dispatchSlices() {
    const tWorker = this.#wPool.find(item => item.currSliceNo === void 0)

    if (tWorker) {
      const nextSliceNo = this.#restSlices.shift()

      if (nextSliceNo !== void 0) {
        tWorker.worker.sendData<ISliceReq>('slice', {
          sliceNo: nextSliceNo,
          end: nextSliceNo === this.#endSliceNo,
        })

        tWorker.currSliceNo = nextSliceNo
        this.#dispatchSlices()
      }
    }
  }

  #timerSpeed() {
    const now = Date.now()

    const bytes = this.#lastBytes
    const duration = now - this.#lastDate
    this.#lastBytes = 0
    this.#lastDate = now

    this.#uploadSpeed = Math.floor((bytes / duration) * 1000)
    this.#speedTimer = setTimeout(() => this.#timerSpeed(), 3000)
  }

  run() {
    if (this.#steps.error) {
      this.#donePromBat = new PromBat<IUploadFinish>()
    }

    this.#steps.run()
  }

  async stop() {
    await this.#steps.stop()
  }

  get done() {
    return this.#donePromBat.prom
  }

  get info() {
    return {
      local: this.#local,
      remote: this.#remote,
      speed: this.#uploadSpeed,
    }
  }
}

function getChunkMbComSize(inSize: number, inUseEncrypt: boolean) {
  let chunkMb = 0

  if (inUseEncrypt) {
    if (inSize <= 8589932512) {
      // 2047 * (04 * 1024 * 1024 - 1) + (04 * 1024 * 1024 - 32 - 1) <≈ 8GB
      chunkMb = 4
    } else if (inSize <= 17179867104) {
      // 2047 * (08 * 1024 * 1024 - 1) + (08 * 1024 * 1024 - 32 - 1) <≈ 16GB
      chunkMb = 8
    } else if (inSize <= 34359736288) {
      // 2047 * (16 * 1024 * 1024 - 1) + (16 * 1024 * 1024 - 32 - 1) <≈ 32GB
      chunkMb = 16
    } else if (inSize <= 68719474656) {
      // 2047 * (32 * 1024 * 1024 - 1) + (32 * 1024 * 1024 - 32 - 1) <≈ 64GB
      chunkMb = 32
    } else if (inSize <= 137438951392) {
      // 2047 * (64 * 1024 * 1024 - 1) + (64 * 1024 * 1024 - 32 - 1) <≈ 128GB
      chunkMb = 64
    } else {
      throw new Error(`file too large oversize ${inSize}. maximum size is 137438951392`)
    }
  } else {
    if (inSize <= 8589934592) {
      // 04 * 1024 * 1024 * 2048 = 8GB
      chunkMb = 4
    } else if (inSize <= 17179869184) {
      // 08 * 1024 * 1024 * 2048 = 16GB
      chunkMb = 8
    } else if (inSize <= 34359738368) {
      // 16 * 1024 * 1024 * 2048 = 32GB
      chunkMb = 16
    } else if (inSize <= 68719476736) {
      // 32 * 1024 * 1024 * 2048 = 64GB
      chunkMb = 32
    } else if (inSize <= 137438953472) {
      // 64 * 1024 * 1024 * 2048 = 128GB
      chunkMb = 64
    } else {
      throw new Error(`file too large oversize ${inSize}. maximum size is 137438953472`)
    }
  }

  const chunkSize = inUseEncrypt ? chunkMb * 1024 * 1024 - 1 : chunkMb * 1024 * 1024
  const fixedSliceNo = Math.floor(inSize / chunkSize)
  const rest = inSize % chunkSize
  const fixedRest = inUseEncrypt
    ? (rest % 16 === 0 ? rest + 16 : rest + 16 - (rest % 16)) + __PRESV_ENC_BLOCK_SIZE__
    : rest

  return {
    chunkMb: chunkMb,
    comSize: fixedSliceNo * chunkMb * 1024 * 1024 + fixedRest,
  }
}
