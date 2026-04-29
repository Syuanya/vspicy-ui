const TARGET_TEXTS = ['内容', '内容管理', '管理', '存储']
const CLOSE_DELAY_MS = 0

const ROOT_SELECTORS = [
  '[data-hover-dropdown]',
  '.nav-dropdown',
  '.dropdown',
  '.menu-dropdown',
  '.header-dropdown',
  '.top-nav-dropdown',
  '.nav-item',
  '.menu-item',
  '.header-nav-item',
  '.top-nav-item',
  'li',
  '.el-sub-menu'
]

const MENU_SELECTORS = [
  '[data-hover-dropdown-menu]',
  '.nav-dropdown-menu',
  '.dropdown-menu',
  '.menu-dropdown-list',
  '.header-dropdown-menu',
  '.top-nav-dropdown-menu',
  '.submenu',
  '.sub-menu',
  '.menu-panel',
  '.dropdown-panel',
  '.el-menu--popup',
  '[role="menu"]',
  'ul',
  '.children'
]

const TRIGGER_SELECTORS = [
  'button',
  'a',
  '.nav-link',
  '.menu-title',
  '.menu-label',
  '.el-sub-menu__title',
  'span',
  'div'
]

interface HoverRecord {
  root: HTMLElement
  trigger: HTMLElement
  menu: HTMLElement
  closeTimer?: number
}

const installed = new WeakSet<HTMLElement>()
let observer: MutationObserver | null = null
let scanTimer: number | undefined

export function installNavHoverDropdownFix() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  scanAndInstall()

  window.addEventListener('resize', scheduleScan, { passive: true })
  window.addEventListener('hashchange', scheduleScan)
  window.addEventListener('popstate', scheduleScan)

  observer?.disconnect()
  observer = new MutationObserver(() => scheduleScan())
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  window.setTimeout(scanAndInstall, 300)
  window.setTimeout(scanAndInstall, 1000)
  window.setTimeout(scanAndInstall, 2500)
}

function scheduleScan() {
  if (scanTimer) window.clearTimeout(scanTimer)
  scanTimer = window.setTimeout(() => {
    scanTimer = undefined
    scanAndInstall()
  }, 80)
}

function scanAndInstall() {
  const candidates = new Set<HTMLElement>()

  for (const selector of ROOT_SELECTORS) {
    document.querySelectorAll(selector).forEach((el) => {
      if (el instanceof HTMLElement) candidates.add(el)
    })
  }

  document.querySelectorAll('button,a,span,div,li').forEach((el) => {
    if (!(el instanceof HTMLElement)) return
    if (!containsTargetText(el)) return
    const root = findLikelyRoot(el)
    if (root) candidates.add(root)
  })

  candidates.forEach((root) => {
    const record = buildRecord(root)
    if (record) installRecord(record)
  })
}

function buildRecord(root: HTMLElement): HoverRecord | null {
  if (installed.has(root)) return null
  if (root === document.body || root === document.documentElement) return null

  const trigger = findTrigger(root)
  if (!trigger) return null

  if (!containsTargetText(trigger) && !containsTargetText(root)) return null

  const menu = findMenu(root, trigger)
  if (!menu) return null

  return { root, trigger, menu }
}

function installRecord(record: HoverRecord) {
  const { root, trigger, menu } = record
  installed.add(root)

  root.classList.add('vspicy-hover-dropdown')
  trigger.classList.add('vspicy-hover-trigger')
  menu.classList.add('vspicy-hover-menu')

  close(record)

  root.addEventListener('mouseenter', () => open(record), true)
  root.addEventListener('mouseleave', () => close(record), true)
  root.addEventListener('focusin', () => open(record), true)

  root.addEventListener('focusout', (event) => {
    const next = event.relatedTarget
    if (!(next instanceof Node) || !root.contains(next)) close(record)
  }, true)

  trigger.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && menu.contains(event.target)) {
      close(record)
      return
    }

    event.preventDefault()
    event.stopPropagation()
    open(record)
  }, true)

  menu.addEventListener('click', (event) => {
    const target = event.target
    if (target instanceof HTMLElement && target.closest('a,button,[role="menuitem"],.menu-item,.dropdown-item')) {
      close(record)
    }
  }, true)

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close(record)
  }, true)
}

