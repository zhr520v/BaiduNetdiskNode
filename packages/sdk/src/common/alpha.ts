export const __ES__ = !(typeof module !== 'undefined' && typeof module.exports !== 'undefined')
export const __PRESV_ENC_BLOCK_SIZE__ = 32

export type PromType<T> = T extends Promise<infer A> ? A : never
