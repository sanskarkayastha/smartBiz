import { api } from './api';

export type ChatMessage = { role: 'user' | 'ai'; text: string };
export type ParsedProduct = { name: string; quantity: number; rate: number; category?: string };
export type ParsedLead = {
  name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  followUpDate: string | null;
  estimatedValue: number | null;
  source: string | null;
  stage: string;
};

export type ParsedSaleItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type ParsedSale = {
  saleDate: string;
  customerName: string | null;
  paymentMethod: 'CASH' | 'CARD' | 'DIGITAL' | 'DUE';
  items: ParsedSaleItem[];
};

export type InsightCard = {
  type: string;
  title: string;
  message: string;
  tone: string;
};

export type ImportArtifact = {
  id: number;
  kind: 'IMAGE' | 'SHEET';
  label: string | null;
  sourceIntent: string;
  createdAt: string;
};

export type ProductSuggestion = {
  productId: number;
  productName: string;
  category: string | null;
  supplier: string | null;
  score: number;
  reason: string;
};

export type ProductResolution = {
  normalizedName: string;
  sourceName: string;
  action: 'MATCH_EXISTING' | 'CREATE_NEW' | 'EXCLUDE';
  productId: number | null;
  productName: string | null;
  category: string | null;
  supplier: string | null;
  createCategory: boolean;
  createSupplier: boolean;
};

export type ImportReviewItem = {
  normalizedName: string;
  sourceName: string;
  category: string | null;
  supplier: string | null;
  quantity: number;
  rate: number;
  matchedProductId: number | null;
  matchedProductName: string | null;
};

export type ImportSalesReviewItem = {
  saleDate: string;
  customerName: string | null;
  paymentMethod: 'CASH' | 'CARD' | 'DIGITAL' | 'DUE';
  normalizedName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  matchedProductId: number | null;
  matchedProductName: string | null;
};

export type ImportSessionReview = {
  mode: 'SALES' | 'INVENTORY';
  sourceIntent: string;
  supplierName: string | null;
  candidateProducts: ImportReviewItem[];
  candidateSales: ParsedSale[];
  candidateSaleItems: ImportSalesReviewItem[];
  matchSuggestions: Record<string, ProductSuggestion[]>;
  resolutions: Record<string, ProductResolution>;
  categorySuggestions: string[];
  warnings: string[];
  insightCards: InsightCard[];
};

export type ImportSession = {
  id: number;
  status: 'ACTIVE' | 'REVIEWING' | 'COMPLETED' | 'CLOSED';
  mode: 'SALES' | 'INVENTORY';
  title: string;
  summary: string;
  lastActivityAt: string;
  closedAt: string | null;
  artifacts: ImportArtifact[];
  review: ImportSessionReview | null;
};

export type ImportCommitResult = {
  sessionId: number;
  message: string;
  createdProducts: number;
  updatedProducts: number;
  importedSales: number;
};

export type QueryAiResponse = { response: string; products?: ParsedProduct[]; sales?: ParsedSale[] };
type Attachment = { image?: string; mimeType?: string; fileText?: string; importSessionId?: number };

export const queryAi = (messages: ChatMessage[], attachment?: Attachment): Promise<QueryAiResponse> =>
  api.post('/ai/query', { messages, ...attachment }).then((r) => r.data);

export const getDailyInsight = (): Promise<string> =>
  api.get('/ai/insights').then((r) => r.data.insight);

export const getInsightCards = (): Promise<InsightCard[]> =>
  api.get('/ai/insight-cards').then((r) => r.data);

export const scanInvoice = (image: string, mimeType = 'image/jpeg'): Promise<{ products: ParsedProduct[] }> =>
  api.post('/ai/scan-invoice', { image, mimeType }).then((r) => r.data);

export const parseVoiceForLead = (text: string): Promise<ParsedLead> =>
  api.post('/ai/parse-voice', { text, intent: 'lead' }).then((r) => r.data.lead);

export const parseVoiceForProducts = (text: string): Promise<ParsedProduct[]> =>
  api.post('/ai/parse-voice', { text, intent: 'product' }).then((r) => r.data.products ?? []);

export const parseSalesFile = (fileText: string): Promise<ParsedSale[]> =>
  api.post('/ai/parse-sales-file', { fileText }).then((r) => r.data.sales ?? []);

export const createImportSession = (
  mode: 'SALES' | 'INVENTORY',
  title?: string,
  startOver = false,
): Promise<ImportSession> =>
  api.post('/ai/import-sessions', { mode, title, startOver }).then((r) => r.data);

export const getImportSession = (id: number): Promise<ImportSession> =>
  api.get(`/ai/import-sessions/${id}`).then((r) => r.data);

export const addImportArtifact = (
  sessionId: number,
  payload: {
    kind: 'IMAGE' | 'SHEET';
    label: string;
    image?: string;
    mimeType?: string;
    fileText?: string;
    sourceIntent?: string;
  },
): Promise<ImportSession> =>
  api.post(`/ai/import-sessions/${sessionId}/artifacts`, payload).then((r) => r.data);

export const analyzeImportSession = (
  sessionId: number,
  artifactId?: number,
): Promise<ImportSession> =>
  api.post(`/ai/import-sessions/${sessionId}/analyze`, artifactId ? { artifactId } : {}).then((r) => r.data);

export const reconcileImportSession = (
  sessionId: number,
  payload: {
    supplierName?: string | null;
    resolutions: ProductResolution[];
  },
): Promise<ImportSession> =>
  api.post(`/ai/import-sessions/${sessionId}/reconcile`, payload).then((r) => r.data);

export const commitImportSession = (
  sessionId: number,
  supplierName?: string | null,
): Promise<ImportCommitResult> =>
  api.post(`/ai/import-sessions/${sessionId}/commit`, { supplierName }).then((r) => r.data);

export const closeImportSession = (sessionId: number): Promise<ImportSession> =>
  api.post(`/ai/import-sessions/${sessionId}/close`).then((r) => r.data);
