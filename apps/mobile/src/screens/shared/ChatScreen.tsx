import { useEffect, useState, useMemo } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useMessages, useAuth } from '@/store/store'
import { useSmartReplies } from '@/hooks/useSmartReplies'
import { SmartReplySuggestions } from '@/components/shared/SmartReplySuggestions'

// ─── System event card ──────────────────────────────────────────────────────

const EVENT_META: Record<string, { icon: string; label: string; bg: string; text: string }> = {
  offer_sent:         { icon: '📋', label: 'Sent an offer',              bg: '#eff6ff', text: '#1d4ed8' },
  offer_updated:      { icon: '✏️',  label: 'Updated the offer',          bg: '#eff6ff', text: '#1d4ed8' },
  offer_accepted:     { icon: '✅', label: 'Accepted the offer',         bg: '#f0fdf4', text: '#15803d' },
  offer_declined:     { icon: '❌', label: 'Declined the offer',         bg: '#fef2f2', text: '#b91c1c' },
  payment_released:   { icon: '💸', label: 'Released payment',           bg: '#f0fdf4', text: '#15803d' },
  milestone_complete: { icon: '🏁', label: 'Marked milestone complete',  bg: '#faf5ff', text: '#7e22ce' },
}

function SystemCard({ msg, conversationId }: { msg: any; conversationId: string }) {
  const meta = EVENT_META[msg.message_type]
  if (!meta) return null

  const md  = msg.metadata ?? {}
  const isOfferEvent = ['offer_sent', 'offer_updated', 'offer_accepted', 'offer_declined'].includes(msg.message_type)

  function handleViewPress() {
    if (isOfferEvent && md.offer_id) {
      router.push((`/offer-view?conversationId=${conversationId}&offerId=${md.offer_id}`) as any)
    } else if (md.booking_id) {
      router.push((`/(tabs)/bookings/${md.booking_id}`) as any)
    }
  }

  const showLink = (isOfferEvent && md.offer_id) || md.booking_id

  return (
    <View style={[sc.card, { backgroundColor: meta.bg, borderColor: meta.text + '33' }]}>
      <Text style={[sc.icon]}>{meta.icon}</Text>
      <View style={sc.body}>
        <Text style={[sc.label, { color: meta.text }]}>
          {md.title ? `"${md.title}"` : meta.label}
        </Text>
        {(md.total_cents || md.amount_cents) && (
          <Text style={[sc.amount, { color: meta.text }]}>
            ${((md.total_cents ?? md.amount_cents) / 100).toFixed(2)}
          </Text>
        )}
      </View>
      {showLink && (
        <TouchableOpacity onPress={handleViewPress} style={sc.viewBtn}>
          <Text style={[sc.viewText, { color: meta.text }]}>
            {isOfferEvent
              ? (msg.message_type === 'offer_accepted' ? 'Contract →' : 'View →')
              : 'Details →'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const sc = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16 },
  icon:    { fontSize: 20 },
  body:    { flex: 1 },
  label:   { fontSize: 13, fontWeight: '600' },
  amount:  { fontSize: 12, marginTop: 1, fontWeight: '700' },
  viewBtn: { paddingLeft: 8 },
  viewText:{ fontSize: 12, fontWeight: '700' },
})

// ─── Main ChatScreen ────────────────────────────────────────────────────────

export function ChatScreen({ conversationId }: { conversationId: string }) {
  const { user, session } = useAuth()
  const { messages, isLoading, openConversation, sendMessage } = useMessages()
  const [text, setText] = useState('')

  const activeRole = user?.user_metadata?.active_role as string | undefined
  const isProvider = activeRole === 'provider'

  const msgs = messages[conversationId] ?? []

  useEffect(() => { openConversation(conversationId) }, [conversationId])

  // Smart replies on last incoming text message
  const lastIncoming = useMemo(
    () => msgs.filter((m: any) => m.sender_id !== user?.id && m.message_type === 'text').at(-1),
    [msgs, user?.id],
  )
  const suggestions = useSmartReplies(lastIncoming ? { lastMessage: lastIncoming.content } : null)

  async function handleSend() {
    if (!text.trim()) return
    const t = text; setText('')
    await sendMessage(conversationId, t)
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Chat</Text>

        {/* Provider: send offer */}
        {isProvider && (
          <TouchableOpacity
            style={s.offerBtn}
            onPress={() => router.push((`/send-offer?conversationId=${conversationId}`) as any)}
          >
            <Text style={s.offerBtnText}>+ Send Offer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      {isLoading ? (
        <ActivityIndicator color="#1a56db" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={msgs}
          keyExtractor={(i: any) => i.id}
          contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
          renderItem={({ item }: { item: any }) => {
            // System event card
            if (item.message_type && item.message_type !== 'text') {
              return (
                <View style={{ paddingVertical: 4 }}>
                  <SystemCard msg={item} conversationId={conversationId} />
                </View>
              )
            }

            // Regular text bubble
            const mine = item.sender_id === user?.id
            return (
              <View style={[s.bubbleRow, mine ? s.bubbleRowMine : s.bubbleRowOther]}>
                <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
                  <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{item.content}</Text>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Input */}
      <View style={s.bottomArea}>
        <SmartReplySuggestions suggestions={suggestions} onSelect={(s) => setText(s)} />
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            placeholderTextColor="#9ca3af"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={s.sendBtn} onPress={handleSend}>
            <Text style={s.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

export default ChatScreen

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f9fafb' },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  back:            { color: '#1a56db', fontSize: 15 },
  title:           { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1 },
  offerBtn:        { backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  offerBtnText:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  bubbleRow:       { paddingHorizontal: 16 },
  bubbleRowMine:   { alignItems: 'flex-end' },
  bubbleRowOther:  { alignItems: 'flex-start' },
  bubble:          { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine:      { backgroundColor: '#1a56db' },
  bubbleOther:     { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  bubbleText:      { fontSize: 15, color: '#111827' },
  bubbleTextMine:  { color: '#fff' },
  bottomArea:      { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  inputRow:        { flexDirection: 'row', padding: 12, gap: 8 },
  input:           { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  sendBtn:         { backgroundColor: '#1a56db', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9, justifyContent: 'center' },
  sendText:        { color: '#fff', fontWeight: '600', fontSize: 14 },
})
