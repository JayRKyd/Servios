import { apiRequest } from './client'
import type { Conversation, Message } from '@/types'

export const messagesApi = {
  async listConversations(token: string): Promise<Conversation[]> {
    return apiRequest<Conversation[]>('/api/v1/messages/conversations', { token })
  },

  async getMessages(conversationId: string, token: string): Promise<Message[]> {
    return apiRequest<Message[]>(`/api/v1/messages/conversations/${conversationId}/messages`, { token })
  },

  async sendMessage(
    conversationId: string,
    content: string,
    token: string
  ): Promise<Message> {
    return apiRequest<Message>(`/api/v1/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      token,
      body: JSON.stringify({ content }),
    })
  },

  async startConversation(
    recipientId: string,
    content: string,
    token: string,
    context?: { booking_id?: string; maintenance_request_id?: string }
  ): Promise<{ conversation: Conversation; message: Message }> {
    return apiRequest('/api/v1/messages/conversations', {
      method: 'POST',
      token,
      body: JSON.stringify({ recipient_id: recipientId, content, ...context }),
    })
  },
}
