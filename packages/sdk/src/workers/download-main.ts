import crypto from 'node:crypto'
import { parentPort, workerData } from 'node:worker_threads'
import { __TRY_DELTA__, __TRY_TIMES__, __UPLOAD_THREADS__ } from '../common/const.js'
import { type IThreadError, newWorker, WorkerChild, WorkerParent } from '../common/worker.js'
import {
  type IDownloadExecSliceReq,
  type IDownloadExecSliceRes,
  type IDownloadExecThreadData,
} from './download-exec.js'

export interface IDownloadMainThreadData {
  access_token: string
  local: string
  chunkMB: number
  chunkBytes: number
  plainChunkBytes: number
  shrinkComSize: number
  keyBuf: Buffer
  ivBuf: Buffer
  totalSlice: number
  returnBuffer: boolean
  noWrite?: boolean
  noVerify?: boolean
  noVerifyOnDisk?: boolean
}

export interface IDownloadMainRunReq {
  threads: number
  dlink: string
  tryTimes: number
  tryDelta: number
}

export interface IDownloadMainDoneBytesRes {
  bytes: number
}

export interface IDownloadMainDoneRes {
  md5: string
}

const tWorkerData = workerData as IDownloadMainThreadData
const worker = new WorkerChild(parentPort)
const infoObject: {
  wPool: { worker: WorkerParent; currSliceNo?: number | undefined }[]
  wPoolTryTimes: number
  threads: number
  dlink: string
  tryTimes: number
  tryDelta: number
  restSlices: number[]
  nextSliceNo: number
  pendingSlices: Map<number, { buffer?: Buffer; bytes: number }>
  doneCount: number
  md5Hash: crypto.Hash | null
  finalized: boolean
} = {
  wPool: [],
  wPoolTryTimes: 1,
  threads: __UPLOAD_THREADS__,
  dlink: '',
  tryTimes: __TRY_TIMES__,
  tryDelta: __TRY_DELTA__,
  restSlices: [],
  nextSliceNo: 0,
  pendingSlices: new Map(),
  doneCount: 0,
  md5Hash: tWorkerData.returnBuffer ? crypto.createHash('md5') : null,
  finalized: false,
}

function newDownloadWorker() {
  const newExecWorker = newWorker<IDownloadExecThreadData>('download-exec', {
    access_token: tWorkerData.access_token,
    shrinkComSize: tWorkerData.shrinkComSize,
    local: tWorkerData.local,
    dlink: infoObject.dlink,
    chunkMB: tWorkerData.chunkMB,
    chunkBytes: tWorkerData.chunkBytes,
    plainChunkBytes: tWorkerData.plainChunkBytes,
    keyBuf: tWorkerData.keyBuf,
    ivBuf: tWorkerData.ivBuf,
    tryTimes: infoObject.tryTimes,
    tryDelta: infoObject.tryDelta,
    returnBuffer: tWorkerData.returnBuffer,
    noWrite: tWorkerData.noWrite,
  })

  const fixedWorker = new WorkerParent(newExecWorker)

  fixedWorker.onRecvData<IDownloadExecSliceRes>('DOWNLOAD_EXEC_SLICE_DONE', inData => {
    onDownloadExecSlice(newExecWorker.threadId, inData)
  })

  fixedWorker.onRecvData<IThreadError>('THREAD_ERROR', inError => {
    onDownloadExecError(newExecWorker.threadId, inError)
  })

  infoObject.wPool.push({
    worker: fixedWorker,
  })
}

function terminate() {
  for (const item of infoObject.wPool) {
    item.worker.terminate()

    if (item.currSliceNo !== void 0) {
      infoObject.restSlices.unshift(item.currSliceNo)
    }
  }

  infoObject.wPool = []
  infoObject.wPoolTryTimes = 1

  for (const sliceNo of infoObject.pendingSlices.keys()) {
    infoObject.restSlices.unshift(sliceNo)
  }

  infoObject.pendingSlices.clear()
  infoObject.restSlices = Array.from(new Set(infoObject.restSlices)).sort((a, b) => a - b)
}

function normalizeBuffer(inData?: Buffer | Uint8Array) {
  if (!inData) {
    return undefined
  }

  return Buffer.isBuffer(inData) ? inData : Buffer.from(inData)
}

