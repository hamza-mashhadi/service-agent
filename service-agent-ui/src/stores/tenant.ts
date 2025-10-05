import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTenantStore = defineStore('tenant', () => {
  const selectedTenant = ref<string | null>(null)
  const availableTenants = ref<string[]>([])

  const setTenant = (tenant: string) => {
    selectedTenant.value = tenant
    localStorage.setItem('selectedTenant', tenant)
  }

  const clearTenant = () => {
    selectedTenant.value = null
    localStorage.removeItem('selectedTenant')
  }

  const loadTenantFromStorage = () => {
    const stored = localStorage.getItem('selectedTenant')
    if (stored) {
      selectedTenant.value = stored
    }
  }

  const setAvailableTenants = (tenants: string[]) => {
    availableTenants.value = tenants
  }

  return {
    selectedTenant,
    availableTenants,
    setTenant,
    clearTenant,
    loadTenantFromStorage,
    setAvailableTenants
  }
})