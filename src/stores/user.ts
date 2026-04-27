import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('vspicy_access_token') || ''
  }),
  actions: {
    setToken(token: string) {
      this.token = token
      localStorage.setItem('vspicy_access_token', token)
    }
  }
})
