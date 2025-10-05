import { useTenantStore } from '@/stores/tenant'

export const useApi = () => {
  const tenantStore = useTenantStore()

  const apiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    }

    // Add tenant header if tenant is selected
    if (tenantStore.selectedTenant) {
      headers['x-tenant-id'] = tenantStore.selectedTenant
    }

    return fetch(url, {
      ...options,
      headers
    })
  }

  return {
    apiCall
  }
}