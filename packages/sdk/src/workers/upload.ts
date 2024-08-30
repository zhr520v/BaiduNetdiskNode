import { httpUploadSlice } from '@baidu-netdisk/api'
import fs from 'fs'
import { parentPort, workerData } from 'worker_threads'
import { __PRESV_ENC_BLOCK_SIZE__ } from '../common/alpha'
import { encrypt, readFileSlice, tryTimes } from '../common/utils'
import { IErrorRes, WorkerChild } from '../common/worker'

export interface IUploadReq {
  access_token: string
  local: string
  remote: string
  oriSize: number
  chunkMb: number
  keyBuf: Buffer
  ivBuf: Buffer
  tryTimes: number
  tryDelta: number
  uploadUrl: string
  uploadId: string
}

export interface ISpeedRes {
  bytes: number
}

export interface ISliceReq {
  sliceNo: number
  end: boolean
}

export interface ISliceRes {
  sliceNo: number
  bytes: number
}

const tWorkerData = workerData as IUploadReq
const readChunkSize = tWorkerData.keyBuf.length
  ? tWorkerData.chunkMb * 1024 * 1024 - 1
  : tWorkerData.chunkMb * 1024 * 1024
let fd: number | undefined = void 0

const worker = new WorkerChild(parentPort)
worker.onRecvData<ISliceReq>('slice', async inData => {
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

      Buffer.from(tWorkerData.ivBuf).copy(presvBuf, 0, 0, tWorkerData.ivBuf.length)

      presvBuf.writeBigUInt64BE(BigInt(tWorkerData.chunkMb * 1024 * 1024), 16)
      presvBuf.writeBigUInt64BE(BigInt(tWorkerData.oriSize), 16 + 8)

      buf = Buffer.concat([buf, presvBuf])
    }

    const finalBufs: Buffer[] = []

    if (buf.length > tWorkerData.chunkMb * 1024 * 1024) {
      finalBufs.push(buf.subarray(0, tWorkerData.chunkMb * 1024 * 1024))
      finalBufs.push(buf.subarray(tWorkerData.chunkMb * 1024 * 1024))
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
          let lastBytes = 0
          let bufBytes = toUploadBuf.length

          await httpUploadSlice(
            tWorkerData.uploadUrl,
            {
              access_token: tWorkerData.access_token,
              uploadid: tWorkerData.uploadId,
              partseq: inData.sliceNo + bufIndex,
              path: encodeURIComponent(tWorkerData.remote),
            },
            toUploadBuf,
            {
              onUploadProgress: inProgressEvt => {
                worker.sendData<ISpeedRes>('speed', {
                  bytes: inProgressEvt.bytes - lastBytes,
                })
                lastBytes = inProgressEvt.bytes
              },
            }
          )

          worker.sendData<ISpeedRes>('speed', {
            bytes: bufBytes - lastBytes,
          })
        },
        {
          times: tWorkerData.tryTimes,
          delta: tWorkerData.tryDelta,
        }
      )

      bufIndex = bufIndex + 1
    }

    worker.sendData<ISliceRes>('uploaded', {
      sliceNo: inData.sliceNo,
      bytes: totalBytes,
    })
  } catch (error) {
    worker.sendData<IErrorRes>('error', { msg: (error as Error).message })
  }
})