function open(record: HoverRecord) {
  if (record.closeTimer) {
    window.clearTimeout(record.closeTimer)
    record.closeTimer = undefined
  }

  record.root.classList.add('vspicy-hover-open')
  record.menu.style.display = 'block'
  record.menu.style.visibility = 'visible'
  record.menu.style.opacity = '1'
  record.menu.style.pointerEvents = 'auto'
}

function close(record: HoverRecord) {
  if (record.closeTimer) {
    window.clearTimeout(record.closeTimer)
    record.closeTimer = undefined
  }

  const run = () => {
    record.root.classList.remove('vspicy-hover-open')
    record.menu.style.display = 'none'
    record.menu.style.visibility = 'hidden'
    record.menu.style.opacity = '0'
    record.menu.style.pointerEvents = 'none'
  }

  if (CLOSE_DELAY_MS <= 0) run()
  else record.closeTimer = window.setTimeout(run, CLOSE_DELAY_MS)
}

function findTrigger(root: HTMLElement): HTMLElement | null {
  for (const selector of TRIGGER_SELECTORS) {
    const direct = Array.from(root.children).find((child) => {
      return child instanceof HTMLElement && child.matches(selector) && containsTargetText(child)
    })
    if (direct instanceof HTMLElement) return direct
  }

  for (const selector of TRIGGER_SELECTORS) {
    const found = root.querySelector(selector)
    if (found instanceof HTMLElement && containsTargetText(found)) return found
  }

  return containsTargetText(root) ? root : null
}

function findMenu(root: HTMLElement, trigger: HTMLElement): HTMLElement | null {
  for (const selector of MENU_SELECTORS) {
    const direct = Array.from(root.children).find((child) => {
      return child instanceof HTMLElement && child !== trigger && child.matches(selector)
    })
    if (direct instanceof HTMLElement) return direct
  }

  for (const selector of MENU_SELECTORS) {
    const found = root.querySelector(selector)
    if (found instanceof HTMLElement && found !== trigger && !trigger.contains(found)) return found
  }

  const siblings = Array.from(root.children).filter((child) => child instanceof HTMLElement) as HTMLElement[]
  for (const child of siblings) {
    if (child !== trigger && looksLikeMenu(child)) return child
  }

  return null
}

function looksLikeMenu(el: HTMLElement): boolean {
  const text = normalizeText(el.textContent || '')
  if (!text) return false

  const tag = el.tagName.toLowerCase()
  if (tag === 'ul' || tag === 'ol') return true
  if (el.querySelector('a,button,[role="menuitem"],li')) return true

  const cls = el.className ? String(el.className).toLowerCase() : ''
  return cls.includes('menu')
    || cls.includes('dropdown')
    || cls.includes('popup')
    || cls.includes('panel')
    || cls.includes('submenu')
}

function findLikelyRoot(el: HTMLElement): HTMLElement | null {
  let current: Element | null = el
  let depth = 0

  while (current && current instanceof HTMLElement && depth < 6) {
    if (current.matches('[data-hover-dropdown]')) return current
    const trigger = findTrigger(current)
    if (trigger && findMenu(current, trigger) && containsTargetText(current)) return current

    current = current.parentElement
    depth++
  }

  return null
}

function containsTargetText(el: HTMLElement): boolean {
  const text = normalizeText(el.textContent || '')
  if (!text) return false

  return TARGET_TEXTS.some((target) => {
    const normalizedTarget = normalizeText(target)
    return text === normalizedTarget
      || text.startsWith(normalizedTarget)
      || text.includes(normalizedTarget)
  })
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, '').trim()
}
