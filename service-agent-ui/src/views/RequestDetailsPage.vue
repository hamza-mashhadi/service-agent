<template>
  <v-container>
    <v-row>
      <v-col>
        <v-btn @click="goBack" variant="outlined" class="mb-4">
          <v-icon start>mdi-arrow-left</v-icon>
          Back to Status
        </v-btn>
      </v-col>
    </v-row>

    <v-card v-if="request" class="mb-4">
      <v-card-title class="d-flex align-center">
        <span>{{ request.payload.name }}</span>
        <v-spacer />
        <v-chip
            :color="getStatusColor(request.status)"
            variant="tonal"
        >
          {{ request.status }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <h3 class="mb-3">Request Details</h3>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Method</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip
                      :color="getMethodColor(request.payload.method)"
                      variant="outlined"
                      size="small"
                  >
                    {{ request.payload.method }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <v-list-item-title>URL</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">{{ request.payload.url }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <v-list-item-title>Created</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(request.createdAt) }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="request.payload.schedule">
                <v-list-item-title>Scheduled For</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(request.payload.schedule) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>

          <v-col cols="12" md="6">
            <h3 class="mb-3">Headers</h3>
            <v-card variant="outlined" v-if="request.payload.headers && Object.keys(request.payload.headers).length > 0">
              <v-card-text>
                <pre class="text-caption">{{ JSON.stringify(request.payload.headers, null, 2) }}</pre>
              </v-card-text>
            </v-card>
            <v-alert v-else type="info" variant="tonal">No headers</v-alert>
          </v-col>
        </v-row>

        <v-row v-if="request.payload.body">
          <v-col cols="12">
            <h3 class="mb-3">Request Body</h3>
            <v-card variant="outlined">
              <v-card-text>
                <pre class="text-caption">{{ formatJson(request.payload.body) }}</pre>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card v-if="request?.response">
      <v-card-title>Response</v-card-title>
      <v-card-text>
        <v-textarea
            :model-value="JSON.stringify(request.response, null, 2)"
            label="Response Data"
            readonly
            rows="20"
            auto-grow
        />
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" class="mt-4">
      {{ error }}
    </v-alert>

    <v-alert v-if="loading" type="info" class="mt-4">
      Loading request details...
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { getStatusColor, getMethodColor, formatDate, formatJson } from '@/utils/statusUtils'


interface RequestPayload {
  name: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: string
  schedule?: string
}

interface RequestDetails {
  _id: string
  payload: RequestPayload
  status: string
  createdAt: string
  response?: any
}

const router = useRouter()
const route = useRoute()
const { apiCall } = useApi()

const request = ref<RequestDetails | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const fetchRequestDetails = async (): Promise<void> => {
  const requestId = route.params.id as string

  if (!requestId) {
    error.value = 'Request ID not provided'
    loading.value = false
    return
  }

  try {
    const response = await apiCall(`/request/${requestId}`)

    if (!response.ok) {
      throw new Error('Failed to fetch request details')
    }

    const data = await response.json()
    request.value = data
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch request details'
    console.error('Error fetching request details:', err)
  } finally {
    loading.value = false
  }
}

const goBack = (): void => {
  router.push('/list')
}

onMounted(() => {
  fetchRequestDetails()
})
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>