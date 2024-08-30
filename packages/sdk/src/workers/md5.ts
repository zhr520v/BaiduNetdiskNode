import crypto from 'crypto'
import fs from 'fs'
import { parentPort, workerData } from 'worker_threads'
import { __PRESV_ENC_BLOCK_SIZE__ } from '../common/alpha'
import { encrypt, md5, readFileSlice } from '../common/utils'
import { IErrorRes, WorkerChild } from '../common/worker'

export interface IMd5Req {
  local: string
  oriSize: number
  chunkMb: number
  keyBuf: Buffer
  ivBuf: Buffer
  endSliceNo: number
}

export interface IMd5Res {
  md5full: string
  md5s: string[]
}

const tWorkerData = workerData as IMd5Req
const worker = new WorkerChild(parentPort)

async function exec() {
  try {
    const fd = fs.openSync(tWorkerData.local, 'r')

    const md5s = []
    const hash = crypto.createHash('md5')
    const useEncrypt = !!tWorkerData.keyBuf.length
    const readChunkSize = useEncrypt
      ? tWorkerData.chunkMb * 1024 * 1024 - 1
      : tWorkerData.chunkMb * 1024 * 1024

    for (let i = 0; i <= tWorkerData.endSliceNo; i++) {
      const isEnd = i === tWorkerData.endSliceNo
      const rawChunk = readFileSlice(fd, readChunkSize, i)
      let chunk = useEncrypt
        ? encrypt(rawChunk, tWorkerData.keyBuf, tWorkerData.ivBuf)
        : rawChunk

      if (isEnd) {
        const presvBuf = Buffer.alloc(__PRESV_ENC_BLOCK_SIZE__)
        Buffer.from(tWorkerData.ivBuf).copy(presvBuf, 0, 0, tWorkerData.ivBuf.length)
        presvBuf.writeBigUInt64BE(BigInt(tWorkerData.chunkMb * 1024 * 1024), 16)
        presvBuf.writeBigUInt64BE(BigInt(tWorkerData.oriSize), 16 + 8)

        chunk = useEncrypt ? Buffer.concat([chunk, presvBuf]) : chunk

        if (chunk.length > tWorkerData.chunkMb * 1024 * 1024) {
          const subChunk1 = chunk.subarray(0, tWorkerData.chunkMb * 1024 * 1024)
          const subChunk2 = chunk.subarray(tWorkerData.chunkMb * 1024 * 1024)
          md5s.push(md5(subChunk1), md5(subChunk2))
        } else {
          md5s.push(md5(chunk))
        }
      } else {
        md5s.push(md5(chunk))
      }

      hash.update(chunk)
    }

    const md5full = hash.digest('hex')

    worker.sendData<IMd5Res>('md5', {
      md5full: md5full,
      md5s: md5s,
    })
  } catch (error) {
    worker.sendData<IErrorRes>('error', { msg: (error as Error).message })
  }
}

exec()