function processSliceQueue() {
  while (true) {
    const cache = infoObject.pendingSlices.get(infoObject.nextSliceNo)

    if (!cache) {
      break
    }

    infoObject.pendingSlices.delete(infoObject.nextSliceNo)

    if (tWorkerData.returnBuffer && cache.buffer) {
      infoObject.md5Hash?.update(cache.buffer)
    }

    infoObject.doneCount = infoObject.doneCount + 1
    worker.sendData<IDownloadMainDoneBytesRes>('DOWNLOAD_MAIN_DONE_BYTES', {
      bytes: cache.bytes,
    })

    infoObject.nextSliceNo = infoObject.nextSliceNo + 1
  }

  if (infoObject.doneCount === tWorkerData.totalSlice) {
    finalize()
  }
}

function finalize() {
  if (infoObject.finalized) {
    return
  }

  infoObject.finalized = true

  if (!tWorkerData.noVerify && tWorkerData.returnBuffer) {
    const md5 = infoObject.md5Hash?.digest('hex').toUpperCase() || ''

    worker.sendData<IDownloadMainDoneRes>('DOWNLOAD_MAIN_DONE', {
      md5,
    })

    return
  }

  worker.sendData<IDownloadMainDoneRes>('DOWNLOAD_MAIN_DONE', {
    md5: '',
  })
}

function dispatchSlices() {
  const idleWorker = infoObject.wPool.find(item => item.currSliceNo === void 0)

  if (!idleWorker) {
    return
  }

  const nextSlice = infoObject.restSlices.shift()

  if (nextSlice === void 0) {
    return
  }

  idleWorker.worker.sendData<IDownloadExecSliceReq>('DOWNLOAD_EXEC_SLICE', {
    sliceNo: nextSlice,
  })

  idleWorker.currSliceNo = nextSlice

  dispatchSlices()
}

function onDownloadExecSlice(inThreadId: number, inData: IDownloadExecSliceRes) {
  for (const item of infoObject.wPool) {
    if (item.worker.threadId === inThreadId) {
      item.currSliceNo = void 0
      break
    }
  }

  infoObject.pendingSlices.set(inData.sliceNo, {
    buffer: normalizeBuffer(inData.buffer),
    bytes: inData.bytes,
  })

  processSliceQueue()
  dispatchSlices()
}

function onDownloadExecError(inThreadId: number, inError: IThreadError) {
  const tWorker = infoObject.wPool.find(item => item.worker.threadId === inThreadId)
  infoObject.wPool = infoObject.wPool.filter(item => item.worker.threadId !== inThreadId)
  tWorker?.worker.terminate()

  if (tWorker?.currSliceNo !== void 0) {
    infoObject.restSlices.unshift(tWorker.currSliceNo)
  }

  if (infoObject.wPool.length === 0) {
    if (infoObject.wPoolTryTimes < infoObject.tryTimes) {
      newDownloadWorker()

      infoObject.wPoolTryTimes = infoObject.wPoolTryTimes + 1
    } else {
      worker.sendData<IThreadError>('THREAD_ERROR', { msg: inError.msg })
      terminate()

      return
    }
  }

  dispatchSlices()
}

worker.onRecvData<IDownloadMainRunReq>('DOWNLOAD_MAIN_RUN', inData => {
  if (infoObject.doneCount === tWorkerData.totalSlice) {
    worker.sendData('DOWNLOAD_MAIN_DONE')

    return
  }

  if (infoObject.restSlices.length === 0) {
    for (let i = infoObject.nextSliceNo; i < tWorkerData.totalSlice; i++) {
      if (!infoObject.pendingSlices.has(i)) {
        infoObject.restSlices.push(i)
      }
    }
  }

  infoObject.threads = Math.min(inData.threads, infoObject.restSlices.length || inData.threads)
  infoObject.dlink = inData.dlink
  infoObject.tryTimes = inData.tryTimes
  infoObject.tryDelta = inData.tryDelta

  const needWorkers = infoObject.threads - infoObject.wPool.length

  for (let i = 0; i < needWorkers; i++) {
    newDownloadWorker()
  }

  dispatchSlices()
})

worker.onRecvData('DOWNLOAD_MAIN_STOP', () => {
  terminate()
})
