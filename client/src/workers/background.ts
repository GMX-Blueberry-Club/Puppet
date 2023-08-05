export const msg = 'pong'
export const mode = process.env.NODE_ENV

let counter = 1

self.onmessage = (e) => {
  if (e.data === 'ping') {
    self.postMessage({ msg: `${msg} - ${counter++}`, mode })
  }
  else if (e.data === 'clear') {
    counter = 1
    self.postMessage({ msg: null, mode: null })
  }
}