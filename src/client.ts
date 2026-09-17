import { ApiError, NetworkError, TimeoutError, ValidationError } from './exceptions.js';
import { __version__ } from './version.js';
import type { BaseTask } from './tasks.js';

export interface CaptchaClientOptions { clientKey: string; baseUrl?: string; timeout?: number; pollingInterval?: number; }
export interface TaskResult { errorId: number; status?: 'processing' | 'ready'; solution?: Record<string, unknown>; [key: string]: unknown; }

export class CaptchaClient {
  clientKey: string; baseUrl: string; timeout: number; pollingInterval: number;
  constructor({ clientKey, baseUrl = 'https://api.captcha-solver.com', timeout = 120000, pollingInterval = 5000 }: CaptchaClientOptions) {
    if (!clientKey) throw new ValidationError('clientKey is required');
    this.clientKey = clientKey; this.baseUrl = baseUrl; this.timeout = timeout; this.pollingInterval = pollingInterval;
  }
  async _request(endpoint: string, payload: Record<string, unknown>): Promise<TaskResult> {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-SDK': `javascript-sdk/${__version__}` }, body: JSON.stringify(payload), signal: controller.signal });
      if (!response.ok) throw new NetworkError(`HTTP error: ${response.status} ${response.statusText}`);
      const data = await response.json() as TaskResult & { errorCode?: string; errorDescription?: string; error?: string };
      if (data.errorId !== 0) throw new ApiError(data.errorCode || 'UNKNOWN_ERROR', data.errorDescription || data.error || 'Unknown API error');
      return data;
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) throw error;
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
      throw new NetworkError(error instanceof Error ? error.message : String(error), error);
    } finally { clearTimeout(timer); }
  }
  async createTask(task: BaseTask, languagePool: string | null = null): Promise<number> {
    const payload: Record<string, unknown> = { clientKey: this.clientKey, task: task.toDict() }; if (languagePool !== null) payload.languagePool = languagePool;
    return (await this._request('/createTask', payload)).taskId as number;
  }
  getTaskResult(taskId: number): Promise<TaskResult> { return this._request('/getTaskResult', { clientKey: this.clientKey, taskId }); }
  async getBalance(): Promise<number> { return Number((await this._request('/getBalance', { clientKey: this.clientKey })).balance); }
  async solve(task: BaseTask, languagePool: string | null = null): Promise<Record<string, unknown>> {
    const taskId = await this.createTask(task, languagePool); const startedAt = Date.now();
    while (true) {
      const remaining = this.timeout - (Date.now() - startedAt); if (remaining <= 0) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
      await new Promise(resolve => setTimeout(resolve, Math.min(this.pollingInterval, remaining)));
      if (Date.now() - startedAt >= this.timeout) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
      const result = await this.getTaskResult(taskId); if (result.status === 'ready') return result.solution || {};
    }
  }
}
