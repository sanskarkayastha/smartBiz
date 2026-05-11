import { api } from './api';

export const queryAi = (question: string): Promise<string> =>
  api.post('/ai/query', { question }).then((r) => r.data.response);

export const getDailyInsight = (): Promise<string> =>
  api.get('/ai/insights').then((r) => r.data.insight);
