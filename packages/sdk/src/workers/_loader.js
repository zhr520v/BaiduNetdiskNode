import { workerData } from 'node:worker_threads'
import { tsImport } from 'tsx/esm/api'

tsImport(workerData.__worker_filepath__, import.meta.url)
