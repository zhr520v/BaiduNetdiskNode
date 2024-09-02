import { axios, httpFileInfo, httpFileList } from '@baidu-netdisk/api'
import fs from 'fs'
import path from 'path'
import { IDownloadReq, ISliceReq, ISliceRes, ISpeedRes } from '../workers/download'
import {
  __DOWNLOAD_THREADS__,
  __PRESV_ENC_BLOCK_SIZE__,
  __TRY_DELTA__,
  __TRY_TIMES__,
} from './alpha'
import { EStatus, Steps } from './steps'
import { PromBat, pathNormalized } from './utils'
import { IErrorRes, WorkerParent, newWorker } from './worker'

interface IDownloadFinish {
  local: string
}

export class DownloadTask {
  #access_token = ''

  #local = ''
  #withPath = ''
  #withFsid = 0
  #dlink: string = ''
  #threads = __DOWNLOAD_THREADS__
  #noSilent = false
  #tryTimes = __TRY_TIMES__
  #tryDelta = __TRY_DELTA__

  #oriSize = 0
  #comSize = 0
  #mtimeS = 0
  #chunkSize = 4 * 1024 * 1024
  #keyBuf = Buffer.alloc(0)
  #ivBuf = Buffer.alloc(0)

  #totalSlice = 0
  #restSlices: number[][] = []
  #doneSlices: number[] = []

  #wPool: { worker: WorkerParent; currSlice?: number[] | undefined }[] = []
  #wPoolTryTimes = 1

  #speedTimer: NodeJS.Timeout | null = null
  #lastDate = Date.now()
  #lastBytes = 0
  #dwedBytes = 0
  #downloadSpeed = 0

