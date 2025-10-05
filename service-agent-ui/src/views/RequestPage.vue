<template>
  <v-container fluid>
    <h1 class="mb-6">Request Page</h1>

    <v-row>
      <!-- Left Column: Form -->
      <v-col cols="12" md="6">
        <v-form ref="formRef" v-model="valid" @submit.prevent="submitRequest">
          <v-text-field
              v-model="request.name"
              label="Name"
              :rules="nameRules"
              required
          />

          <v-select
              v-model="request.method"
              :items="httpMethods"
              label="Method"
              :rules="methodRules"
          />

          <v-text-field
              v-model="request.url"
              label="URL"
              :rules="urlRules"
              required
          />

          <!-- Headers Section -->
          <v-card class="my-4">
            <v-card-title>Headers</v-card-title>
            <v-card-text>
              <div v-for="(header, index) in request.headers" :key="index" class="mb-2">
                <v-row>
                  <v-col cols="5">
                    <v-text-field v-model="header.key" label="Key" dense />
                  </v-col>
                  <v-col cols="5">
                    <v-text-field v-model="header.value" label="Value" dense />
                  </v-col>
                  <v-col cols="2">
                    <v-btn icon @click="removeHeader(index)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </div>
              <v-btn text @click="addHeader">
                <v-icon left>mdi-plus</v-icon>
                Add Header
              </v-btn>
            </v-card-text>
          </v-card>

          <!-- Execution Options -->
          <v-card class="my-4">
            <v-card-title>Execution</v-card-title>
            <v-card-text>
              <v-radio-group v-model="request.execution">
                <v-radio label="Execute now" value="now" />
                <v-radio label="Schedule" value="schedule" />
              </v-radio-group>

              <v-row v-if="request.execution === 'schedule'">
                <v-col cols="12">
                  <v-menu
                      v-model="menuDate"
                      :close-on-content-click="false"
                      transition="scale-transition"
                      offset-y
                  >
                    <template #activator="{ props }">
                      <v-text-field
                          v-model="request.date"
                          label="Date"
                          readonly
                          v-bind="props"
                          dense
                          :rules="scheduleRules"
                      />
                    </template>
                    <v-date-picker
                        v-model="request.date"
                        @update:model-value="menuDate = false"
                    />
                  </v-menu>
                </v-col>

                <v-col cols="12">
                  <v-card>
                    <v-card-title>Time</v-card-title>
                    <v-card-text>
                      <v-row>
                        <v-col cols="4">
                          <v-text-field
                              v-model="request.hours"
                              label="Hours (HH)"
                              type="number"
                              min="0"
                              max="23"
                              :rules="hoursRules"
                              dense
                          />
                        </v-col>
                        <v-col cols="4">
                          <v-text-field
                              v-model="request.minutes"
                              label="Minutes (MM)"
                              type="number"
                              min="0"
                              max="59"
                              :rules="minutesRules"
                              dense
                          />
                        </v-col>
                        <v-col cols="4">
                          <v-text-field
                              v-model="request.seconds"
                              label="Seconds (SS)"
                              type="number"
                              min="0"
                              max="59"
                              :rules="secondsRules"
                              dense
                          />
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>


            </v-card-text>
          </v-card>

          <v-btn
              type="submit"
              color="primary"
              :loading="loading"
              :disabled="!valid"
              block
          >
            Submit
          </v-btn>
        </v-form>
      </v-col>

      <!-- Right Column: JSON Editor & Response -->
      <v-col cols="12" md="6">
        <!-- Status indicator for execute now requests -->
        <v-card v-if="loading && request.execution === 'now'" class="mb-4">
          <v-card-title>
            <v-progress-circular
                indeterminate
                color="primary"
                class="mr-3"
            />
            Executing Request...
          </v-card-title>
          <v-card-text>
            <p>Your request is being processed. This page will update automatically when complete.</p>
          </v-card-text>
        </v-card>

        <!-- Request Body - Only show for methods that support body -->
        <v-card v-if="methodSupportsBody" class="mb-4">
          <v-card-title>Request Body</v-card-title>
          <v-card-text>
            <v-textarea
                v-model="request.body"
                label="JSON Body"
                rows="10"
                auto-grow
            />
          </v-card-text>
        </v-card>

        <v-card v-if="response">
          <v-card-title>
            Request Status
            <v-chip
                :color="getStatusColor(response.status)"
                class="ml-2"
                small
            >
              {{ response.status }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-textarea
                :model-value="formatResponse(response)"
                label="Response Body"
                rows="8"
                readonly
            />
          </v-card-text>
        </v-card>

        <v-alert v-if="error" type="error" class="mt-4">
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>


<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { getStatusColor } from '@/utils/statusUtils'


interface Header {
  key: string
  value: string
}

interface ApiRequest {
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  headers: Header[]
  body: string
  execution: 'now' | 'schedule'
  date?: string
  hours?: string
  minutes?: string
  seconds?: string
}

const formRef = ref()
const valid = ref(false)
const loading = ref(false)
const response = ref<any>(null)
const error = ref<string | null>(null)
const menuDate = ref(false)

const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const
const methodSupportsBody = computed(() => {
  return ['POST', 'PUT', 'PATCH'].includes(request.method)
})

const { apiCall } = useApi()

const request = reactive<ApiRequest>({
  name: '',
  method: 'GET',
  url: '',
  headers: [{ key: '', value: '' }],
  body: '{}',
  execution: 'now',
  date: undefined,
  hours: '00',
  minutes: '00',
  seconds: '00'
})

// Validation rules
const nameRules = [
  (v: string) => !!v || 'Name is required',
  (v: string) => v.length >= 3 || 'Name must be at least 3 characters'
]

const methodRules = [
  (v: string) => !!v || 'Method is required'
]

const urlRules = [
  (v: string) => !!v || 'URL is required',
  (v: string) => {
    try {
      new URL(v)
      return true
    } catch {
      return 'URL must be a valid URL'
    }
  }
]

const scheduleRules = [
  (v: string) => {
    if (request.execution === 'schedule') {
      return !!v || 'Date is required when scheduling'
    }
    return true
  }
]

const hoursRules = [
  (v: string) => {
    if (request.execution === 'schedule') {
      const num = parseInt(v)
      return (num >= 0 && num <= 23) || 'Hours must be between 00-23'
    }
    return true
  }
]

const minutesRules = [
  (v: string) => {
    if (request.execution === 'schedule') {
      const num = parseInt(v)
      return (num >= 0 && num <= 59) || 'Minutes must be between 00-59'
    }
    return true
  }
]

const secondsRules = [
  (v: string) => {
    if (request.execution === 'schedule') {
      const num = parseInt(v)
      return (num >= 0 && num <= 59) || 'Seconds must be between 00-59'
    }
    return true
  }
]

const addHeader = (): void => {
  request.headers.push({ key: '', value: '' })
}

const removeHeader = (index: number): void => {
  request.headers.splice(index, 1)
}

const formatResponse = (res: any): string => {
  return JSON.stringify(res, null, 2)
}

const buildRequestPayload = () => {
  const validHeaders = request.headers
      .filter(h => h.key.trim() && h.value.trim())
      .reduce((acc, h) => {
        acc[h.key] = h.value
        return acc
      }, {} as Record<string, string>)

  let schedule: string | undefined
  if (request.execution === 'schedule' && request.date) {
    const hours = request.hours?.padStart(2, '0') || '00'
    const minutes = request.minutes?.padStart(2, '0') || '00'
    const seconds = request.seconds?.padStart(2, '0') || '00'

    // Extract date in YYYY-MM-DD format
    const dateObj = new Date(request.date)
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`

    const timeString = `${hours}:${minutes}:${seconds}`

    const localDate = new Date(`${dateString}T${timeString}`)
    schedule = localDate.toISOString()

    const now = new Date()
    if (localDate <= now) {
      throw new Error('Scheduled time must be in the future')
    }
  }

  const payload: any = {
    name: request.name,
    method: request.method,
    url: request.url,
    headers: Object.keys(validHeaders).length > 0 ? validHeaders : undefined,
    executeNow: request.execution === 'now',
    schedule
  }

  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    payload.body = request.body.trim() || undefined
  }

  return payload
}

const submitRequest = async (): Promise<void> => {
  if (!formRef.value?.validate()) return

  loading.value = true
  error.value = null
  response.value = null

  try {
    const payload = buildRequestPayload()

    const apiResponse = await apiCall('/request', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    const result = await apiResponse.json()

    if (!apiResponse.ok) {
      throw new Error(result.error || 'Failed to submit request')
    }

    response.value = result

    if (payload.executeNow) {
      await pollRequestStatus(result._id)
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to submit request'
    console.error('Failed to submit request:', err)
  } finally {
    loading.value = false
  }
}


const pollRequestStatus = async (requestId: string): Promise<void> => {
  const maxAttempts = 60
  let attempts = 0

  const poll = async (): Promise<void> => {
    try {
      attempts++

      const statusResponse = await apiCall(`/request/${requestId}`)
      const requestData = await statusResponse.json()

      if (!statusResponse.ok) {
        throw new Error('Failed to fetch request status')
      }

      response.value = requestData

      if (requestData.status === 'success' || requestData.status === 'failed') {
        console.log(`Request completed with status: ${requestData.status}`)
        return
      }

      if (attempts >= maxAttempts) {
        console.warn('Polling timeout: Request is still pending')
        return
      }

      if (requestData.status === 'pending') {
        setTimeout(poll, 5000)
      }
    } catch (err) {
      console.error('Error polling request status:', err)
      error.value = 'Failed to get request status updates'
    }
  }

  setTimeout(poll, 1000)
}



</script>