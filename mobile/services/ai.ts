import { api } from './api';

export type ChatMessage = { role: 'user' | 'ai'; text: string };
export type ParsedProduct = { name: string; quantity: number; rate: number };
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

export const queryAi = (messages: ChatMessage[]): Promise<string> =>
  api.post('/ai/query', { messages }).then((r) => r.data.response);

export const getDailyInsight = (): Promise<string> =>
  api.get('/ai/insights').then((r) => r.data.insight);

export const scanInvoice = (image: string, mimeType = 'image/jpeg'): Promise<{ products: ParsedProduct[] }> =>
  api.post('/ai/scan-invoice', { image, mimeType }).then((r) => r.data);

export const parseVoiceForLead = (text: string): Promise<ParsedLead> =>
  api.post('/ai/parse-voice', { text, intent: 'lead' }).then((r) => r.data.lead);

export const parseVoiceForProducts = (text: string): Promise<ParsedProduct[]> =>
  api.post('/ai/parse-voice', { text, intent: 'product' }).then((r) => r.data.products ?? []);
