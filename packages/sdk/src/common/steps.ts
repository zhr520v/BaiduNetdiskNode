import { EStepStatus } from '../types/enums.js'

export interface IStepItem {
  id: number
  exec: () => Promise<void>
  stop?: (inForce?: boolean) => Promise<void>
}

export interface ICurrStep {
  id: number
  stop: (inForce?: boolean) => Promise<void>
  res: () => void
  rej: (inReason?: any) => void
}

export class Steps {
  #ids: number[] = []
  #steps: IStepItem[] = []
  #status: EStepStatus = EStepStatus.CREATED
  #error: Error | null = null
  #step: ICurrStep | null = null
  #onBeforeRun: () => Promise<void> = async () => {}
  #onStatusChanged: (inNewStatus: EStepStatus) => void = () => {}

  constructor(inOpts: {
    steps: IStepItem[]
    onBeforeRun?: () => Promise<void>
    onStatusChanged?: (inNewStatus: EStepStatus) => void
  }) {
    this.#steps = inOpts.steps
    this.#onBeforeRun = inOpts.onBeforeRun || this.#onBeforeRun
    this.#onStatusChanged = inOpts.onStatusChanged || this.#onStatusChanged
  }

  async run() {
    if (this.#status === EStepStatus.FINISHED || this.#status === EStepStatus.RUNNING) {
      return
    }

    this.#error = null
    this.#setStatus(EStepStatus.RUNNING)

    await this.#onBeforeRun()

    try {
      for (const step of this.#steps) {
        if (this.#ids.includes(step.id)) {
          continue
        }

        await new Promise<void>((res, rej) => {
          this.#step = {
            id: step.id,
            stop: step.stop || (async () => {}),
            res: res,
            rej: rej,
          }

          step.exec().then(res).catch(rej)
        })

        this.#ids.push(step.id)
        this.#step = null
      }

      this.#setStatus(EStepStatus.FINISHED)
    } catch (inErr) {
      this.#error = inErr as Error
      this.#setStatus(EStepStatus.STOPPED)
    }
  }

  async stop(inForce?: boolean) {
    if (!this.#step) {
      return
    }

    try {
      await this.#step.stop(inForce)
      this.#step.rej(null)
    } catch (inErr) {
      this.#step.rej(inErr)
    }
  }

  #setStatus(inNewStatus: EStepStatus) {
    this.#status = inNewStatus
    this.#onStatusChanged(inNewStatus)
  }

  get id() {
    return this.#step?.id || 0
  }

  get status() {
    return this.#status
  }

  get error() {
    return this.#error
  }
}
