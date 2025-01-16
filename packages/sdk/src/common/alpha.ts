/**
 * 00000000 00000000   00000000 00000000   0000 0000       0000        0000
 *     16:AESIV          16:MD5Middle      8:RawSize    4:ChunkMB    4:Verify
 */
export const __PRESV_ENC_BLOCK_SIZE__ = 48

export type PromType<T> = T extends Promise<infer A> ? A : never

export const __UPLOAD_THREADS__ = 1
export const __DOWNLOAD_THREADS__ = 1
export const __TRY_TIMES__ = 3
export const __TRY_DELTA__ = 3000
