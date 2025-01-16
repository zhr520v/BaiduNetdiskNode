import { axios, httpFileInfo, httpFileList } from 'baidu-netdisk-api'
import fs from 'node:fs'
import path from 'node:path'
import { EDownloadSteps, EStepStatus } from '../types/enums.js'
import {
  type IDownloadMainDoneBytesRes,
  type IDownloadMainDoneRes,
  type IDownloadMainRunReq,
  type IDownloadMainThreadData,
} from '../workers/download-main.js'
import { type IMD5FileDone, type IMD5FileThreadData } from '../workers/md5-file.js'
import {
  __DOWNLOAD_THREADS__,
  __PRESV_ENC_BLOCK_SIZE__,
  __TRY_DELTA__,
  __TRY_TIMES__,
} from './alpha.js'
import { Steps } from './steps.js'
import { PromBat, pathNormalized, tryTimes } from './utils.js'
import { type IErrorRes, WorkerParent, newWorker } from './worker.js'

export interface IDownloadFinish {
  local: string
}

export class DownloadTask {
  #access_token = ''

  #local = ''
  #remote = ''
  #withPath = ''
  #withFsid = 0
  #dlink: string = ''
  #threads = __DOWNLOAD_THREADS__
  #noSilent = false
  #tryTimes = __TRY_TIMES__
  #tryDelta = __TRY_DELTA__
  #noVerify = false
  #noVerifyOnDisk = false

  #oriSize = 0
  #comSize = 0
  #mtimeS = 0
  #chunkMB = 4
  #keyBuf = Buffer.alloc(0)
  #ivBuf = Buffer.alloc(0)
  #md5Middle = ''

  #totalSlice = 0
  #splitSlice = 64 / this.#chunkMB

  #downloadWorker: WorkerParent | undefined
  #downBytes = 0

  #checkMD5Worker: WorkerParent | undefined

