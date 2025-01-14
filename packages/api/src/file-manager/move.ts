import { type AxiosRequestConfig } from 'axios'
import {
  type IFileManagerBody,
  type IFileManagerQuery,
  httpFileManager,
} from './file-manager.js'

export function httpMove(
  inQuery: Omit<IFileManagerQuery, 'opera'>,
  inBody: IFileManagerBody,
  inOpts?: AxiosRequestConfig
) {
  return httpFileManager(
    Object.assign({}, inQuery, {
      opera: 'move',
    }),
    inBody,
    inOpts
  )
}
