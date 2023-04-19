import { defineStore } from 'pinia'

export default defineStore('storeUser', {
  state () {
    return {
      name: 'kids',
      token: '',
    }
  },
  getters: {
     getaccount:(state)=>state.name,
     gettoken:(state)=>state.token,
  },
  actions: {
    setName(name: string){
      this.name = name;
    },
    setToken(token: string){
      this.token = token;
    }
  },
  persist: {
    enabled: true,
    strategies: [
      { storage: sessionStorage, paths: ['name', 'age'] }, 
      { storage: localStorage, paths: ['accessToken'] }
    ],
  },
})
