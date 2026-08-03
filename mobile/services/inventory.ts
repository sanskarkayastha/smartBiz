import { api } from './api';

export type Category = { id: number; name: string };
export type PaymentStatus = 'PAID' | 'DUE' | 'PARTIAL';

export type ProductImageFile = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export type ProductImageConfirmation = {
  publicId: string;
  version: number;
  signature: string;
};

type ProductImageUploadSignature = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  uploadPreset: string;
};

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
  paymentStatus?: PaymentStatus;
  amountPaidNow?: number;
};

export type RestockProductPayload = {
  quantityAdded: number;
  unitCost: number;
  supplier?: string;
  paymentStatus: PaymentStatus;
  amountPaidNow?: number;
  note?: string;
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

  async restockProduct(id: number, payload: RestockProductPayload): Promise<Product> {
    const { data } = await api.post<Product>(`/inventory/products/${id}/restock`, payload);
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

  async requestImageUploadSignature(productId: number): Promise<ProductImageUploadSignature> {
    const { data } = await api.post<ProductImageUploadSignature>(`/inventory/products/${productId}/image/signature`);
    return data;
  },

  async uploadImageToCloudinary(
    file: ProductImageFile,
    upload: ProductImageUploadSignature,
  ): Promise<ProductImageConfirmation> {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.fileName, type: file.mimeType } as unknown as Blob);
    formData.append('api_key', upload.apiKey);
    formData.append('timestamp', String(upload.timestamp));
    formData.append('signature', upload.signature);
    formData.append('public_id', upload.publicId);
    formData.append('upload_preset', upload.uploadPreset);

    const response = await fetch(upload.uploadUrl, { method: 'POST', body: formData });
    const data = await response.json().catch(() => ({})) as {
      public_id?: string;
      version?: number;
      signature?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.public_id || !data.version || !data.signature) {
      throw new Error(data.error?.message ?? 'Image upload failed.');
    }
    return { publicId: data.public_id, version: data.version, signature: data.signature };
  },

  async attachProductImage(productId: number, image: ProductImageConfirmation): Promise<Product> {
    const { data } = await api.put<Product>(`/inventory/products/${productId}/image`, image);
    return data;
  },

  async removeProductImage(productId: number): Promise<Product> {
    const { data } = await api.delete<Product>(`/inventory/products/${productId}/image`);
    return data;
  },

  async discardProductImage(productId: number, image: ProductImageConfirmation): Promise<void> {
    await api.post(`/inventory/products/${productId}/image/discard`, image);
  },
};

export function cloudinaryImageUrl(src: string, size: number) {
  if (!src.includes('/image/upload/')) return src;
  return src.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_fill,g_auto,w_${size},h_${size}/`);
}
