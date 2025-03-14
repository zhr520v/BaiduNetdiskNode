import { axios, requestErrorFormat } from 'baidu-netdisk-api'
import fs from 'node:fs'
import { type Readable } from 'node:stream'
import { parentPort, workerData } from 'node:worker_threads'
import { decrypt, tryTimes } from '../common/utils.js'
import { type IThreadError, WorkerChild } from '../common/worker.js'

export interface IDownloadExecThreadData {
  access_token: string
  local: string
  dlink: string
  chunkMB: number
  shrinkComSize: number
  keyBuf: Buffer
  ivBuf: Buffer
  splitSlice: number
  tryTimes: number
  tryDelta: number
  noWrite?: boolean
}

export interface IDownloadExecSliceReq {
  sliceNo: number
}

const tWorkerData = workerData as IDownloadExecThreadData

let fd: number | undefined = void 0

const worker = new WorkerChild(parentPort)

worker.onRecvData<IDownloadExecSliceReq>('DOWNLOAD_EXEC_SLICE', async inData => {
  try {
    if (!tWorkerData.noWrite && fd === void 0) {
      fd = fs.openSync(tWorkerData.local, 'r+')
    }

    const tSlices: number[] = []

    for (let i = 0; i < tWorkerData.splitSlice; i++) {
      tSlices.push(inData.sliceNo * tWorkerData.splitSlice + i)
    }

    const startNo = tSlices[0]
    const endNo = tSlices[tSlices.length - 1]

    if (startNo === void 0 || endNo === void 0) {
      throw new Error('startNo or endNo is undefined')
    }

    const start = startNo * tWorkerData.chunkMB * 1024 * 1024
    const end = Math.min(
      (endNo + 1) * tWorkerData.chunkMB * 1024 * 1024 - 1,
      Math.max(tWorkerData.shrinkComSize - 1, 0)
    )

    const slices = tSlices.map(item => item)

    let finalBuf = Buffer.alloc(0)

    await tryTimes(
      async () => {
        const { data } = await axios.get<Readable>(tWorkerData.dlink, {
          params: {
            access_token: tWorkerData.access_token,
          },
          headers: {
            'User-Agent': 'pan.baidu.com',
            Range: `bytes=${start}-${end}`,
          },
          responseType: 'stream',
          responseEncoding: 'binary',
        })

        await new Promise<void>((resolve, reject) => {
          let tempBuf = Buffer.alloc(0)
          let decoBuf = Buffer.alloc(0)

          data.on('data', (chunk: Buffer) => {
            try {
              tempBuf = Buffer.concat([tempBuf, chunk])

              while (tempBuf.length >= tWorkerData.chunkMB * 1024 * 1024) {
                const nextNo = slices.shift()

                if (nextNo === void 0) {
                  throw new Error('sliceNo is undefined')
                }

                const sectBuf = tempBuf.subarray(0, tWorkerData.chunkMB * 1024 * 1024)
                const decoSectBuf = tWorkerData.keyBuf.length
                  ? decrypt(sectBuf, tWorkerData.keyBuf, tWorkerData.ivBuf)
                  : sectBuf
                const pos = tWorkerData.keyBuf.length
                  ? nextNo * (tWorkerData.chunkMB * 1024 * 1024 - 1)
                  : nextNo * tWorkerData.chunkMB * 1024 * 1024

                if (!tWorkerData.noWrite && fd !== void 0) {
                  fs.writeSync(fd, decoSectBuf, 0, decoSectBuf.length, pos)
                }

                tempBuf = tempBuf.subarray(tWorkerData.chunkMB * 1024 * 1024)
                decoBuf = Buffer.concat([decoBuf, decoSectBuf])
              }
            } catch (inError) {
              reject(inError)
            }
          })

          data.on('end', () => {
            try {
              if (tempBuf.length > 0) {
                const sliceNo = slices.shift()

                if (sliceNo === void 0) {
                  throw new Error('sliceNo is undefined')
                }

                const decoSectBuf = tWorkerData.keyBuf.length
                  ? decrypt(tempBuf, tWorkerData.keyBuf, tWorkerData.ivBuf)
                  : tempBuf
                const pos = tWorkerData.keyBuf.length
                  ? sliceNo * (tWorkerData.chunkMB * 1024 * 1024 - 1)
                  : sliceNo * tWorkerData.chunkMB * 1024 * 1024

                if (!tWorkerData.noWrite && fd !== void 0) {
                  fs.writeSync(fd, decoSectBuf, 0, decoSectBuf.length, pos)
                }

                decoBuf = Buffer.concat([decoBuf, decoSectBuf])
              }

              finalBuf = decoBuf

              resolve()
            } catch (inError) {
              reject(inError)
            }
          })

          data.on('error', (inError: Error) => {
            reject(requestErrorFormat(inError))
          })
        })
      },
      {
        times: tWorkerData.tryTimes,
        delta: tWorkerData.tryDelta,
      }
    )

    const sliceNoBuf = Buffer.alloc(4)
    sliceNoBuf.writeUInt32BE(inData.sliceNo, 0)
    const fullBuf = Buffer.concat([sliceNoBuf, finalBuf])
    worker.sendBinary(fullBuf)
  } catch (inError) {
    worker.sendData<IThreadError>('THREAD_ERROR', { msg: (inError as Error).message })
  }
})
