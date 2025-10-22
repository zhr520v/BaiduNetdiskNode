import { axios, requestErrorFormat } from 'baidu-netdisk-api'
import { createDecipheriv } from 'node:crypto'
import fs from 'node:fs'
import { type Readable, Transform, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { parentPort, workerData } from 'node:worker_threads'
import { tryTimes } from '../common/utils.js'
import { type IThreadError, WorkerChild } from '../common/worker.js'

export interface IDownloadExecThreadData {
  access_token: string
  local: string
  dlink: string
  chunkMB: number
  chunkBytes: number
  plainChunkBytes: number
  shrinkComSize: number
  keyBuf: Buffer
  ivBuf: Buffer
  tryTimes: number
  tryDelta: number
  returnBuffer: boolean
  noWrite?: boolean
}

export interface IDownloadExecSliceReq {
  sliceNo: number
}

export interface IDownloadExecSliceRes {
  sliceNo: number
  bytes: number
  buffer?: Buffer
}

const tWorkerData = workerData as IDownloadExecThreadData

let fd: number | undefined = void 0

const worker = new WorkerChild(parentPort)

class AesDecryptTransform extends Transform {
  #decipher

  constructor(inKey: Buffer, inIv: Buffer) {
    super()
    this.#decipher = createDecipheriv('aes-256-cbc', inKey, inIv)
  }

  _transform(chunk: Buffer, _enc: BufferEncoding, callback: (error?: Error | null) => void) {
    try {
      const data = this.#decipher.update(chunk)

      if (data.length) {
        this.push(data)
      }

      callback()
    } catch (error) {
      callback(error as Error)
    }
  }

  _flush(callback: (error?: Error | null) => void) {
    try {
      const data = this.#decipher.final()

      if (data.length) {
        this.push(data)
      }

      callback()
    } catch (error) {
      callback(error as Error)
    }
  }
}

class SliceWritable extends Writable {
  #fd: number | undefined
  #writeEnabled: boolean
  #collect: boolean
  #start: number
  #offset = 0
  #buffers: Buffer[] = []
  bytes = 0

  constructor(inOpts: { fd?: number; writeEnabled: boolean; collect: boolean; start: number }) {
    super()
    this.#fd = inOpts.fd
    this.#writeEnabled = inOpts.writeEnabled && inOpts.fd !== undefined
    this.#collect = inOpts.collect
    this.#start = inOpts.start
  }

  _write(chunk: Buffer, _enc: BufferEncoding, callback: (error?: Error | null) => void) {
    this.bytes += chunk.length

    if (this.#collect) {
      this.#buffers.push(chunk)
    }

    if (this.#writeEnabled && this.#fd !== undefined) {
      try {
        fs.writeSync(this.#fd, chunk, 0, chunk.length, this.#start + this.#offset)
      } catch (error) {
        callback(error as Error)

        return
      }
    }

    this.#offset = this.#offset + chunk.length
    callback()
  }

  getBuffer() {
    if (!this.#collect) {
      return undefined
    }

    const buffer = Buffer.concat(this.#buffers)
    this.#buffers = []

    return buffer
  }
}

worker.onRecvData<IDownloadExecSliceReq>('DOWNLOAD_EXEC_SLICE', async inData => {
  try {
    if (!tWorkerData.noWrite && fd === void 0) {
      fd = fs.openSync(tWorkerData.local, 'r+')
    }

    const chunkBytes = tWorkerData.chunkBytes
    const sliceStart = inData.sliceNo * chunkBytes
    const remain = Math.max(tWorkerData.shrinkComSize - sliceStart, 0)

    if (remain <= 0) {
      worker.sendData<IDownloadExecSliceRes>('DOWNLOAD_EXEC_SLICE_DONE', {
        sliceNo: inData.sliceNo,
        bytes: 0,
        buffer: tWorkerData.returnBuffer ? Buffer.alloc(0) : undefined,
      })

      return
    }

    const end = sliceStart + Math.min(remain, chunkBytes) - 1

    let result: IDownloadExecSliceRes | undefined

    await tryTimes(
      async () => {
        const response = await axios
          .get<Readable>(tWorkerData.dlink, {
            params: {
              access_token: tWorkerData.access_token,
            },
            headers: {
              'User-Agent': 'pan.baidu.com',
              Range: `bytes=${sliceStart}-${end}`,
            },
            responseType: 'stream',
            responseEncoding: 'binary',
          })
          .catch(inErr => {
            throw requestErrorFormat(inErr)
          })

        const sliceWriter = new SliceWritable({
          fd,
          writeEnabled: !tWorkerData.noWrite,
          collect: tWorkerData.returnBuffer,
          start: inData.sliceNo * tWorkerData.plainChunkBytes,
        })

        const transforms: Transform[] = []

        if (tWorkerData.keyBuf.length) {
          transforms.push(new AesDecryptTransform(tWorkerData.keyBuf, tWorkerData.ivBuf))
        }

        const pipelineStreams: (
          | NodeJS.ReadableStream
          | NodeJS.WritableStream
          | NodeJS.ReadWriteStream
        )[] = [response.data, ...transforms, sliceWriter]

        await pipeline(pipelineStreams)

        result = {
          sliceNo: inData.sliceNo,
          bytes: sliceWriter.bytes,
          buffer: tWorkerData.returnBuffer ? sliceWriter.getBuffer() : undefined,
        }
      },
      {
        times: tWorkerData.tryTimes,
        delta: tWorkerData.tryDelta,
      }
    )

    if (!result) {
      throw new Error('Slice download pipeline did not produce output')
    }

    worker.sendData<IDownloadExecSliceRes>('DOWNLOAD_EXEC_SLICE_DONE', result)
  } catch (inErr) {
    worker.sendData<IThreadError>('THREAD_ERROR', { msg: (inErr as Error).message })
  }
})
