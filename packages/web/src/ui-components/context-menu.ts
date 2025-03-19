type IMenuItem = {
  item: string | number
  callback: (() => void) | (() => Promise<void>)
  children?: Array<IMenuItem>
  checked?: boolean
}

type IState = {
  opts: IContextMenu | undefined
  backupOpts: IContextMenu | undefined
  rootContainer: HTMLDivElement | undefined
  initialized: boolean
}

export type IContextMenu = {
  event: MouseEvent
  menus: Array<IMenuItem>
  onEnter?: () => void
  onCancel?: () => void
}

const state: IState = {
  opts: void 0,
  backupOpts: void 0,
  rootContainer: void 0,
  initialized: false,
}

function throttle(inFunc: () => void) {
  let canRun = true

  return () => {
    if (!canRun) {
      return
    }

    canRun = false
    setTimeout(() => (canRun = true), 100)
    inFunc()
  }
}

function cancel() {
  if (state.rootContainer) {
    document.body.removeChild(state.rootContainer)
  }

  state.rootContainer = void 0
  state.opts?.onCancel?.()
  state.opts = void 0
}

function getPosStyle(menu: IContextMenu) {
  const newStyle: { top?: string; right?: string; bottom?: string; left?: string } = {}

  if (!menu || !menu.event) {
    return newStyle
  }

  const x = menu.event.pageX
  const y = menu.event.pageY
  const clientWidth = document.documentElement.clientWidth
  const clientHeight = document.documentElement.clientHeight
  const offset = 1

  const isLeft = x - clientWidth / 2 < 0
  const isTop = y - clientHeight / 2 < 0

  let direction: 'LT' | 'LB' | 'RT' | 'RB' = 'RB'

  if (isLeft) {
    if (isTop) {
      direction = 'RB'
    } else {
      direction = 'RT'
    }
  } else {
    if (isTop) {
      direction = 'LB'
    } else {
      direction = 'LT'
    }
  }

  switch (direction) {
    case 'LT':
      newStyle.right = `${clientWidth - x + offset}px`
      newStyle.bottom = `${clientHeight - y + offset}px`
      break
    case 'LB':
      newStyle.top = `${y + offset}px`
      newStyle.right = `${clientWidth - x + offset}px`
      break
    case 'RT':
      newStyle.bottom = `${clientHeight - y + offset}px`
      newStyle.left = `${x + offset}px`
      break
    case 'RB':
      newStyle.top = `${y + offset}px`
      newStyle.left = `${x + offset}px`
      break
  }

  return newStyle
}

function createMenuNodes(inMenus: IMenuItem[]) {
  const wrapper = document.createElement('div')

  inMenus.forEach(node => {
    const nodeEle = document.createElement('div')
    nodeEle.style.position = 'relative'
    nodeEle.style.display = 'flex'
    nodeEle.style.minWidth = '150px'
    nodeEle.style.maxWidth = '400px'
    nodeEle.style.alignItems = 'center'
    nodeEle.style.overflow = 'visible'
    nodeEle.style.padding = '0 12px'
    nodeEle.style.height = '40px'

    nodeEle.addEventListener('mouseenter', () => {
      nodeEle.style.backgroundColor = 'rgba(255, 228, 196, 1)'
    })
    nodeEle.addEventListener('mouseleave', () => {
      nodeEle.style.backgroundColor = ''
    })

    const textSpan = document.createElement('span')
    textSpan.textContent = String(node.item)
    textSpan.style.overflow = 'hidden'
    textSpan.style.textOverflow = 'ellipsis'
    textSpan.style.whiteSpace = 'nowrap'
    textSpan.style.flex = '1'
    nodeEle.appendChild(textSpan)

    nodeEle.addEventListener('click', e => {
      e.preventDefault()
      e.stopPropagation()
      node.callback()
      cancel()
    })

    if (node.checked) {
      const checkedElement = document.createElement('i')
      checkedElement.style.marginLeft = '8px'
      checkedElement.classList.add('iconfont', 'icon-menuchecked')
      nodeEle.appendChild(checkedElement)
    }

    if (node.children && node.children.length > 0) {
      const rightEle = document.createElement('i')
      rightEle.style.marginLeft = '8px'
      rightEle.classList.add('iconfont', 'icon-menuright')
      nodeEle.appendChild(rightEle)

      const subContainer = document.createElement('div')
      subContainer.style.position = 'absolute'
      subContainer.style.left = '100%'
      subContainer.style.top = '0'
      subContainer.style.display = 'none'
      subContainer.style.minWidth = '150px'
      subContainer.style.maxWidth = '400px'
      subContainer.style.cursor = 'default'
      subContainer.style.overflow = 'visible'
      subContainer.style.backgroundColor = 'rgba(255, 255, 255, 1)'
      subContainer.style.boxShadow = '0px 2px 8px 0px rgba(99, 99, 99, 0.2)'

      const subNodes = createMenuNodes(node.children)

      for (const i of Array.from(subNodes.children)) {
        subContainer.appendChild(i)
      }

      nodeEle.appendChild(subContainer)

      nodeEle.addEventListener('mouseenter', () => {
        subContainer.style.display = 'block'
      })

      nodeEle.addEventListener('mouseleave', () => {
        subContainer.style.display = 'none'
      })
    }

    wrapper.appendChild(nodeEle)
  })

  return wrapper
}

function initEventListeners() {
  if (state.initialized) {
    return
  }

  window.addEventListener(
    'click',
    e => !state.rootContainer?.contains(e.target as Node) && cancel(),
    { capture: true }
  )
  window.addEventListener('scroll', throttle(cancel), { capture: true })

  state.initialized = true
}

export function showContextMenu(inOpts: IContextMenu): void {
  initEventListeners()

  if (inOpts.event) {
    inOpts.event.preventDefault()
    inOpts.event.stopPropagation()
  }

  cancel()

  state.backupOpts = state.opts
  state.opts = inOpts

  state.backupOpts?.onCancel?.()

  state.rootContainer = document.createElement('div')
  state.rootContainer.style.position = 'fixed'
  state.rootContainer.style.zIndex = '10000'
  state.rootContainer.style.minWidth = '150px'
  state.rootContainer.style.maxWidth = '400px'
  state.rootContainer.style.cursor = 'default'
  state.rootContainer.style.overflow = 'visible'
  state.rootContainer.style.backgroundColor = 'rgba(255, 255, 255, 1)'
  state.rootContainer.style.boxShadow = '0px 2px 8px 0px rgba(99, 99, 99, 0.2)'
  state.rootContainer.classList.add('context-menu')

  Object.assign(state.rootContainer.style, getPosStyle(inOpts))

  if (inOpts.menus && inOpts.menus.length > 0) {
    const menuNodes = createMenuNodes(inOpts.menus)

    for (const i of Array.from(menuNodes.children)) {
      state.rootContainer.appendChild(i)
    }
  }

  document.body.appendChild(state.rootContainer)

  state.opts?.onEnter?.()
}
