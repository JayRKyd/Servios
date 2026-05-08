import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/store/store'

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

interface MilestoneRow {
  title:       string
  description: string
  amount:      string
  due_date:    string
}

const EMPTY: MilestoneRow = { title: '', description: '', amount: '', due_date: '' }

export function SendOfferScreen() {
  const params = useLocalSearchParams<{ conversationId: string; offerId?: string }>()
  const { session } = useAuth()

  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [milestones, setMilestones]   = useState<MilestoneRow[]>([{ ...EMPTY }])
  const [saving, setSaving]           = useState(false)

  const totalCents = milestones.reduce((sum, m) => {
    const d = parseFloat(m.amount)
    return sum + (isNaN(d) ? 0 : Math.round(d * 100))
  }, 0)

  function updateMilestone(i: number, field: keyof MilestoneRow, value: string) {
    setMilestones((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  async function handleSend() {
    const valid = milestones.filter((m) => m.title.trim() && parseFloat(m.amount) > 0)
    if (!title.trim() || valid.length === 0) {
      Alert.alert('Missing info', 'Add a job title and at least one milestone with a title and amount.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API}/api/v1/conversations/${params.conversationId}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          milestones: valid.map((m) => ({
            title:        m.title.trim(),
            description:  m.description.trim() || undefined,
            amount_cents: Math.round(parseFloat(m.amount) * 100),
            due_date:     m.due_date || undefined,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        Alert.alert('Error', data.message ?? 'Failed to send offer')
        return
      }

      router.back()
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <View style={s.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Send an Offer</Text>
        </View>

        {/* Title */}
        <Text style={s.label}>Job title</Text>
        <TextInput
          style={s.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Bathroom plumbing repair"
          placeholderTextColor="#9ca3af"
        />

        {/* Scope */}
        <Text style={s.label}>Scope of work <Text style={s.optional}>(optional)</Text></Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top' }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what's included…"
          placeholderTextColor="#9ca3af"
          multiline
        />

        {/* Milestones */}
        <View style={s.milestoneHeader}>
          <Text style={s.label}>Milestones</Text>
          <TouchableOpacity onPress={() => setMilestones((p) => [...p, { ...EMPTY }])}>
            <Text style={s.addBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {milestones.map((m, i) => (
          <View key={i} style={s.milestoneCard}>
            <View style={s.milestoneCardHeader}>
              <Text style={s.milestoneNum}>Milestone {i + 1}</Text>
              {milestones.length > 1 && (
                <TouchableOpacity onPress={() => setMilestones((p) => p.filter((_, idx) => idx !== i))}>
                  <Text style={s.removeBtn}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={s.input}
              value={m.title}
              onChangeText={(v) => updateMilestone(i, 'title', v)}
              placeholder="Milestone title (e.g. Site assessment)"
              placeholderTextColor="#9ca3af"
            />

            <View style={s.amountRow}>
              <View style={s.amountBox}>
                <Text style={s.dollarSign}>$</Text>
                <TextInput
                  style={s.amountInput}
                  value={m.amount}
                  onChangeText={(v) => updateMilestone(i, 'amount', v)}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={m.due_date}
                onChangeText={(v) => updateMilestone(i, 'due_date', v)}
                placeholder="Due date (YYYY-MM-DD)"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TextInput
              style={s.input}
              value={m.description}
              onChangeText={(v) => updateMilestone(i, 'description', v)}
              placeholder="Description (optional)"
              placeholderTextColor="#9ca3af"
            />
          </View>
        ))}

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalAmount}>${(totalCents / 100).toFixed(2)}</Text>
        </View>

        <TouchableOpacity style={[s.sendBtn, saving && { opacity: 0.6 }]} onPress={handleSend} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.sendBtnText}>Send Offer →</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

export default SendOfferScreen

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#fff' },
  inner:        { padding: 20, gap: 4 },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back:         { color: '#1a56db', fontSize: 15 },
  pageTitle:    { fontSize: 20, fontWeight: '700', color: '#111827' },
  label:        { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  optional:     { fontWeight: '400', color: '#9ca3af' },
  input:        { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 4 },
  addBtn:       { color: '#1a56db', fontSize: 14, fontWeight: '600' },
  milestoneCard:{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, gap: 8, backgroundColor: '#f9fafb', marginBottom: 8 },
  milestoneCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  milestoneNum: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  removeBtn:    { fontSize: 12, color: '#ef4444' },
  amountRow:    { flexDirection: 'row', gap: 8, alignItems: 'center' },
  amountBox:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f9fafb', paddingLeft: 12, flex: 1 },
  dollarSign:   { fontSize: 14, color: '#374151', marginRight: 4 },
  amountInput:  { flex: 1, paddingVertical: 11, fontSize: 14, color: '#111827' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 8 },
  totalLabel:   { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  totalAmount:  { fontSize: 20, fontWeight: '800', color: '#1d4ed8' },
  sendBtn:      { backgroundColor: '#1a56db', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  sendBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
})
