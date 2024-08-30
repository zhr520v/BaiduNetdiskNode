export const __ES__ = !(typeof module !== 'undefined' && typeof module.exports !== 'undefined')
export const __PRESV_ENC_BLOCK_SIZE__ = 32

export type PromType<T> = T extends Promise<infer A> ? A : never

export const __UPLOAD_THREADS__ = 1
export const __DOWNLOAD_THREADS__ = 1
export const __TRY_TIMES__ = 3
export const __TRY_DELTA__ = 3000
