import { AxiosRequestConfig } from 'axios'
import { IFileManagerBody, IFileManagerQuery, fileManager } from './file-manager'

export function fileManagerCopy(
  query: Omit<IFileManagerQuery, 'opera'>,
  body: IFileManagerBody,
  options?: AxiosRequestConfig
) {
  return fileManager(
    Object.assign({}, query, {
      opera: 'copy',
    }),
    body,
    options
  )
}
