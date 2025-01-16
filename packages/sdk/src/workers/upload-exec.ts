import { httpUploadSlice } from 'baidu-netdisk-api'
import fs from 'node:fs'
import { parentPort, workerData } from 'node:worker_threads'
import { __PRESV_ENC_BLOCK_SIZE__ } from '../common/alpha.js'
import { encrypt, readFileSlice, tryTimes } from '../common/utils.js'
import { type IErrorRes, WorkerChild } from '../common/worker.js'

export interface IUploadExecThreadData {
  access_token: string
  local: string
  remote: string
  oriSize: number
  chunkMB: number
  keyBuf: Buffer
  ivBuf: Buffer
  tryTimes: number
  tryDelta: number
  uploadUrl: string
  uploadId: string
  md5full: string
}

export interface IUploadExecSliceReq {
  sliceNo: number
  end: boolean
}

export interface IUploadExecSliceRes {
  sliceNo: number
  bytes: number
}

const tWorkerData = workerData as IUploadExecThreadData
const readChunkSize = tWorkerData.keyBuf.length
  ? tWorkerData.chunkMB * 1024 * 1024 - 1
  : tWorkerData.chunkMB * 1024 * 1024

let fd: number | undefined = void 0

const worker = new WorkerChild(parentPort)

worker.onRecvData<IUploadExecSliceReq>('UPLOAD_EXEC_SLICE', async inData => {
  try {
    if (fd === void 0) {
      fd = fs.openSync(tWorkerData.local, 'r')
    }

    let buf = readFileSlice(fd, readChunkSize, inData.sliceNo)

    if (tWorkerData.keyBuf.length) {
      buf = encrypt(buf, tWorkerData.keyBuf, tWorkerData.ivBuf)
    }

    if (inData.end && tWorkerData.keyBuf.length) {
      const presvBuf = Buffer.alloc(__PRESV_ENC_BLOCK_SIZE__)

      Buffer.from(tWorkerData.ivBuf).copy(presvBuf, 0, 0, tWorkerData.ivBuf.length) // AES IV
      Buffer.from(tWorkerData.md5full.substring(8, 24)).copy(presvBuf, 16, 0, 16) // MD5 Middle 16
      presvBuf.writeBigUInt64BE(BigInt(tWorkerData.oriSize), 16 + 16) // Raw Size
      presvBuf.writeUint32BE(tWorkerData.chunkMB, 16 + 16 + 8) // Chunk MB
      presvBuf.writeUInt32BE(
        presvBuf.subarray(0, 16 + 16 + 8 + 4).reduce((pre, cur) => pre + cur, 0),
        16 + 16 + 8 + 4
      ) // Verify

      buf = Buffer.concat([buf, presvBuf])
    }

    const finalBufs: Buffer[] = []

    if (buf.length > tWorkerData.chunkMB * 1024 * 1024) {
      finalBufs.push(buf.subarray(0, tWorkerData.chunkMB * 1024 * 1024))
      finalBufs.push(buf.subarray(tWorkerData.chunkMB * 1024 * 1024))
    } else {
      finalBufs.push(buf)
    }

    const totalBytes = finalBufs
      .map(item => item.length)
      .reduce((total, curr) => total + curr, 0)

    let bufIndex = 0

    for (const toUploadBuf of finalBufs) {
      await tryTimes(
        async () => {
          await httpUploadSlice(
            tWorkerData.uploadUrl,
            {
              access_token: tWorkerData.access_token,
              uploadid: tWorkerData.uploadId,
              partseq: inData.sliceNo + bufIndex,
              path: encodeURIComponent(tWorkerData.remote),
            },
            toUploadBuf
          )
        },
        {
          times: tWorkerData.tryTimes,
          delta: tWorkerData.tryDelta,
        }
      )

      bufIndex = bufIndex + 1
    }

    worker.sendData<IUploadExecSliceRes>('UPLOAD_EXEC_UPLOADED', {
      sliceNo: inData.sliceNo,
      bytes: totalBytes,
    })
  } catch (error) {
    worker.sendData<IErrorRes>('THREAD_ERROR', { msg: (error as Error).message })
  }
})
