import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
//引入reset.css
import './assets/css/reset.css'
//引入border.css,1像素边框解决方案
import './assets/css/border.css'

import FastClick from 'fastclick'
FastClick(document.body)

import { createPinia } from 'pinia'
import piniaPersist from 'pinia-plugin-persist'
const store = createPinia()
store.use(piniaPersist)

const app = createApp(App);
app.use(store) ;
app.mount('#app');
