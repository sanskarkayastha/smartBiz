export interface LoginResponse {
  access_token: string
  refresh_token: string
  userId: number
  email: string
  fullName: string
}

export interface Product {
  id: number
  userId: number
  name: string
  sku: string
  category: string
  price: number
  costPrice?: number | null
  quantity: number
  reorderLevel: number
  supplier: string
  barcode: string
  imageUrl: string
  lowStock: boolean
  createdAt: string
  updatedAt: string
}

export interface Session {
  token: string
  userId: number
  email: string
  fullName: string
}

export interface CreateProductInput {
  name: string
  category?: string
  price: number
  costPrice?: number | null
  quantity: number
  reorderLevel?: number
  supplier?: string
  sku?: string
}
