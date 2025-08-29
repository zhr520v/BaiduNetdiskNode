import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MessagePort, Worker } from 'node:worker_threads'

export interface IThreadError {
  msg: string
}

export class WorkerParent {
  #entity: Worker
  #recvDataFuncs: Map<string, (inData: any) => void> = new Map()
  #recvBinaryFunc: ((inData: Buffer) => void) | undefined

  constructor(inWorker: Worker) {
    this.#entity = inWorker
    this.#entity.on('message', this.#onMessage.bind(this))
  }

  #onMessage(inData: any) {
    if (inData.type) {
      const msg = inData as { type: string; data: any }
      this.#recvDataFuncs.get(msg.type)?.(msg.data)
    } else {
      this.#recvBinaryFunc?.(Buffer.from(inData))
    }
  }

  get entity() {
    return this.#entity
  }

  get threadId() {
    return this.#entity.threadId
  }

  sendData<T = void>(inType: string, inData?: T) {
    this.#entity.postMessage({ type: inType, data: inData })
  }

  onRecvData<T = void>(
    inType: string,
    inFunc: T extends void ? () => void : (inData: T) => void
  ) {
    this.#recvDataFuncs.set(inType, inFunc)
  }

  sendBinary(inData: Buffer<ArrayBuffer>) {
    if (inData.length >= 4096) {
      this.#entity.postMessage(inData, [inData.buffer])
    } else {
      this.#entity.postMessage(inData)
    }
  }

  onRecvBinary(inFunc: (inData: Buffer) => void) {
    this.#recvBinaryFunc = inFunc
  }

  async terminate() {
    try {
      await this.#entity.terminate()
    } catch {}
  }
}

export class WorkerChild {
  #parentPort: MessagePort | null
  #recvDataFuncs: Map<string, (inData: any) => void> = new Map()
  #recvBinaryFunc: ((inData: Buffer) => void) | undefined

  constructor(inParentPort: MessagePort | null) {
    this.#parentPort = inParentPort
    this.#parentPort?.on('message', this.#onMessage.bind(this))
  }

  #onMessage(inData: any) {
    if (inData.type) {
      const msg = inData as { type: string; data: any }
      this.#recvDataFuncs.get(msg.type)?.(msg.data)
    } else {
      this.#recvBinaryFunc?.(Buffer.from(inData))
    }
  }

  sendData<T = void>(inType: string, inData?: T) {
    this.#parentPort?.postMessage({ type: inType, data: inData })
  }

  onRecvData<T = void>(
    inType: string,
    inFunc: T extends void ? () => void : (inData: T) => void
  ) {
    this.#recvDataFuncs.set(inType, inFunc)
  }

  sendBinary(inData: Buffer<ArrayBuffer>) {
    // upon node v21.0.0, if buffer size < 4096 bytes, it'll be in the buffer pool and not transferable
    if (inData.length >= 4096) {
      this.#parentPort?.postMessage(inData, [inData.buffer])
    } else {
      this.#parentPort?.postMessage(inData)
    }
  }

  onRecvBinary(inFunc: (inData: Buffer) => void) {
    this.#recvBinaryFunc = inFunc
  }
}

const __DIRNAME__ = path.dirname(fileURLToPath(import.meta.url))
const __WORKER_CACHE__: Map<string, string> = new Map()
const __WORKER_LOADER__ = path.resolve(__DIRNAME__, '../workers/_loader')

export function newWorker<T>(inWorkerName: string, inWorkerData: T) {
  const workerPath = path.resolve(__DIRNAME__, `../workers/${inWorkerName}`)

  if (!__WORKER_CACHE__.get(workerPath)) {
    __WORKER_CACHE__.set(workerPath, fs.existsSync(workerPath + '.ts') ? 'ts' : 'js')
  }

  const workerCache = __WORKER_CACHE__.get(workerPath)

  return new Worker(workerCache === 'ts' ? __WORKER_LOADER__ : workerPath, {
    workerData: {
      ...inWorkerData,
      __worker_filepath__: workerCache === 'ts' ? './' + inWorkerName + '.ts' : '',
    },
  })
}
