<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>Service Agent</v-app-bar-title>

      <!-- Show selected tenant -->
      <v-spacer />
      <v-chip
        v-if="tenantStore.selectedTenant"
        color="white"
        text-color="primary"
        class="mr-4"
      >
        <v-icon left small>mdi-domain</v-icon>
        {{ tenantStore.selectedTenant }}
      </v-chip>

      <!-- Navigation buttons -->
      <v-btn
        v-if="tenantStore.selectedTenant"
        text
        to="/request"
        class="mr-2"
      >
        New Request
      </v-btn>

      <v-btn
        v-if="tenantStore.selectedTenant"
        text
        to="/list"
        class="mr-2"
      >
        Requests List
      </v-btn>

      <!-- Tenant selector button -->
      <v-btn
        text
        to="/"
        @click="handleTenantChange"
      >
        {{ tenantStore.selectedTenant ? 'Change Tenant' : 'Select Tenant' }}
      </v-btn>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useTenantStore } from '@/stores/tenant'

const tenantStore = useTenantStore()

// Load tenant from storage on app start
tenantStore.loadTenantFromStorage()

const handleTenantChange = () => {}
</script>