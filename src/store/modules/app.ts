import { defineStore } from 'pinia'

export default defineStore('storeApp', {
  state () {
    return {
      themeType: 'light',
      isInpt: false,
    }
  },
  getters: {
     getThemeType: (state) => state.themeType,
     getIsInpt: (state) => state.isInpt,
  },
  actions: {
     setThemeType(themeType: string){
        this.themeType = themeType
     },
     setIsInpt(isInpt: boolean){
        this.isInpt = isInpt
     }
  },
  persist: {
    enabled: true,
    strategies: [
      { storage: sessionStorage, paths: ['themeType'] },
    ],
  },
})
