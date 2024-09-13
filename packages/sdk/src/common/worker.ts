import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MessagePort, Worker } from 'node:worker_threads'
import { __ES__ } from './alpha'

export interface IErrorRes {
  msg: string
}

export class WorkerParent {
  #entity: Worker
  #recvDataFuncs: Map<string, (inData: any) => void> = new Map()

  constructor(inWorker: Worker) {
    this.#entity = inWorker
    this.#entity.on('message', this.#onMessage.bind(this))
  }

  #onMessage(inData: { type: string; data: any }) {
    this.#recvDataFuncs.get(inData.type)?.(inData.data)
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

  async terminate() {
    try {
      await this.#entity.terminate()
    } catch {}
  }
}

export class WorkerChild {
  #parentPort: MessagePort | null
  #recvDataFuncs: Map<string, (inData: any) => void> = new Map()

  constructor(inParentPort: MessagePort | null) {
    this.#parentPort = inParentPort
    this.#parentPort?.on('message', this.#onMessage.bind(this))
  }

  #onMessage(inData: { type: string; data: any }) {
    this.#recvDataFuncs.get(inData.type)?.(inData.data)
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
}

// @ts-ignore
const __DIRNAME__ = path.dirname(fileURLToPath(import.meta.url))
const __WORKER_CACHE__: Map<string, string> = new Map()
const __WORKER_LOADER__ = path.resolve(__DIRNAME__, '../workers/_loader')

export function newWorker<T>(inWorkerName: string, inWorkerData: T) {
  const workerPath = __ES__
    ? path.resolve(__DIRNAME__, `../workers/${inWorkerName}`)
    : path.resolve(__dirname, `../workers/${inWorkerName}`)

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
