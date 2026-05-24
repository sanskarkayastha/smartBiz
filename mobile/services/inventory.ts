import { api } from './api';

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
};

export const inventoryService = {
  async getProducts(page = 0, size = 20): Promise<PagedResponse<Product>> {
    const { data } = await api.get<PagedResponse<Product>>('/inventory/products', {
      params: { page, size },
    });
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

  async updateProduct(id: number, payload: Partial<CreateProductPayload>): Promise<Product> {
    const { data } = await api.put<Product>(`/inventory/products/${id}`, payload);
    return data;
  },

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`/inventory/products/${id}`);
  },
};
