import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../views/DashboardPage.vue'
import RequestPage from '../views/RequestPage.vue'
import RequestsListPage from '../views/RequestsListPage.vue'
import RequestDetailsPage from '../views/RequestDetailsPage.vue'
import { useTenantStore } from '@/stores/tenant'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage
    },
    {
      path: '/request',
      name: 'request',
      component: RequestPage,
      meta: { requiresTenant: true }
    },
    {
      path: '/list',
      name: 'list',
      component: RequestsListPage,
      meta: { requiresTenant: true }
    },
    {
      path: '/request/:id',
      name: 'request-details',
      component: RequestDetailsPage,
      meta: { requiresTenant: true }
    }
  ]
})

// Navigation guard to check for tenant selection
router.beforeEach((to, _from, next) => {
  const tenantStore = useTenantStore()

  // Load tenant from storage if not already loaded
  if (!tenantStore.selectedTenant) {
    tenantStore.loadTenantFromStorage()
  }

  // If route requires tenant and no tenant is selected, redirect to dashboard
  if (to.meta.requiresTenant && !tenantStore.selectedTenant) {
    next('/')
    return
  }

  next()
})

export default router
