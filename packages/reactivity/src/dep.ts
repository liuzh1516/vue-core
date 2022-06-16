import { ReactiveEffect, trackOpBit } from './effect'

export type Dep = Set<ReactiveEffect> & TrackedMarkers

/**
 * wasTracked and newTracked maintain the status for several levels of effect
 * tracking recursion. One bit per level is used to define whether the dependency
 * was/is tracked.
 */
type TrackedMarkers = {
  /**
   * wasTracked
   */
  w: number
  /**
   * newTracked
   */
  n: number
}

export const createDep = (effects?: ReactiveEffect[]): Dep => {
  const dep = new Set<ReactiveEffect>(effects) as Dep
  dep.w = 0
  dep.n = 0
  return dep
}

//lzh：wasTracked代表对于当前effect来说，他所监听的某个property的dep，之前已经追踪过当前effect了
export const wasTracked = (dep: Dep): boolean => (dep.w & trackOpBit) > 0
//lzh：newTracked代表对于当前effect来说，他所监听的某个property的dep，在当前effect的fn内层级（不算嵌套的property），已经追踪过当前effect了
export const newTracked = (dep: Dep): boolean => (dep.n & trackOpBit) > 0

export const initDepMarkers = ({ deps }: ReactiveEffect) => {
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      //lzh：标记dep的（trackOpBit二进制的值为1的位）也为1，以表示在trackOpBit层已收集过activeEffect
      deps[i].w |= trackOpBit // set was tracked
    }
  }
}

export const finalizeDepMarkers = (effect: ReactiveEffect) => {
  const { deps } = effect
  if (deps.length) {
    let ptr = 0
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i]
      //lzh：疑问？这个地方什么情况下会发生，属于unbelievable的情况吧
      if (wasTracked(dep) && !newTracked(dep)) {
        dep.delete(effect)
      } else {
        deps[ptr++] = dep
      }
      // clear bits
      //lzh：这个地方不清除的话没关系吧，因为基于wasTracked和newTracked都是基于trackOpBit的按位与，trackOpBit会在每层effect run结束后回退
      //退回后上一个位就是0，虽然dep.w/n的上一个位还是1（未清除trackOpBit按位或的影响），按位与的时候只要一个是0，结果就是0
      dep.w &= ~trackOpBit
      dep.n &= ~trackOpBit
    }
    deps.length = ptr
  }
}
