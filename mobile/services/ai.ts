import { api } from './api';

export type ChatMessage = { role: 'user' | 'ai'; text: string };

export const queryAi = (messages: ChatMessage[]): Promise<string> =>
  api.post('/ai/query', { messages }).then((r) => r.data.response);

export const getDailyInsight = (): Promise<string> =>
  api.get('/ai/insights').then((r) => r.data.insight);
