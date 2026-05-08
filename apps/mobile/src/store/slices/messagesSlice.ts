import type { StateCreator } from 'zustand'
import { messagesApi } from '@/services/api/messages.api'
import type { Conversation, Message } from '@/types'
import type { AppStore } from '../store'

export interface MessagesSlice {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Record<string, Message[]>
  messagesLoading: boolean
  messagesError: string | null
  fetchConversations: () => Promise<void>
  openConversation: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, content: string) => Promise<void>
  clearMessagesError: () => void
}

export const createMessagesSlice: StateCreator<AppStore, [], [], MessagesSlice> = (set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  messagesLoading: false,
  messagesError: null,

  fetchConversations: async () => {
    const { session } = get()
    if (!session) return
    set({ messagesLoading: true, messagesError: null })
    try {
      const conversations = await messagesApi.listConversations(session.access_token)
      set({ conversations, messagesLoading: false })
    } catch (err) {
      set({ messagesError: err instanceof Error ? err.message : 'Failed to load conversations', messagesLoading: false })
    }
  },

  openConversation: async (conversationId) => {
    const { session, conversations } = get()
    if (!session) return
    const conversation = conversations.find((c) => c.id === conversationId) ?? null
    set({ activeConversation: conversation, messagesLoading: true })
    try {
      const msgs = await messagesApi.getMessages(conversationId, session.access_token)
      set((state) => ({ messages: { ...state.messages, [conversationId]: msgs }, messagesLoading: false }))
    } catch (err) {
      set({ messagesError: err instanceof Error ? err.message : 'Failed to load messages', messagesLoading: false })
    }
  },

  sendMessage: async (conversationId, content) => {
    const { session } = get()
    if (!session) return
    const msg = await messagesApi.sendMessage(conversationId, content, session.access_token)
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), msg],
      },
    }))
  },

  clearMessagesError: () => set({ messagesError: null }),
})
