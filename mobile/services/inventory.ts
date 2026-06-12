import { api } from './api';

export type Category = { id: number; name: string };

export type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number | null;
  quantity: number;
  reorderLevel: number | null;
  supplier: string | null;
  barcode?: string | null;
  imageUrl: string | null;
};

export type PagedResponse<T> = {
  content: T[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
};

export type CreateProductPayload = {
  name: string;
  sku?: string;
  category?: string;
  price: number;
  costPrice?: number;
  quantity: number;
  reorderLevel?: number;
  supplier?: string;
  barcode?: string;
};

export type ProductFilters = {
  search?: string;
  category?: string;
  stockStatus?: string;
};

export const inventoryService = {
  async getProducts(page = 0, size = 20, filters?: ProductFilters): Promise<PagedResponse<Product>> {
    const params: Record<string, string | number> = { page, size };
    if (filters?.search) params.search = filters.search;
    if (filters?.category) params.category = filters.category;
    if (filters?.stockStatus) params.stockStatus = filters.stockStatus;
    const { data } = await api.get<PagedResponse<Product>>('/inventory/products', { params });
    return data;
  },

  async getLowStockProducts(): Promise<Product[]> {
    const { data } = await api.get<Product[]>('/inventory/products/low-stock');
    return data;
  },

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const { data } = await api.post<Product>('/inventory/products', payload);
    return data;
  },

  async getProductByBarcode(barcode: string): Promise<Product> {
    const { data } = await api.get<Product>(`/inventory/products/barcode/${encodeURIComponent(barcode)}`);
    return data;
  },

  async updateProduct(id: number, payload: Partial<CreateProductPayload>): Promise<Product> {
    const { data } = await api.put<Product>(`/inventory/products/${id}`, payload);
    return data;
  },

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`/inventory/products/${id}`);
  },

  async getCategories(): Promise<Category[]> {
    const { data } = await api.get<Category[]>('/inventory/categories');
    return data;
  },

  async createCategory(name: string): Promise<Category> {
    const { data } = await api.post<Category>('/inventory/categories', { name });
    return data;
  },

  async renameCategory(id: number, name: string): Promise<Category> {
    const { data } = await api.put<Category>(`/inventory/categories/${id}`, { name });
    return data;
  },

  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/inventory/categories/${id}`);
  },
};
