import crypto from 'node:crypto'
import fs from 'node:fs'
import { parentPort, workerData } from 'node:worker_threads'
import { type IThreadError, WorkerChild } from '../common/worker.js'

export interface IMD5FileThreadData {
  local: string
}

export interface IMD5FileDone {
  md5full: string
}

const tWorkerData = workerData as IMD5FileThreadData
const worker = new WorkerChild(parentPort)

try {
  const hash = crypto.createHash('md5')
  const readStream = fs.createReadStream(tWorkerData.local)

  readStream.on('data', inChunk => {
    hash.update(inChunk)
  })

  readStream.on('end', () => {
    const md5 = hash.digest('hex').toUpperCase()
    worker.sendData<IMD5FileDone>('MD5_FILE_DONE', { md5full: md5 })
  })

  readStream.on('error', inError => {
    worker.sendData<IThreadError>('THREAD_ERROR', { msg: (inError as Error).message })
  })
} catch (inErr) {
  worker.sendData<IThreadError>('THREAD_ERROR', { msg: (inErr as Error).message })
}
