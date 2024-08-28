// @ts-ignore
import { tsImport } from 'tsx/esm/api'
import { workerData } from 'worker_threads'

tsImport(workerData.__worker_filepath__, import.meta.url)
