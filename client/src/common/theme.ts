
import type { Theme } from '@aelea/ui-components-theme'


const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#ff96ba',

    message: '#171B1F',

    background: '#fff',
    horizon: '#f5f7f8',
    middleground: '#939CD6',
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

    background: '#1b181d',
    horizon: '#2d2c32',
    middleground: '#98b0c5',
    foreground: '#8d97a9',

    positive: '#38E567',
    negative: '#FA4333',
    indeterminate: '#ffc000',
  }
}


export { light, dark }

