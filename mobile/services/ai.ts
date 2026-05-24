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

export type QueryAiResponse = { response: string; products?: ParsedProduct[] };
type Attachment = { image?: string; mimeType?: string; fileText?: string };

export const queryAi = (messages: ChatMessage[], attachment?: Attachment): Promise<QueryAiResponse> =>
  api.post('/ai/query', { messages, ...attachment }).then((r) => r.data);

export const getDailyInsight = (): Promise<string> =>
  api.get('/ai/insights').then((r) => r.data.insight);

export const scanInvoice = (image: string, mimeType = 'image/jpeg'): Promise<{ products: ParsedProduct[] }> =>
  api.post('/ai/scan-invoice', { image, mimeType }).then((r) => r.data);

export const parseVoiceForLead = (text: string): Promise<ParsedLead> =>
  api.post('/ai/parse-voice', { text, intent: 'lead' }).then((r) => r.data.lead);

export const parseVoiceForProducts = (text: string): Promise<ParsedProduct[]> =>
  api.post('/ai/parse-voice', { text, intent: 'product' }).then((r) => r.data.products ?? []);
