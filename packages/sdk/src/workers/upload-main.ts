import { parentPort, workerData } from 'node:worker_threads'
import { __TRY_DELTA__, __TRY_TIMES__, __UPLOAD_THREADS__ } from '../common/const.js'
import { type IThreadError, WorkerChild, WorkerParent, newWorker } from '../common/worker.js'
import {
  type IUploadExecSliceReq,
  type IUploadExecSliceRes,
  type IUploadExecThreadData,
} from './upload-exec.js'

export interface IUploadMainThreadData {
  access_token: string
  local: string
  remote: string
  oriSize: number
  chunkMB: number
  keyBuf: Buffer
  ivBuf: Buffer
  md5full: string
  endSliceNo: number
  uploadId: string
}

export interface IUploadMainRunReq {
  threads: number
  uploadUrl: string
  tryTimes: number
  tryDelta: number
}

export interface IUploadMainDoneBytesRes {
  bytes: number
}

const tWorkerData = workerData as IUploadMainThreadData
const worker = new WorkerChild(parentPort)
const infoObject: {
  wPool: { worker: WorkerParent; currSliceNo?: number | undefined }[]
  wPoolTryTimes: number
  threads: number
  uploadUrl: string
  tryTimes: number
  tryDelta: number
  restSlices: number[]
  doneSlices: number[]
} = {
  wPool: [],
  wPoolTryTimes: 1,
  threads: __UPLOAD_THREADS__,
  uploadUrl: '',
  tryTimes: __TRY_TIMES__,
  tryDelta: __TRY_DELTA__,
  restSlices: [],
  doneSlices: [],
}

function newUploadWorker() {
  const newExecWorker = newWorker<IUploadExecThreadData>('upload-exec', {
    access_token: tWorkerData.access_token,
    local: tWorkerData.local,
    remote: tWorkerData.remote,
    oriSize: tWorkerData.oriSize,
    chunkMB: tWorkerData.chunkMB,
    keyBuf: tWorkerData.keyBuf,
    ivBuf: tWorkerData.ivBuf,
    tryTimes: infoObject.tryTimes,
    tryDelta: infoObject.tryDelta,
    uploadUrl: infoObject.uploadUrl,
    uploadId: tWorkerData.uploadId,
    md5full: tWorkerData.md5full,
  })

  const fixedWorker = new WorkerParent(newExecWorker)

  fixedWorker.onRecvData<IUploadExecSliceRes>('UPLOAD_EXEC_UPLOADED', inData => {
    onUploadExecUploaded(newExecWorker.threadId, inData.sliceNo, inData.bytes)
  })

  fixedWorker.onRecvData<IThreadError>('THREAD_ERROR', inError => {
    onUploadExecError(newExecWorker.threadId, inError)
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
}

function dispatchSlices() {
  const tWorker = infoObject.wPool.find(item => item.currSliceNo === void 0)

  if (tWorker) {
    const nextSliceNo = infoObject.restSlices.shift()

    if (nextSliceNo !== void 0) {
      tWorker.worker.sendData<IUploadExecSliceReq>('UPLOAD_EXEC_SLICE', {
        sliceNo: nextSliceNo,
        end: nextSliceNo === tWorkerData.endSliceNo,
      })

      tWorker.currSliceNo = nextSliceNo
      dispatchSlices()
    }
  }
}

function onUploadExecUploaded(inThreadId: number, inSliceNo: number, inBytes: number) {
  infoObject.doneSlices.push(inSliceNo)
  worker.sendData<IUploadMainDoneBytesRes>('UPLOAD_MAIN_DONE_BYTES', {
    bytes: inBytes,
  })

  for (const item of infoObject.wPool) {
    if (item.worker.threadId === inThreadId) {
      item.currSliceNo = void 0
    }
  }

  if (infoObject.doneSlices.length === tWorkerData.endSliceNo + 1) {
    worker.sendData('UPLOAD_MAIN_DONE')

    return
  }

  dispatchSlices()
}

function onUploadExecError(inThreadId: number, inError: IThreadError) {
  const tWorker = infoObject.wPool.find(item => item.worker.threadId === inThreadId)

  infoObject.wPool = infoObject.wPool.filter(item => item.worker.threadId !== inThreadId)
  tWorker?.worker.terminate()

  if (tWorker?.currSliceNo !== void 0) {
    infoObject.restSlices.unshift(tWorker.currSliceNo)
  }

  if (infoObject.wPool.length === 0) {
    if (infoObject.wPoolTryTimes < infoObject.tryTimes) {
      newUploadWorker()
      infoObject.wPoolTryTimes = infoObject.wPoolTryTimes + 1
    } else {
      worker.sendData<IThreadError>('THREAD_ERROR', { msg: inError.msg })
      terminate()

      return
    }
  }

  dispatchSlices()
}

worker.onRecvData<IUploadMainRunReq>('UPLOAD_MAIN_RUN', inData => {
  if (infoObject.doneSlices.length === tWorkerData.endSliceNo + 1) {
    worker.sendData('UPLOAD_MAIN_DONE')

    return
  }

  if (infoObject.restSlices.length === 0) {
    for (let i = 0; i <= tWorkerData.endSliceNo; i++) {
      infoObject.restSlices.push(i)
    }
  }

  infoObject.threads = inData.threads
  infoObject.uploadUrl = inData.uploadUrl
  infoObject.tryTimes = inData.tryTimes
  infoObject.tryDelta = inData.tryDelta

  for (let i = 0; i < infoObject.threads; i++) {
    newUploadWorker()
  }

  dispatchSlices()
})

worker.onRecvData('UPLOAD_MAIN_STOP', () => {
  terminate()
})
