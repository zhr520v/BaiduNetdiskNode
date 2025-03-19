interface IMessageOptions {
  type: 'info' | 'success' | 'error'
  content: string
  duration?: number
}

let msgContainer: HTMLElement | undefined = void 0

function getTypeStyle(inType: IMessageOptions['type']) {
  switch (inType) {
    case 'success':
      return {
        backgroundColor: '#f0f9eb',
        color: '#67c23a',
        border: '1px solid #e1f3d8',
      }
    case 'error':
      return {
        backgroundColor: '#fef0f0',
        color: '#f56c6c',
        border: '1px solid #fde2e2',
      }
  }

  return {
    backgroundColor: '#f4f4fd',
    color: '#409eff',
    border: '1px solid #d9ecff',
  }
}

const createMessageContainer = () => {
  if (msgContainer) {
    return msgContainer
  }

  msgContainer = document.createElement('div')
  msgContainer.style.position = 'fixed'
  msgContainer.style.top = '8px'
  msgContainer.style.right = '8px'
  msgContainer.style.left = '8px'
  msgContainer.style.zIndex = '9999'
  msgContainer.style.display = 'flex'
  msgContainer.style.flexDirection = 'column'
  msgContainer.style.alignItems = 'flex-end'
  document.body.appendChild(msgContainer)

  return msgContainer
}

const createMessage = (inProps: IMessageOptions) => {
  const typeStyle = getTypeStyle(inProps.type)

  const msgEle = document.createElement('div')
  msgEle.style.marginBottom = '8px'
  msgEle.style.padding = '4px 8px'
  msgEle.style.backgroundColor = typeStyle.backgroundColor
  msgEle.style.color = typeStyle.color
  msgEle.style.border = typeStyle.border
  msgEle.style.borderRadius = '4px'
  msgEle.style.boxShadow = '0px 2px 8px 0px rgba(99, 99, 99, 0.2)'
  msgEle.style.transition = 'all 0.3s'

  msgEle.textContent = inProps.content

  const container = createMessageContainer()
  container.insertBefore(msgEle, container.firstChild)

  setTimeout(() => {
    msgEle.style.opacity = '0'

    setTimeout(() => {
      if (msgEle.parentNode) {
        container.removeChild(msgEle)

        if (container.childNodes.length === 0 && container.parentNode) {
          document.body.removeChild(container)
          msgContainer = void 0
        }
      }
    }, 300)
  }, inProps.duration || 1000)

  return msgEle
}

const Message = {
  info(inContent: string) {
    this.custom({ content: inContent, type: 'info', duration: 1000 })
  },

  success(inContent: string) {
    this.custom({ content: inContent, type: 'success', duration: 1000 })
  },

  error(inContent: string) {
    this.custom({ content: inContent, type: 'error', duration: 2000 })
  },

  custom(inOpts: IMessageOptions) {
    createMessage(inOpts)
  },
}

export default Message
