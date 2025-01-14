import { type AxiosRequestConfig } from 'axios'
import {
  type IFileManagerBody,
  type IFileManagerQuery,
  httpFileManager,
} from './file-manager.js'

export function httpRename(
  inQuery: Omit<IFileManagerQuery, 'opera'>,
  inBody: IFileManagerBody,
  inOpts?: AxiosRequestConfig
) {
  return httpFileManager(
    Object.assign({}, inQuery, {
      opera: 'rename',
    }),
    inBody,
    inOpts
  )
}