  #steps: Steps
  #doneProm: PromBat<IDownloadFinish> | undefined
  #onDone: ((inData: IDownloadFinish) => void) | undefined
  #onError: (inError: Error) => void = () => {}
  #onStatusChanged: (inNewStatus: EStepStatus, inError: Error | null) => void = () => {}

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
    noVerify?: boolean
    noVerifyOnDisk?: boolean
    onDone?: (inData: IDownloadFinish) => void
    onError?: (inError: Error) => void
    onStatusChanged?: (inNewStatus: EStepStatus, inError: Error | null) => void
  }) {
    this.#access_token = inOpts.access_token
    this.#local = inOpts.local
    this.#withPath = inOpts.withPath ? pathNormalized(inOpts.withPath) : this.#withPath
    this.#withFsid = inOpts.withFsid || this.#withFsid
    this.#tryTimes = inOpts.tryTimes || this.#tryTimes
    this.#tryDelta = inOpts.tryDelta || this.#tryDelta
    this.#threads = inOpts.threads || this.#threads
    this.#noVerify = inOpts.noVerify || this.#noVerify
    this.#noVerifyOnDisk = inOpts.noVerifyOnDisk || this.#noVerifyOnDisk
    this.#onDone = inOpts.onDone || this.#onDone
    this.#onError = inOpts.onError || this.#onError
    this.#onStatusChanged = inOpts.onStatusChanged || this.#onStatusChanged

    this.#doneProm = this.#onDone ? this.#doneProm : new PromBat<IDownloadFinish>()

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
        {
          id: EDownloadSteps.GET_FSID_WITH_PATH,
          exec: () => this.#__STEP__GetFsidWithPath__(),
        },
        {
          id: EDownloadSteps.GET_DLINK_WITH_FSID,
          exec: () => this.#__STEP__GetDlinkWithFsid__(),
        },
        {
          id: EDownloadSteps.CHECK_DOWNLOAD_INFO,
          exec: () => this.#__STEP__CheckDownloadInfo__(),
        },
        {
          id: EDownloadSteps.GET_DECRYPT_INFO,
          exec: () => this.#__STEP__GetDecryptInfo__(),
        },
        {
          id: EDownloadSteps.PREPARE_FOR_DOWNLOAD,
          exec: () => this.#__STEP__PrepareForDownload__(),
        },
        {
          id: EDownloadSteps.DOWNLOAD_SLICES,
          exec: () => this.#__STEP__DownloadSlices__(),
          stop: (inForce?: boolean) => this.#__STOP__DownloadSlices__(inForce),
        },
        {
          id: EDownloadSteps.CHECK_MD5_DISK,
          exec: () => this.#__STEP__CheckMD5OnDisk__(),
          stop: () => this.#__STOP__CheckMD5OnDisk__(),
        },
        { id: EDownloadSteps.SET_LOCAL_MTIME, exec: () => this.#__STEP__SetLocalMTime__() },
        { id: EDownloadSteps.DOWNLOAD_FINISH, exec: () => this.#__STEP__DownloadFinish__() },
      ],
      onStatusChanged: inNewStatus => {
        if (inNewStatus === EStepStatus.STOPPED && this.#steps.error && this.#noSilent) {
          this.#doneProm?.rej(this.#steps.error)
          this.#onError(this.#steps.error)
        }

        this.#onStatusChanged(inNewStatus, this.#steps.error)
      },
    })
  }

  async #__STEP__GetFsidWithPath__() {
    // throw new Error('字典故意的错误')

    if (!this.#withPath) {
      return
    }

    const parentPath = path.dirname(this.#withPath)

    let may_has_more = false
    let cursor = 0
    let found = false
    const limit = 1000

    do {
      const { data } = await tryTimes(
        () =>
          httpFileList({
            access_token: this.#access_token,
            dir: parentPath,
            start: cursor,
          }),
        { times: this.#tryTimes, delta: this.#tryDelta }
      )

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

    const { data } = await tryTimes(
      () =>
        httpFileInfo({
          access_token: this.#access_token,
          fsids: JSON.stringify([this.#withFsid]),
          dlink: 1,
        }),
      { times: this.#tryTimes, delta: this.#tryDelta }
    )

    const file = data.list[0]

    if (!file) {
      throw new Error('No fileinfo got from server')
    }

    this.#remote = file.path
    this.#oriSize = file.size
    this.#comSize = file.size
    this.#mtimeS = file.local_mtime
    this.#dlink = file.dlink || this.#dlink
  }

  async #__STEP__CheckDownloadInfo__() {
    if (!this.#dlink) {
      throw new Error('No download link was provided')
    }

    if (this.#keyBuf.length && this.#comSize < __PRESV_ENC_BLOCK_SIZE__ + 16) {
      throw new Error('File size not fit decrypt length')
    }
  }

  async #__STEP__GetDecryptInfo__() {
    if (!this.#keyBuf.length) {
      return
    }

    const { data } = await tryTimes(
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

    const presvBuf = Buffer.from(data)

    this.#ivBuf = presvBuf.subarray(0, 16)
    this.#md5Middle = presvBuf.subarray(16, 16 + 16).toString()
    this.#oriSize = Number(presvBuf.readBigUInt64BE(16 + 16))
    this.#chunkMB = presvBuf.readUint32BE(16 + 16 + 8)
    const sum = presvBuf.readUInt32BE(16 + 16 + 8 + 4)

    if (sum !== presvBuf.subarray(0, 16 + 16 + 8 + 4).reduce((pre, cur) => pre + cur, 0)) {
      throw new Error('decrypt verify failed')
    }
  }

  async #__STEP__PrepareForDownload__() {
    createDirectory(path.dirname(this.#local))
    fs.writeFileSync(this.#local, Buffer.alloc(0))
    fs.truncateSync(this.#local, this.#oriSize)

    if (this.#chunkMB > 64) {
      throw new Error('chunkMB too large')
    }

    this.#splitSlice = 64 / this.#chunkMB

    const pureComSize = this.#comSize - (this.#keyBuf.length ? __PRESV_ENC_BLOCK_SIZE__ : 0)
    const rawSlices = Math.max(Math.ceil(pureComSize / (this.#chunkMB * 1024 * 1024)), 1)

    this.#totalSlice = Math.ceil(rawSlices / this.#splitSlice)
  }

  async #__STEP__DownloadSlices__() {
    if (!this.#downloadWorker) {
      const worker = newWorker<IDownloadMainThreadData>('download-main', {
        access_token: this.#access_token,
        local: this.#local,
        chunkMB: this.#chunkMB,
        shrinkComSize: this.#keyBuf.length
          ? this.#comSize - __PRESV_ENC_BLOCK_SIZE__
          : this.#comSize,
        keyBuf: this.#keyBuf,
        ivBuf: this.#ivBuf,
        totalSlice: this.#totalSlice,
        splitSlice: this.#splitSlice,
        noVerify: this.#noVerify,
        noVerifyOnDisk: this.#noVerifyOnDisk,
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
        if (!this.#noVerify && this.#noVerifyOnDisk && this.#keyBuf.length) {
          if (this.#md5Middle !== inData.md5.substring(8, 24)) {
            this.#__STOP__DownloadSlices__(true)

            return reject(new Error('MD5 not match'))
          }
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

    await this.#__STOP__DownloadSlices__(true)
  }

  async #__STEP__CheckMD5OnDisk__() {
    if (this.#noVerify || this.#noVerifyOnDisk || !this.#keyBuf.length) {
      return
    }

    const worker = newWorker<IMD5FileThreadData>('md5-file', {
      local: this.#local,
    })

    this.#checkMD5Worker = new WorkerParent(worker)

    await new Promise<void>((resolve, reject) => {
      this.#downloadWorker?.onRecvData<IErrorRes>('THREAD_ERROR', inError => {
        reject(new Error(inError.msg))
      })

      this.#checkMD5Worker?.onRecvData<IMD5FileDone>('MD5_FILE_DONE', inData => {
        if (this.#md5Middle !== inData.md5full.substring(8, 24)) {
          return reject(new Error('MD5 not match'))
        }

        resolve()
      })
    })
  }

  async #__STEP__SetLocalMTime__() {
    fs.utimesSync(this.#local, new Date(Date.now()), new Date(this.#mtimeS * 1000))
  }

  async #__STEP__DownloadFinish__() {
    this.#doneProm?.res({ local: this.#local })
    this.#onDone?.({ local: this.#local })
  }

  async #__STOP__DownloadSlices__(inForce?: boolean) {
    this.#downloadWorker?.sendData('DOWNLOAD_MAIN_STOP')

    if (inForce) {
      await this.#downloadWorker?.terminate()
      this.#downBytes = 0
      this.#downloadWorker = void 0
    }
  }

  async #__STOP__CheckMD5OnDisk__() {
    await this.#checkMD5Worker?.terminate()
    this.#checkMD5Worker = void 0
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

  run() {
    if (this.#steps.error) {
      this.#doneProm = this.#onDone ? this.#doneProm : new PromBat<IDownloadFinish>()
    }

    this.#steps.run()
  }

  async stop() {
    await this.#steps.stop()
  }

  async terminate() {
    await this.#steps.stop(true)

    if (this.#steps.id > EDownloadSteps.PREPARE_FOR_DOWNLOAD) {
      await fs.promises.rm(this.#local, { force: true }).catch()

      return
    }

    if (this.#steps.id > EDownloadSteps.CHECK_MD5_DISK) {
      await fs.promises.rm(this.#local, { force: true }).catch()

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
      comSize: this.#comSize - (this.#keyBuf.length ? __PRESV_ENC_BLOCK_SIZE__ : 0),
      downBytes: this.#downBytes,
      stepId: this.#steps.id,
      stepError: this.#steps.error,
      stepStatus: this.#steps.status,
    }
  }
}

function createDirectory(inPath: string) {
  if (fs.existsSync(inPath)) {
    return
  }

  const parentPath = path.dirname(inPath)

  if (!fs.existsSync(parentPath)) {
    createDirectory(parentPath)
  }

  fs.mkdirSync(inPath)
}
