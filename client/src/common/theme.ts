
import type { Theme } from '@aelea/ui-components-theme'


const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#ff96ba',

    message: '#171B1F',

    background: '#ffffff',
    horizon: '#ecf3fc',
    middleground: '#edf5ff',
    foreground: '#51585f',

    positive: '#0cab00',
    negative: '#ea004c',
    indeterminate: '#F6964C',
  }
}

const dark: Theme = {
  name: 'dark',
  pallete: {
    primary: '#964565',

    message: '#ffffff',

    background: '#101217',
    horizon: '#292c37',
    middleground: '#1d202b',
    foreground: '#94a4c2',

    positive: '#38E567',
    negative: '#FA4333',
    indeterminate: '#ffc000',
  }
}


export { light, dark }

