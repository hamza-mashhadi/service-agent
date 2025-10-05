export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
      return 'error'
    case 'pending':
      return 'warning'
    case 'scheduled':
      return 'info'
    default:
      return 'grey'
  }
}

export const getMethodColor = (method: string): string => {
  switch (method) {
    case 'GET':
      return 'blue'
    case 'POST':
      return 'green'
    case 'PUT':
      return 'orange'
    case 'DELETE':
      return 'red'
    case 'PATCH':
      return 'purple'
    default:
      return 'grey'
  }
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString()
}

export const formatJson = (data: any): string => {
  if (typeof data === 'string') {
    try {
      return JSON.stringify(JSON.parse(data), null, 2)
    } catch {
      return data
    }
  }
  return JSON.stringify(data, null, 2)
}