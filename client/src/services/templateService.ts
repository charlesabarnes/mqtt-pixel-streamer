import axios from 'axios';
import { Template } from '@mqtt-pixel-streamer/shared';

const API_BASE = '/api';

class TemplateService {
  async getTemplates(): Promise<Template[]> {
    const response = await axios.get(`${API_BASE}/templates`);
    return response.data;
  }

  async getTemplate(id: number): Promise<Template> {
    const response = await axios.get(`${API_BASE}/templates/${id}`);
    return response.data;
  }

  async createTemplate(template: Template): Promise<Template> {
    const response = await axios.post(`${API_BASE}/templates`, template);
    return response.data;
  }

  async updateTemplate(id: number, template: Partial<Template>): Promise<Template> {
    const response = await axios.put(`${API_BASE}/templates/${id}`, template);
    return response.data;
  }

  async deleteTemplate(id: number): Promise<void> {
    await axios.delete(`${API_BASE}/templates/${id}`);
  }

  async publishFrame(templateId: number): Promise<any> {
    const response = await axios.post(`${API_BASE}/templates/${templateId}/publish`);
    return response.data;
  }

  async getTestFrame(): Promise<any> {
    const response = await axios.get(`${API_BASE}/preview/test`);
    return response.data;
  }

  async getStatus(): Promise<any> {
    const response = await axios.get(`${API_BASE}/status`);
    return response.data;
  }

  async testPublish(): Promise<any> {
    const response = await axios.get(`${API_BASE}/test`);
    return response.data;
  }
}

export const templateService = new TemplateService();