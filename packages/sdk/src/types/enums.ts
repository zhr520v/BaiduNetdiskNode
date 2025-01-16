export const enum EUploadRtype {
  FAIL = 0,
  RENAME = 1,
  DIFF_RENAME = 2,
  OVERWRITE = 3,
}

export const enum EFileManageOndup {
  FAIL = 'fail',
  OVERWRITE = 'overwrite',
  NEWCOPY = 'newcopy',
  SKIP = 'skip',
}

export const enum EFileManageAsync {
  SYNC = 0,
  ADAPTIVE = 1,
  ASYNC = 2,
}

export const enum EStepStatus {
  CREATED = 0,
  RUNNING = 1,
  STOPPED = 2,
  FINISHED = 3,
}

export const enum EUploadSteps {
  GET_FILE_INFO = 1,
  GET_LOCAL_MD5 = 2,
  GET_UPLOAD_ID = 3,
  UPLOAD_SLICES = 4,
  COMBINE = 5,
  PRE_DOWNLOAD_INFO = 6,
  VERIFY_DOWNLOAD = 7,
  FINISH = 8,
}

export const enum EDownloadSteps {
  GET_FSID_WITH_PATH = 1,
  GET_DLINK_WITH_FSID = 2,
  CHECK_DOWNLOAD_INFO = 3,
  GET_DECRYPT_INFO = 4,
  PREPARE_FOR_DOWNLOAD = 5,
  DOWNLOAD_SLICES = 6,
  CHECK_MD5_DISK = 7,
  SET_LOCAL_MTIME = 8,
  DOWNLOAD_FINISH = 9,
}
