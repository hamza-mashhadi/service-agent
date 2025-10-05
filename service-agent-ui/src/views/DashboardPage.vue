<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center" class="fill-height">
      <v-col cols="12" class="text-center">
        <h1 class="display-1 mb-8">Service Agent Dashboard</h1>
        <h2 class="headline mb-8 text-grey-darken-1">Select Your Tenant</h2>

        <v-row justify="center" class="mt-8">
          <v-col
            v-for="tenant in tenants"
            :key="tenant"
            cols="12"
            sm="6"
            md="4"
            lg="3"
            class="d-flex justify-center"
          >
            <v-card
              class="tenant-card tenant-card-hover"
              elevation="2"
              @click="selectTenant(tenant)"
            >
              <v-card-text class="text-center pa-6">
                <v-icon
                  :color="getTenantColor(tenant)"
                  size="64"
                  class="mb-4"
                >
                  {{ getTenantIcon(tenant) }}
                </v-icon>
                <h3 class="text-h5">{{ tenant }}</h3>
                <p class="text-caption mt-2">Click to select</p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-alert v-if="error" type="error" class="mt-8">
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTenantStore } from '@/stores/tenant'

const router = useRouter()
const tenantStore = useTenantStore()

const tenants = ref<string[]>([])
const error = ref<string | null>(null)

const getTenantIcon = (tenant: string): string => {
  const iconMap: Record<string, string> = {
    'SAP': 'mdi-domain',
    'BILD': 'mdi-newspaper',
    'WELT': 'mdi-earth',
    'default': 'mdi-office-building'
  }
  return iconMap[tenant] || iconMap.default
}

const getTenantColor = (tenant: string): string => {
  const colorMap: Record<string, string> = {
    'SAP': 'blue',
    'BILD': 'red',
    'WELT': 'green',
    'default': 'grey'
  }
  return colorMap[tenant] || colorMap.default
}

const loadTenants = (): void => {
  try {
    const tenantsEnv = import.meta.env.VITE_TENANTS || ''
    const parsedTenants = tenantsEnv.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)

    if (parsedTenants.length === 0) {
      error.value = 'No tenants configured'
      return
    }

    tenants.value = parsedTenants
    tenantStore.setAvailableTenants(parsedTenants)
  } catch (err: any) {
    error.value = 'Failed to load tenant configuration'
    console.error('Error loading tenants:', err)
  }
}

const selectTenant = (tenant: string): void => {
  tenantStore.setTenant(tenant)
  router.push('/request')
}

onMounted(() => {
  loadTenants()
})
</script>

<style scoped>
.tenant-card {
  width: 100%;
  max-width: 250px;
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.tenant-card-hover:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}

.fill-height {
  min-height: 80vh;
}
</style>