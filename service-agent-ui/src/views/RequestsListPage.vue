<template>
  <v-container>
    <v-row align="center" justify="space-between" class="mb-4">
      <v-col>
        <h1>List of all requests</h1>
      </v-col>
      <v-col cols="auto">
        <v-btn
            :color="showFavorites ? 'yellow-darken-2' : 'grey'"
            :variant="showFavorites ? 'flat' : 'outlined'"
            icon
            size="small"
            @click="toggleFavorites"
            class="mr-2"
        >
          <v-icon>mdi-star</v-icon>
        </v-btn>
        <span class="text-caption">{{ showFavorites ? 'Show All' : 'Show Favorites'  }}</span>
      </v-col>
      <v-col cols="auto">
        <v-select
            v-model="itemsPerPage"
            :items="itemsPerPageOptions"
            label="Items per page"
            style="width: 120px;"
            @update:model-value="resetPagination"
        />
      </v-col>
      <v-col cols="auto">
        <v-select
            v-model="statusFilter"
            :items="statusOptions"
            label="Filter by status"
            clearable
            style="width: 150px;"
            @update:model-value="resetPagination"
            :disabled="showFavorites"
        />
      </v-col>
    </v-row>

    <v-data-table
        :headers="headers"
        :items="requests"
        :loading="loading"
        :items-per-page="itemsPerPage"
        :items-per-page-options="[]"
        item-key="_id"
        class="elevation-1"
        hide-default-footer
        disable-pagination
    >
      <template #item.favorite="{ item }">
        <v-btn
            :color="item.isFavorite ? 'yellow-darken-2' : 'grey'"
            :variant="item.isFavorite ? 'flat' : 'outlined'"
            icon
            size="small"
            @click="toggleRequestFavorite(item._id)"
            :loading="favoriteLoading[item._id]"
        >
          <v-icon>mdi-star</v-icon>
        </v-btn>
      </template>

      <template #item.status="{ item }">
        <v-chip
            :color="getStatusColor(item.status)"
            variant="tonal"
            size="small"
        >
          {{ item.status }}
        </v-chip>
      </template>

      <template #item.method="{ item }">
        <v-chip
            :color="getMethodColor(item.payload.method)"
            variant="outlined"
            size="small"
        >
          {{ item.payload.method }}
        </v-chip>
      </template>

      <template #item.createdAt="{ item }">
        {{ formatDate(item.createdAt) }}
      </template>

      <template #item.schedule="{ item }">
        {{ item.payload.schedule ? formatDate(item.payload.schedule) : 'Immediate' }}
      </template>

      <template #item.actions="{ item }">
        <v-btn
            size="small"
            variant="outlined"
            @click="viewDetails(item._id)"
        >
          Details
        </v-btn>
      </template>

      <template #no-data>
        <v-alert type="info" class="ma-2">
          {{ showFavorites ? 'No favorite requests found' : 'No requests found' }}
        </v-alert>
      </template>
    </v-data-table>

    <!-- Custom Pagination -->
    <v-row justify="center" class="mt-4">
      <v-col cols="auto">
        <v-pagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="7"
            @update:model-value="fetchRequests"
        />
      </v-col>
    </v-row>

    <!-- Pagination Info -->
    <v-row justify="center" class="mt-2">
      <v-col cols="auto">
        <span class="text-caption">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
          {{ Math.min(currentPage * itemsPerPage, totalRequests) }} of
          {{ totalRequests }} {{ showFavorites ? 'favorite' : '' }} requests
        </span>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { getStatusColor, getMethodColor, formatDate } from '@/utils/statusUtils'


interface RequestPayload {
  name: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: string
  schedule?: string
}

interface RequestItem {
  _id: string
  payload: RequestPayload
  status: string
  createdAt: string
  isFavorite: boolean
}

interface PaginationResponse {
  requests: RequestItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const router = useRouter()
const { apiCall } = useApi()

const loading = ref(false)
const requests = ref<RequestItem[]>([])
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalRequests = ref(0)
const totalPages = ref(0)
const statusFilter = ref<string | null>(null)
const showFavorites = ref(false)

const favoriteLoading = reactive<Record<string, boolean>>({})

const itemsPerPageOptions = [5, 10, 25, 50, 100]
const statusOptions = [
  { title: 'All', value: null },
  { title: 'Pending', value: 'pending' },
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Success', value: 'success' },
  { title: 'Failed', value: 'failed' }
]

const headers = [
  { title: 'Favorite', key: 'favorite', sortable: false, width: '80px' },
  { title: 'Name', key: 'payload.name', sortable: false },
  { title: 'Method', key: 'method', sortable: false },
  { title: 'URL', key: 'payload.url', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Created At', key: 'createdAt', sortable: false },
  { title: 'Schedule', key: 'schedule', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false }
]

const toggleFavorites = (): void => {
  showFavorites.value = !showFavorites.value
  resetPagination()
}

const toggleRequestFavorite = async (requestId: string): Promise<void> => {
  favoriteLoading[requestId] = true

  try {
    const request = requests.value.find(r => r._id === requestId)
    if (!request) return

    const method = request.isFavorite ? 'DELETE' : 'POST'
    const response = await apiCall(`/request/${requestId}/favorite`, {
      method
    })

    if (response.ok) {
      request.isFavorite = !request.isFavorite

      if (showFavorites.value && !request.isFavorite) {
        requests.value = requests.value.filter(r => r._id !== requestId)
        totalRequests.value = Math.max(0, totalRequests.value - 1)
        totalPages.value = Math.ceil(totalRequests.value / itemsPerPage.value)

        if (requests.value.length === 0 && currentPage.value > 1) {
          currentPage.value = currentPage.value - 1
          fetchRequests()
        }
      }
    } else {
      const errorData = await response.json()
      console.error('Failed to toggle favorite:', errorData.error)
    }
  } catch (error) {
    console.error('Error toggling favorite:', error)
  } finally {
    favoriteLoading[requestId] = false
  }
}


const fetchRequests = async (): Promise<void> => {
  loading.value = true

  try {
    let endpoint = '/request/all'

    if (showFavorites.value) {
      endpoint = '/request/favorites'
    }

    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString()
    })

    if (statusFilter.value && !showFavorites.value) {
      params.append('status', statusFilter.value)
    }

    const response = await apiCall(`${endpoint}?${params}`)

    if (!response.ok) {
      throw new Error('Failed to fetch requests')
    }

    const data: PaginationResponse = await response.json()

    requests.value = data.requests
    totalRequests.value = data.pagination.total
    totalPages.value = data.pagination.totalPages
  } catch (error) {
    console.error('Error fetching requests:', error)
  } finally {
    loading.value = false
  }
}

const resetPagination = (): void => {
  currentPage.value = 1
  fetchRequests()
}

const viewDetails = (id: string): void => {
  router.push(`/request/${id}`)
}

watch(statusFilter, () => {
  if (!showFavorites.value) {
    resetPagination()
  }
})

watch(showFavorites, () => {
  if (showFavorites.value) {
    statusFilter.value = null
  }
})

onMounted(() => {
  fetchRequests()
})
</script>