  #steps: Steps
  #doneProm: PromBat<IDownloadFinish> | undefined
  #onDone: ((inData: IDownloadFinish) => void) | undefined
  #onError: (inError: Error) => void = () => {}
  #onStatusChanged: (
    inNewStatus: (typeof EStatus)[keyof typeof EStatus],
    inError: Error | null
  ) => void = () => {}

  constructor(inOpts: {
    access_token: string
    local: string
    withPath?: string
    withFsid?: number
    withDlink?: {
      dlink: string
      size: number
      mtimeS: number
    }
    encrypt?: string
    threads?: number
    noSilent?: boolean
    tryTimes?: number
    tryDelta?: number
    onDone?: (inData: IDownloadFinish) => void
    onError?: (inError: Error) => void
    onStatusChanged?: (
      inNewStatus: (typeof EStatus)[keyof typeof EStatus],
      inError: Error | null
    ) => void
  }) {
    this.#access_token = inOpts.access_token
    this.#local = inOpts.local
    this.#withPath = inOpts.withPath ? pathNormalized(inOpts.withPath) : this.#withPath
    this.#withFsid = inOpts.withFsid || this.#withFsid
    this.#tryTimes = inOpts.tryTimes || this.#tryTimes
    this.#tryDelta = inOpts.tryDelta || this.#tryDelta
    this.#threads = inOpts.threads || this.#threads
    this.#onDone = inOpts.onDone || this.#onDone
    this.#onError = inOpts.onError || this.#onError
    this.#onStatusChanged = inOpts.onStatusChanged || this.#onStatusChanged

    if (!this.#onDone) {
      this.#doneProm = new PromBat<IDownloadFinish>()
    }

    if (inOpts.withDlink) {
      this.#dlink = inOpts.withDlink.dlink
      this.#oriSize = inOpts.withDlink.size
      this.#comSize = inOpts.withDlink.size
      this.#mtimeS = inOpts.withDlink.mtimeS
    }

    this.#formatEncrypt(inOpts.encrypt)
    this.#noSilent = inOpts.noSilent || false

    this.#steps = new Steps({
      steps: [
        { name: 'GET_FSID_WITH_PATH', exec: () => this.#__STEP__GetFsidWithPath__() },
        { name: 'GET_DLINK_WITH_FSID', exec: () => this.#__STEP__GetDlinkWithFsid__() },
        { name: 'CHECK_DOWNLOAD_INFO', exec: () => this.#__STEP__CheckDownloadInfo__() },
        { name: 'GET_DECRYPT_INFO', exec: () => this.#__STEP__GetDecryptInfo__() },
        { name: 'PREPARE_FOR_DOWNLOAD', exec: () => this.#__STEP__PrepareForDownload__() },
        {
          name: 'DOWNLOAD_SLICES',
          exec: () => this.#__STEP__DownloadSlices__(),
          stop: () => this.#__STOP__DownloadSlices__(),
        },
        { name: 'SET_LOCAL_MTIME', exec: () => this.#__STEP__SetLocalMTime__() },
        { name: 'DOWNLOAD_FINISH', exec: () => this.#__STEP__DownloadFinish__() },
      ],
      onStatusChanged: inNewStatus => {
        if (inNewStatus === EStatus.STOPPED && this.#steps.error && this.#noSilent) {
          this.#doneProm?.rej(this.#steps.error)
          this.#onError(this.#steps.error)
        }

        this.#onStatusChanged(inNewStatus, this.#steps.error)
      },
    })
  }

  async #__STEP__GetFsidWithPath__() {
    if (!this.#withPath) {
      return
    }

    const parentPath = path.dirname(this.#withPath)

    let may_has_more = false
    let cursor = 0
    let found = false
    const limit = 1000

    do {
      const { data } = await httpFileList({
        access_token: this.#access_token,
        dir: parentPath,
        start: cursor,
      })

      const target = data.list.find(i => i.path === this.#withPath)

      if (target) {
        found = true

        if (target.isdir) {
          throw new Error('Download target is folder, not file')
        }

        this.#withFsid = target.fs_id
      }

      may_has_more = data.list.length === limit
      cursor = cursor + data.list.length

      if (!found && !may_has_more) {
        throw new Error(`File not found ${this.#withPath}`)
      }
    } while (!found && may_has_more)
  }

  async #__STEP__GetDlinkWithFsid__() {
    if (!this.#withFsid) {
      return
    }

    const { data } = await httpFileInfo({
      access_token: this.#access_token,
      fsids: JSON.stringify([this.#withFsid]),
      dlink: 1,
    })

    const file = data.list[0]

    if (!file) {
      throw new Error('No fileinfo got from server')
    }

    this.#oriSize = file.size
    this.#comSize = file.size
    this.#mtimeS = file.local_mtime
    this.#dlink = file.dlink || this.#dlink
  }

  async #__STEP__CheckDownloadInfo__() {
    if (!this.#dlink) {
      throw new Error('No download link was provided')
    }

    if (this.#keyBuf.length && this.#comSize < 48) {
      throw new Error('File size not fit decrypt length')
    }
  }

  async #__STEP__GetDecryptInfo__() {
    if (!this.#keyBuf.length) {
      return
    }

    const { data } = await axios.get<ArrayBuffer>(this.#dlink, {
      params: {
        access_token: this.#access_token,
      },
      headers: {
        'User-Agent': 'pan.baidu.com',
        Range: `bytes=${this.#comSize - __PRESV_ENC_BLOCK_SIZE__}-${this.#comSize - 1}`,
      },
      responseType: 'arraybuffer',
      responseEncoding: 'binary',
    })

    const presvBuf = Buffer.from(data)

    this.#ivBuf = presvBuf.subarray(0, 16)
    this.#chunkSize = Number(presvBuf.readBigUInt64BE(16))
    this.#oriSize = Number(presvBuf.readBigUInt64BE(24))
  }

  async #__STEP__PrepareForDownload__() {
    fs.writeFileSync(this.#local, Buffer.alloc(0))
    fs.truncateSync(this.#local, this.#oriSize)

    if (64 * 1024 * 1024 < this.#chunkSize || (64 * 1024 * 1024) % this.#chunkSize > 0) {
      throw new Error('chunkSize not match')
    }

    if (this.#keyBuf.length) {
      this.#totalSlice = Math.ceil((this.#comSize - __PRESV_ENC_BLOCK_SIZE__) / this.#chunkSize)
    } else {
      this.#totalSlice = Math.ceil(this.#comSize / this.#chunkSize)
    }

    this.#totalSlice = Math.max(this.#totalSlice, 1)
    const packages = (64 * 1024 * 1024) / this.#chunkSize
    const restSlices = Array(this.#totalSlice)
      .fill(0)
      .map((item, index) => index)

    while (restSlices.length > 0) {
      const item: number[] = []

      for (let i = 0; i < packages; i++) {
        const no = restSlices.shift()

        if (no !== void 0) {
          item.push(no)
        }
      }

      this.#restSlices.push(item)
    }
  }

  async #__STEP__DownloadSlices__() {
    this.#timerSpeed()

    await new Promise<void>((resolve, reject) => {
      const threads = Math.min(this.#restSlices.length, this.#threads)

      const onSpeed = (inBytes: number) => {
        this.#lastBytes = this.#lastBytes + inBytes
      }

      const onDownloaded = (inThreadId: number, inSlice: number[], inBytes: number) => {
        this.#doneSlices.push(...inSlice)
        this.#dwedBytes = this.#dwedBytes + inBytes

        for (const item of this.#wPool) {
          if (item.worker.threadId === inThreadId) {
            item.currSlice = void 0
          }
        }

        if (this.#doneSlices.length === this.#totalSlice) {
          return resolve()
        }

        this.#dispatchSlices()
      }

      const onError = (inThreadId: number, inError: IErrorRes) => {
        const tWorker = this.#wPool.find(item => item.worker.threadId === inThreadId)
        this.#wPool = this.#wPool.filter(item => item.worker.threadId !== inThreadId)
        tWorker?.worker.terminate()

        if (tWorker?.currSlice !== void 0) {
          this.#restSlices.unshift(tWorker.currSlice)
        }

        if (this.#wPool.length === 0) {
          if (this.#wPoolTryTimes < this.#tryTimes) {
            this.#newDownloadWorker({
              onSpeed: onSpeed,
              onDownloaded: onDownloaded,
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
        this.#newDownloadWorker({
          onSpeed: onSpeed,
          onDownloaded: onDownloaded,
          onError: onError,
        })
      }

      this.#dispatchSlices()
    })

    await this.#__STOP__DownloadSlices__()
  }

  async #__STEP__SetLocalMTime__() {
    fs.utimesSync(this.#local, new Date(Date.now()), new Date(this.#mtimeS * 1000))
  }

  async #__STEP__DownloadFinish__() {
    this.#doneProm?.res({ local: this.#local })
    this.#onDone?.({ local: this.#local })
  }

  async #__STOP__DownloadSlices__() {
    for (const item of this.#wPool) {
      await item.worker.terminate()

      if (item.currSlice !== void 0) {
        this.#restSlices.unshift(item.currSlice)
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
  }

  #newDownloadWorker(inOpts: {
    onSpeed: (inBytes: number) => void
    onDownloaded: (inThreadId: number, inSlice: number[], inBytes: number) => void
    onError: (inThreadId: number, inError: IErrorRes) => void
  }) {
    const worker = newWorker<IDownloadReq>('download', {
      access_token: this.#access_token,
      shrinkComSize: this.#comSize - (this.#keyBuf.length ? __PRESV_ENC_BLOCK_SIZE__ : 0),
      local: this.#local,
      dlink: this.#dlink,
      chunkSize: this.#chunkSize,
      keyBuf: this.#keyBuf,
      ivBuf: this.#ivBuf,
      tryTimes: this.#tryTimes,
      tryDelta: this.#tryDelta,
    })

    const fixedWorker = new WorkerParent(worker)

    fixedWorker.onRecvData<ISpeedRes>('speed', inData => {
      inOpts.onSpeed(inData.bytes)
    })

    fixedWorker.onRecvData<ISliceRes>('downloaded', inData => {
      inOpts.onDownloaded(worker.threadId, inData.slice, inData.bytes)
    })

    fixedWorker.onRecvData<IErrorRes>('error', inError => {
      inOpts.onError(worker.threadId, inError)
    })

    this.#wPool.push({
      worker: fixedWorker,
    })
  }

  #dispatchSlices() {
    const tWorker = this.#wPool.find(item => item.currSlice === void 0)

    if (tWorker) {
      const nextSlice = this.#restSlices.shift()

      if (nextSlice !== void 0) {
        tWorker.worker.sendData<ISliceReq>('slice', {
          slice: nextSlice,
        })

        tWorker.currSlice = nextSlice
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

    this.#downloadSpeed = Math.floor((bytes / duration) * 1000)

    this.#speedTimer = setTimeout(() => this.#timerSpeed(), 3000)
  }

  run() {
    if (this.#steps.error && !this.#onDone) {
      this.#doneProm = new PromBat<IDownloadFinish>()
    }

    this.#steps.run()
  }

  async stop() {
    await this.#steps.stop()
  }

  get done() {
    return this.#doneProm?.prom
  }

  get info() {
    return {
      local: this.#local,
      speed: this.#downloadSpeed,
    }
  }
}
