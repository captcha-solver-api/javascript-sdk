import { ApiError, NetworkError, TimeoutError } from './exceptions.js';

export class CaptchaClient {
  constructor({
    clientKey,
    baseUrl = 'https://api.captcha-solver.com',
    timeout = 120000,
    pollingInterval = 2000
  }) {
    this.clientKey = clientKey;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.pollingInterval = pollingInterval;
  }

  async _request(endpoint, payload) {
    const url = `${this.baseUrl}${endpoint}`;
    const body = JSON.stringify(payload);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: body
      });

      if (!response.ok) {
        throw new NetworkError(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errorId !== 0) {
        throw new ApiError(
          data.errorId || data.errorCode || -1,
          data.errorDescription || data.error || 'Unknown API error'
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error.name === 'AbortError') {
        throw new TimeoutError('Request timed out');
      }
      throw new NetworkError(error.message, error);
    }
  }

  async createTask(task, languagePool = null) {
    const taskDict = task.toDict();
    const payload = {
      clientKey: this.clientKey,
      task: taskDict
    };

    if (languagePool !== null) {
      payload.languagePool = languagePool;
    }

    const response = await this._request('/createTask', payload);
    return response.taskId;
  }

  async getTaskResult(taskId) {
    const payload = {
      clientKey: this.clientKey,
      taskId: taskId
    };

    const response = await this._request('/getTaskResult', payload);
    return response;
  }

  async getBalance() {
    const payload = {
      clientKey: this.clientKey
    };

    const response = await this._request('/getBalance', payload);
    return parseFloat(response.balance);
  }

  async solve(task, languagePool = null) {
    const taskId = await this.createTask(task, languagePool);
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= this.timeout) {
        throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
      }

      const result = await this.getTaskResult(taskId);

      if (result.status === 'ready') {
        return result.solution;
      }

      if (result.status === 'error') {
        throw new ApiError(
          result.errorId || -1,
          result.errorDescription || 'Task processing error'
        );
      }

      await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
    }
  }
}