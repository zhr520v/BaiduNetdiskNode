export type * as AxiosTypes from 'axios'

export { type ICode2TokenQuery, type ICode2TokenRes } from './src/auth/code-2-token.js'
export { type IRefreshTokenQuery, type IRefreshTokenRes } from './src/auth/refresh-token.js'
export {
  type IFileInfoItem,
  type IFileInfoQuery,
  type IFileInfoRes,
} from './src/file-info/file-info.js'
export {
  type IFileListRecursionItem,
  type IFileListRecursionQuery,
  type IFileListRecursionRes,
} from './src/file-info/file-list-recursion.js'
export {
  type IFileListItem,
  type IFileListQuery,
  type IFileListRes,
} from './src/file-info/file-list.js'
export {
  type IFileManagerBody,
  type IFileManagerQuery,
  type IFileManagerRes,
} from './src/file-manager/file-manager.js'
export { type ITaskQueryQuery, type ITaskQueryRes } from './src/file-manager/task-query.js'
export {
  type ICreateFolderBody,
  type ICreateFolderQuery,
  type ICreateFolderRes,
} from './src/file-upload/create-folder.js'
export {
  type IUploadFinishBody,
  type IUploadFinishQuery,
  type IUploadFinishRes,
} from './src/file-upload/upload-finish.js'
export {
  type IUploadIdBody,
  type IUploadIdQuery,
  type IUploadIdRes,
} from './src/file-upload/upload-id.js'
export { type IUploadSliceQuery, type IUploadSliceRes } from './src/file-upload/upload-slice.js'
export { type IUploadSmallQuery, type IUploadSmallRes } from './src/file-upload/upload-small.js'
export { type IUploadUrlQuery, type IUploadUrlRes } from './src/file-upload/upload-url.js'
export { type IUserInfoQuery, type IUserInfoRes } from './src/user-info/user-info.js'
export { type IUserQuotaQuery, type IUserQuotaRes } from './src/user-info/user-quota.js'

export interface IBaiduApiError extends Error {
  baidu?: {
    error?: string
    error_description?: string
    errno?: number
    errmsg?: string
  } & Record<string, any>
}
