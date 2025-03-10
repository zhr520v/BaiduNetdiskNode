import DialogComponent from '@src/ui-components/dialog.vue'
import { type IButtonType } from '@src/ui-components/types'
import { h, render } from 'vue'

interface DialogOptions {
  title?: string
  content?: string
  okText?: string
  cancelText?: string
  okType?: IButtonType
  onOk?: () => void | Promise<void>
  onCancel?: () => void | Promise<void>
}

function createDialogInstance(inOpts: DialogOptions) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const destroyDialog = () => {
    render(null, container)
    document.body.removeChild(container)
  }

  return new Promise<boolean>(resolve => {
    const handleOk = async () => {
      try {
        if (inOpts.onOk) {
          await inOpts.onOk()
        }

        resolve(true)
      } finally {
        destroyDialog()
      }
    }

    const handleCancel = async () => {
      try {
        if (inOpts.onCancel) {
          await inOpts.onCancel()
        }

        resolve(false)
      } finally {
        destroyDialog()
      }
    }

    const vnode = h(DialogComponent, {
      title: inOpts.title,
      content: inOpts.content,
      okText: inOpts.okText,
      cancelText: inOpts.cancelText,
      okType: inOpts.okType,
      onOk: handleOk,
      onCancel: handleCancel,
    })

    render(vnode, container)
  })
}

const Dialog = {
  confirm(inOpts?: DialogOptions): Promise<boolean> {
    return createDialogInstance(inOpts || {})
  },
}

export default Dialog
