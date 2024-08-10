import axios from 'axios'
import { authCode2Token } from './src/auth/auth-code-2-token'
import { authRefreshToken } from './src/auth/auth-refresh-token'
import { fileInfo } from './src/file-info/file-info'
import { fileList } from './src/file-info/file-list'
import { fileListRecursion } from './src/file-info/file-list-recursion'
import { fileManagerCom } from './src/file-manager/file-manager-com'
import { fileManagerCopy } from './src/file-manager/file-manager-copy'
import { fileManagerCreateFolder } from './src/file-manager/file-manager-create-folder'
import { fileManagerDelete } from './src/file-manager/file-manager-delete'
import { fileManagerMove } from './src/file-manager/file-manager-move'
import { fileManagerRename } from './src/file-manager/file-manager-rename'
import { fileUploadFinish } from './src/file-upload/file-upload-finish'
import { fileUploadId } from './src/file-upload/file-upload-id'
import { fileUploadSlice } from './src/file-upload/file-upload-slice'
import { fileUploadSmall } from './src/file-upload/file-upload-small'
import { fileUploadUrl } from './src/file-upload/file-upload-url'
import { userInfo } from './src/user-info/user-info'
import { userInfoQuota } from './src/user-info/user-info-quota'

export {
  axios,
  authCode2Token,
  authRefreshToken,
  fileInfo,
  fileList,
  fileListRecursion,
  fileManagerCom,
  fileManagerCopy,
  fileManagerCreateFolder,
  fileManagerDelete,
  fileManagerMove,
  fileManagerRename,
  fileUploadFinish,
  fileUploadId,
  fileUploadSlice,
  fileUploadSmall,
  fileUploadUrl,
  userInfo,
  userInfoQuota,
}

const BaiduNetdiskAPI = {
  axios,
  authCode2Token,
  authRefreshToken,
  fileInfo,
  fileList,
  fileListRecursion,
  fileManagerCom,
  fileManagerCopy,
  fileManagerCreateFolder,
  fileManagerDelete,
  fileManagerMove,
  fileManagerRename,
  fileUploadFinish,
  fileUploadId,
  fileUploadSlice,
  fileUploadSmall,
  fileUploadUrl,
  userInfo,
  userInfoQuota,
}

export default BaiduNetdiskAPI
