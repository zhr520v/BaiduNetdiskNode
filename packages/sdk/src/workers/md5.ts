import crypto from 'node:crypto'
import fs from 'node:fs'
import { parentPort, workerData } from 'node:worker_threads'
import { encrypt, md5, readFileSlice } from '../common//utils.js'
import { type IThreadError, WorkerChild } from '../common//worker.js'
import { __PRESV_ENC_BLOCK_SIZE__ } from '../common/const.js'

export interface IMd5ThreadData {
  local: string
  oriSize: number
  chunkMB: number
  keyBuf: Buffer
  ivBuf: Buffer
  endSliceNo: number
}

export interface IMd5DoneRes {
  md5full: string
  md5s: string[]
}

const tWorkerData = workerData as IMd5ThreadData
const worker = new WorkerChild(parentPort)

async function exec() {
  try {
    const fd = fs.openSync(tWorkerData.local, 'r')

    const md5s = []
    const hash = crypto.createHash('md5')
    const useEncrypt = !!tWorkerData.keyBuf.length
    const readChunkSize = useEncrypt
      ? tWorkerData.chunkMB * 1024 * 1024 - 1
      : tWorkerData.chunkMB * 1024 * 1024

    let md5full = ''

    for (let i = 0; i <= tWorkerData.endSliceNo; i++) {
      const isEnd = i === tWorkerData.endSliceNo
      const rawChunk = readFileSlice(fd, readChunkSize, i)

      hash.update(rawChunk)

      const chunk = useEncrypt
        ? encrypt(rawChunk, tWorkerData.keyBuf, tWorkerData.ivBuf)
        : rawChunk

      if (isEnd) {
        md5full = hash.digest('hex').toUpperCase()

        const presvBuf = Buffer.alloc(__PRESV_ENC_BLOCK_SIZE__)
        Buffer.from(tWorkerData.ivBuf).copy(presvBuf, 0, 0, tWorkerData.ivBuf.length) // AES IV
        Buffer.from(md5full.substring(8, 24)).copy(presvBuf, 16, 0, 16) // MD5 Middle 16
        presvBuf.writeBigUInt64BE(BigInt(tWorkerData.oriSize), 16 + 16) // Raw Size
        presvBuf.writeUint32BE(tWorkerData.chunkMB, 16 + 16 + 8) // Chunk MB
        presvBuf.writeUint32BE(
          presvBuf.subarray(0, 16 + 16 + 8 + 4).reduce((pre, cur) => pre + cur),
          16 + 16 + 8 + 4
        ) // Verify

        const newChunk = useEncrypt ? Buffer.concat([chunk, presvBuf]) : chunk

        if (newChunk.length > tWorkerData.chunkMB * 1024 * 1024) {
          const subChunk1 = newChunk.subarray(0, tWorkerData.chunkMB * 1024 * 1024)
          const subChunk2 = newChunk.subarray(tWorkerData.chunkMB * 1024 * 1024)
          md5s.push(md5(subChunk1), md5(subChunk2))
        } else {
          md5s.push(md5(newChunk))
        }
      } else {
        md5s.push(md5(chunk))
      }
    }

    worker.sendData<IMd5DoneRes>('MD5_DONE', {
      md5full: md5full,
      md5s: md5s,
    })
  } catch (inErr) {
    worker.sendData<IThreadError>('THREAD_ERROR', { msg: (inErr as Error).message })
  }
}

exec()
