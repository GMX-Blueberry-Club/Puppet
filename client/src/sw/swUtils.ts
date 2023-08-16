import { fromCallback } from "@aelea/core"
import { Stream } from "@most/types"
import { registerSW } from "virtual:pwa-register"


export const newUpdateInvoke: Stream<() => void> = fromCallback(cb => {
  const reloadCb = registerSW({
    async onNeedRefresh() {
      // @ts-ignore
      if (SW_DEV) {
        return
      }

      cb(() => reloadCb(true))


      // const confirm = window.confirm('new update is pending, click Ok to reload')

      // if (confirm) {
      //   await reload(true)
      //   console.log('Done reloading')
      // }

    // if (reloadSW === 'true') {
    //   setInterval(async () => {
    //   }, 20000 /* 20s for testing purposes */)
    // }
    }
  })
})

// const worker = new Wroker()


// const date = '__DATE__'

// worker.addEventListener('message', async (msg) => {
  
// })