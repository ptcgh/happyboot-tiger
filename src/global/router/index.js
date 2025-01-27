import { createRouter, createWebHashHistory } from 'vue-router'
import routes, { beforeEachHandler, afterEachHandler } from './config'
import happyFramework from '../framework'
import { upgradeRouter } from 'happykit'
import framework from "@/global/framework";
import {defineComponent, h, markRaw, reactive, ref, watch} from "vue"
import LoadPlaceholder from '@/views/home/load-placeholder'
const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHashHistory(),
  routes // short for `routes: routes`
})

// 升级路
const happyKitRouter = upgradeRouter(happyFramework, router)

router.beforeEach(beforeEachHandler)
router.afterEach(afterEachHandler)


// 缓存
export const cached = reactive({})
export const includes = ref([])
// when tabs changed, calc the includes
watch(
    () => cached,
    () => {
      // delay update, because of current component's onUnmounted callback
      requestIdleCallback(() => {
        const tmp = []
        for (let cachedKey in cached) {
          if (cached[cachedKey].isKeepalive){
            tmp.push(cachedKey)
          }
        }
        includes.value = tmp
      })
    },{
      deep:true
    })

const currentMenuRoute = framework.getCurrentMenuRoute()
router.afterEach(to => {
  if (!currentMenuRoute.value){
    return
  }
  const isKeepalive = to.meta.isKeepalive || false
  const pageId = currentMenuRoute.value?.pageId
  if (cached[pageId]){
    return
  }
  cached[pageId] = {
    pageId,
    isKeepalive,
    component:null,
  }
  // console.log('到达目标',`页面ID=${currentMenuRoute.value?.pageId}`,to)
})

export function reDefineComponent(Component,route){
  if (!Component){
    return null
  }
  // console.log(`页面ID=${currentMenuRoute.value?.pageId}`,'当前路由==>',route)
  // if (!currentMenuRoute.value){
  //   return null
  // }
  // const isKeepalive = route.meta.isKeepalive
  //
  //
  const current = currentMenuRoute.value
  if (!current){
    return null
  }
  //
  // if (isKeepalive !== true){
  //   return h(Component,{key:current.pageId})
  // }

  const pageId = current.pageId
  const componentCache = cached[pageId]
  if (componentCache){
    if (componentCache.component){
      return h(componentCache.component,{key:current.pageId})
    }
  }

  const newComponent = markRaw(defineComponent({
    name: pageId,
    render: () => Component,
  }))

  // FIX:切换路由缓存容器中组件可能不存在
  if (!cached[pageId]){
    return h(LoadPlaceholder)
  }

  cached[pageId].component = newComponent
  return h(newComponent,{key:current.pageId})
}

export function removeComponentCache(pageId){
  delete cached[pageId]
}

export default happyKitRouter
