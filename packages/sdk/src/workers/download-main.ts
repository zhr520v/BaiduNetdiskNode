import crypto from 'node:crypto'
import { parentPort, workerData } from 'node:worker_threads'
import { __TRY_DELTA__, __TRY_TIMES__, __UPLOAD_THREADS__ } from '../common/const.js'
import { type IThreadError, newWorker, WorkerChild, WorkerParent } from '../common/worker.js'
import { type IDownloadExecSliceReq, type IDownloadExecThreadData } from './download-exec.js'

export interface IDownloadMainThreadData {
  access_token: string
  local: string
  chunkMB: number
  shrinkComSize: number
  keyBuf: Buffer
  ivBuf: Buffer
  totalSlice: number
  splitSlice: number
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
  nextSliceNo: number
  sliceCaches: { sliceNo: number; buffer: Buffer }[]
  restSlices: number[]
  doneSlices: number[]
  md5Hash: crypto.Hash
} = {
  wPool: [],
  wPoolTryTimes: 1,
  threads: __UPLOAD_THREADS__,
  dlink: '',
  tryTimes: __TRY_TIMES__,
  tryDelta: __TRY_DELTA__,
  nextSliceNo: 0,
  sliceCaches: [],
  restSlices: [],
  doneSlices: [],
  md5Hash: crypto.createHash('md5'),
}

function newDownloadWorker() {
  const newExecWorker = newWorker<IDownloadExecThreadData>('download-exec', {
    access_token: tWorkerData.access_token,
    shrinkComSize: tWorkerData.shrinkComSize,
    local: tWorkerData.local,
    dlink: infoObject.dlink,
    chunkMB: tWorkerData.chunkMB,
    keyBuf: tWorkerData.keyBuf,
    ivBuf: tWorkerData.ivBuf,
    splitSlice: tWorkerData.splitSlice,
    tryTimes: infoObject.tryTimes,
    tryDelta: infoObject.tryDelta,
    noWrite: tWorkerData.noWrite,
  })

  const fixedWorker = new WorkerParent(newExecWorker)

  fixedWorker.onRecvData<IThreadError>('THREAD_ERROR', inError => {
    onDownloadExecError(newExecWorker.threadId, inError)
  })

  fixedWorker.onRecvBinary(inBuf => {
    const sliceNo = Buffer.copyBytesFrom(inBuf, 0, 4).readUInt32BE(0)
    const deBuffer = inBuf.subarray(4)

    for (const item of infoObject.wPool) {
      if (item.worker.threadId === newExecWorker.threadId) {
        item.currSliceNo = void 0
      }
    }

    infoObject.sliceCaches.push({ sliceNo, buffer: deBuffer })

    runSliceCacheQueue()
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

  for (const item of infoObject.sliceCaches) {
    infoObject.restSlices.unshift(item.sliceNo)
  }

  infoObject.sliceCaches = []
  infoObject.restSlices.sort()
}

function runSliceCacheQueue() {
  const cache = infoObject.sliceCaches.find(s => s.sliceNo === infoObject.nextSliceNo)

  if (cache) {
    infoObject.sliceCaches = infoObject.sliceCaches.filter(
      s => s.sliceNo !== infoObject.nextSliceNo
    )

    if (!tWorkerData.noVerify && tWorkerData.noVerifyOnDisk) {
      infoObject.md5Hash.update(cache.buffer)
    }

    infoObject.nextSliceNo = infoObject.nextSliceNo + 1

    onDownloadExecDownloaded(cache.sliceNo, cache.buffer.length)

    dispatchSlices()

    runSliceCacheQueue()
  }
}

function dispatchSlices() {
  if (infoObject.sliceCaches.length >= infoObject.wPool.length) {
    return
  }

  const tWorker = infoObject.wPool.find(item => item.currSliceNo === void 0)

  if (tWorker) {
    const nextSlice = infoObject.restSlices.shift()

    if (nextSlice !== void 0) {
      tWorker.worker.sendData<IDownloadExecSliceReq>('DOWNLOAD_EXEC_SLICE', {
        sliceNo: nextSlice,
      })

      tWorker.currSliceNo = nextSlice
      dispatchSlices()
    }
  }
}

function onDownloadExecDownloaded(inSliceNo: number, inBytes: number) {
  infoObject.doneSlices.push(inSliceNo)
  worker.sendData<IDownloadMainDoneBytesRes>('DOWNLOAD_MAIN_DONE_BYTES', {
    bytes: inBytes,
  })

  if (infoObject.doneSlices.length === tWorkerData.totalSlice) {
    if (!tWorkerData.noVerify && tWorkerData.noVerifyOnDisk) {
      const md5 = infoObject.md5Hash.digest('hex').toUpperCase()

      worker.sendData<IDownloadMainDoneRes>('DOWNLOAD_MAIN_DONE', {
        md5: md5,
      })
    } else {
      worker.sendData<IDownloadMainDoneRes>('DOWNLOAD_MAIN_DONE', {
        md5: '',
      })
    }

    return
  }
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
  if (infoObject.doneSlices.length === tWorkerData.totalSlice) {
    worker.sendData('DOWNLOAD_MAIN_DONE')

    return
  }

  if (infoObject.restSlices.length === 0) {
    for (let i = 0; i < tWorkerData.totalSlice; i++) {
      infoObject.restSlices.push(i)
    }
  }

  infoObject.threads = Math.min(inData.threads, infoObject.restSlices.length)
  infoObject.dlink = inData.dlink
  infoObject.tryTimes = inData.tryTimes
  infoObject.tryDelta = inData.tryDelta

  for (let i = 0; i < infoObject.threads; i++) {
    newDownloadWorker()
  }

  dispatchSlices()
})

worker.onRecvData('DOWNLOAD_MAIN_STOP', () => {
  terminate()
})
