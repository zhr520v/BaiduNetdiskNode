import { axios } from 'baidu-netdisk-api'
import fs from 'fs'
import { parentPort, workerData } from 'worker_threads'
import { decrypt, tryTimes } from '../common/utils'
import { IErrorRes, WorkerChild } from '../common/worker'

export interface IDownloadReq {
  access_token: string
  local: string
  dlink: string
  chunkSize: number
  shrinkComSize: number
  keyBuf: Buffer
  ivBuf: Buffer
  tryTimes: number
  tryDelta: number
}

export interface ISpeedRes {
  bytes: number
}

export interface ISliceReq {
  slice: number[]
}

export interface ISliceRes {
  slice: number[]
  bytes: number
}

const tWorkerData = workerData as IDownloadReq
let fd: number | undefined = void 0

const worker = new WorkerChild(parentPort)
worker.onRecvData<ISliceReq>('slice', async inData => {
  try {
    if (fd === void 0) {
      fd = fs.openSync(tWorkerData.local, 'r+')
    }

    const startNo = inData.slice[0]
    const endNo = inData.slice[inData.slice.length - 1]

    if (startNo === void 0 || endNo === void 0) {
      throw new Error('startNo or endNo is undefined')
    }

    const start = startNo * tWorkerData.chunkSize
    const end = Math.min((endNo + 1) * tWorkerData.chunkSize - 1, tWorkerData.shrinkComSize - 1)
    const totalBytes = end - start + 1
    const slice = inData.slice.map(item => item)

    await tryTimes(
      async () => {
        const { data } = await axios.get(tWorkerData.dlink, {
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
          let buffer = Buffer.alloc(0)

          data.on('data', (chunk: Buffer) => {
            try {
              buffer = Buffer.concat([buffer, chunk])

              worker.sendData<ISpeedRes>('speed', {
                bytes: chunk.length,
              })

              while (buffer.length >= tWorkerData.chunkSize) {
                const sliceNo = slice.shift()

                if (sliceNo === void 0) {
                  throw new Error('sliceNo is undefined')
                }

                const rawBuf = buffer.subarray(0, tWorkerData.chunkSize)
                const deBuf = tWorkerData.keyBuf.length
                  ? decrypt(rawBuf, tWorkerData.keyBuf, tWorkerData.ivBuf)
                  : rawBuf
                const pos = tWorkerData.keyBuf.length
                  ? sliceNo * (tWorkerData.chunkSize - 1)
                  : sliceNo * tWorkerData.chunkSize

                if (fd !== void 0) {
                  fs.writeSync(fd, deBuf, 0, deBuf.length, pos)
                }

                buffer = buffer.subarray(tWorkerData.chunkSize)
              }
            } catch (inError) {
              reject(inError)
            }
          })

          data.on('end', () => {
            try {
              if (buffer.length > 0) {
                const sliceNo = slice.shift()

                if (sliceNo === void 0) {
                  throw new Error('sliceNo is undefined')
                }

                const deBuf = tWorkerData.keyBuf.length
                  ? decrypt(buffer, tWorkerData.keyBuf, tWorkerData.ivBuf)
                  : buffer
                const pos = tWorkerData.keyBuf.length
                  ? sliceNo * (tWorkerData.chunkSize - 1)
                  : sliceNo * tWorkerData.chunkSize

                if (fd !== void 0) {
                  fs.writeSync(fd, deBuf, 0, deBuf.length, pos)
                }
              }

              resolve()
            } catch (inError) {
              reject(inError)
            }
          })

          data.on('error', (inError: Error) => {
            reject(inError)
          })
        })
      },
      {
        times: tWorkerData.tryTimes,
        delta: tWorkerData.tryDelta,
      }
    )

    worker.sendData<ISliceRes>('downloaded', {
      slice: inData.slice,
      bytes: totalBytes,
    })
  } catch (inError) {
    worker.sendData<IErrorRes>('error', { msg: (inError as Error).message })
  }
})
