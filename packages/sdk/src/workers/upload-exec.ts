import { httpUploadSlice } from 'baidu-netdisk-api'
import { createCipheriv } from 'node:crypto'
import fs from 'node:fs'
import { Readable, Transform, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { parentPort, workerData } from 'node:worker_threads'
import { __PRESV_ENC_BLOCK_SIZE__ } from '../common/const.js'
import { tryTimes } from '../common/utils.js'
import { type IThreadError, WorkerChild } from '../common/worker.js'

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
const worker = new WorkerChild(parentPort)

class AesEncryptTransform extends Transform {
  #cipher

  constructor(inKey: Buffer, inIv: Buffer) {
    super()
    this.#cipher = createCipheriv('aes-256-cbc', inKey, inIv)
  }

  _transform(chunk: Buffer, _enc: BufferEncoding, callback: (error?: Error | null) => void) {
    try {
      const encrypted = this.#cipher.update(chunk)

      if (encrypted.length) {
        this.push(encrypted)
      }

      callback()
    } catch (error) {
      callback(error as Error)
    }
  }

  _flush(callback: (error?: Error | null) => void) {
    try {
      const encrypted = this.#cipher.final()

      if (encrypted.length) {
        this.push(encrypted)
      }

      callback()
    } catch (error) {
      callback(error as Error)
    }
  }
}

class AppendBufferTransform extends Transform {
  #tail?: Buffer

  constructor(inTail?: Buffer) {
    super()
    this.#tail = inTail
  }

  _transform(chunk: Buffer, _enc: BufferEncoding, callback: (error?: Error | null) => void) {
    this.push(chunk)
    callback()
  }

  _flush(callback: (error?: Error | null) => void) {
    if (this.#tail?.length) {
      this.push(this.#tail)
    }

    callback()
  }
}

class BufferCollector extends Writable {
  #buffers: Buffer[] = []
  bytes = 0

  _write(chunk: Buffer, _enc: BufferEncoding, callback: (error?: Error | null) => void) {
    this.bytes = this.bytes + chunk.length
    this.#buffers.push(chunk)
    callback()
  }

  getBuffer() {
    const buffer = Buffer.concat(this.#buffers)
    this.#buffers = []

    return buffer
  }
}

function buildReservedBuffer() {
  const presvBuf = Buffer.alloc(__PRESV_ENC_BLOCK_SIZE__)

  Buffer.from(tWorkerData.ivBuf).copy(presvBuf, 0, 0, tWorkerData.ivBuf.length)
  Buffer.from(tWorkerData.md5full.substring(8, 24)).copy(presvBuf, 16, 0, 16)
  presvBuf.writeBigUInt64BE(BigInt(tWorkerData.oriSize), 32)
  presvBuf.writeUint32BE(tWorkerData.chunkMB, 40)
  presvBuf.writeUInt32BE(
    presvBuf.subarray(0, 44).reduce((pre, cur) => pre + cur, 0),
    44
  )

  return presvBuf
}

worker.onRecvData<IUploadExecSliceReq>('UPLOAD_EXEC_SLICE', async inData => {
  try {
    const chunkBytes = tWorkerData.chunkMB * 1024 * 1024
    const plainChunkBytes = tWorkerData.keyBuf.length ? chunkBytes - 1 : chunkBytes
    const sliceStart = inData.sliceNo * plainChunkBytes
    const plainRemain = Math.max(tWorkerData.oriSize - sliceStart, 0)
    const readLength = Math.min(plainRemain, plainChunkBytes)

    const source: Readable =
      readLength > 0
        ? fs.createReadStream(tWorkerData.local, {
            start: sliceStart,
            end: sliceStart + readLength - 1,
          })
        : Readable.from(Buffer.alloc(0))

    const transforms: Transform[] = []

    if (tWorkerData.keyBuf.length) {
      transforms.push(new AesEncryptTransform(tWorkerData.keyBuf, tWorkerData.ivBuf))
    }

    if (inData.end && tWorkerData.keyBuf.length) {
      transforms.push(new AppendBufferTransform(buildReservedBuffer()))
    }

    const collector = new BufferCollector()

    const pipelineStreams: (
      | NodeJS.ReadableStream
      | NodeJS.WritableStream
      | NodeJS.ReadWriteStream
    )[] = [source, ...transforms, collector]

    await pipeline(pipelineStreams)

    const encrypted = collector.getBuffer()
    const slices: Buffer[] = []

    if (encrypted.length > chunkBytes) {
      slices.push(encrypted.subarray(0, chunkBytes))
      slices.push(encrypted.subarray(chunkBytes))
    } else {
      slices.push(encrypted)
    }

    let uploadedBytes = 0
    let partseq = inData.sliceNo

    for (const slice of slices) {
      await tryTimes(
        async () => {
          await httpUploadSlice(
            tWorkerData.uploadUrl,
            {
              access_token: tWorkerData.access_token,
              uploadid: tWorkerData.uploadId,
              partseq: partseq,
              path: encodeURIComponent(tWorkerData.remote),
            },
            slice
          )
        },
        {
          times: tWorkerData.tryTimes,
          delta: tWorkerData.tryDelta,
        }
      )

      uploadedBytes = uploadedBytes + slice.length
      partseq = partseq + 1
    }

    worker.sendData<IUploadExecSliceRes>('UPLOAD_EXEC_UPLOADED', {
      sliceNo: inData.sliceNo,
      bytes: uploadedBytes,
    })
  } catch (inErr) {
    worker.sendData<IThreadError>('THREAD_ERROR', { msg: (inErr as Error).message })
  }
})
