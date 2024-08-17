import { AxiosRequestConfig } from 'axios'
import { IFileManagerBody, IFileManagerQuery, fileManager } from './file-manager'

export function fileManagerMove(
  query: Omit<IFileManagerQuery, 'opera'>,
  body: IFileManagerBody,
  options?: AxiosRequestConfig
) {
  return fileManager(
    Object.assign({}, query, {
      opera: 'move',
    }),
    body,
    options
  )
}
