import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

export function ChatWithLandlordScreen() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function findOrCreateConversation() {
      if (!user) return
      try {
        // Find tenant's linked property to get landlord_id
        const { data: tenantProfile } = await supabase
          .from('tenant_profiles')
          .select('property_id, properties(landlord_id)')
          .eq('user_id', user.id)
          .single()

        const landlordId = (tenantProfile?.properties as any)?.landlord_id
        if (!landlordId) {
          setError('You are not linked to a property yet. Scan the QR code at your property to get started.')
          setLoading(false)
          return
        }

        // Look for existing conversation between tenant and landlord
        const { data: existing } = await supabase
          .from('conversation_participants')
          .select('conversation_id, conversations!inner(id, type)')
          .eq('user_id', user.id)
          .limit(50)

        if (existing && existing.length > 0) {
          const convIds = existing.map((e: any) => e.conversation_id)
          const { data: landlordConv } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', landlordId)
            .in('conversation_id', convIds)
            .limit(1)
            .single()

          if (landlordConv) {
            setConversationId(landlordConv.conversation_id)
            setLoading(false)
            return
          }
        }

        // Create a new direct conversation
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ type: 'direct', created_by: user.id })
          .select('id')
          .single()

        if (newConv) {
          await supabase.from('conversation_participants').insert([
            { conversation_id: newConv.id, user_id: user.id },
            { conversation_id: newConv.id, user_id: landlordId },
          ])
          setConversationId(newConv.id)
        }
      } catch (e) {
        setError('Could not open chat. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    findOrCreateConversation()
  }, [user])

  // Redirect to shared ChatScreen once we have a conversation
  useEffect(() => {
    if (conversationId) {
      router.replace(`/(tabs)/messages/${conversationId}` as any)
    }
  }, [conversationId])

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1a56db" />
        <Text style={s.loadingText}>Opening chat…</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorIcon}>🏠</Text>
        <Text style={s.errorTitle}>No Property Linked</Text>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={s.scanBtn} onPress={() => router.push('/(tabs)/qr-scan' as any)}>
          <Text style={s.scanBtnText}>Scan QR Code</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Render nothing — redirect effect will take over
  return <View style={s.center}><ActivityIndicator color="#1a56db" /></View>
}

export default ChatWithLandlordScreen

const s = StyleSheet.create({
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: '#fff' },
  loadingText: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  errorIcon:   { fontSize: 48, marginBottom: 4 },
  errorTitle:  { fontSize: 18, fontWeight: '700', color: '#111827' },
  errorText:   { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  scanBtn:     { marginTop: 8, backgroundColor: '#1a56db', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  backLink:    { marginTop: 4 },
  backLinkText:{ color: '#1a56db', fontSize: 14 },
})
