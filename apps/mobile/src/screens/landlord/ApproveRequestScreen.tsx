import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useProperties, useAuth } from '@/store/store'

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low:      { bg: '#f0fdf4', text: '#16a34a' },
  medium:   { bg: '#fefce8', text: '#a16207' },
  high:     { bg: '#fff7ed', text: '#c2410c' },
  urgent:   { bg: '#fef2f2', text: '#b91c1c' },
}

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export function ApproveRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { selectedMaintenance: req, fetchMaintenanceRequest } = useProperties()
  const { session } = useAuth()
  const [budgetText, setBudgetText] = useState('')
  const [notes, setNotes] = useState('')
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    if (id) fetchMaintenanceRequest(id)
  }, [id])

  if (!req) {
    return <ActivityIndicator color="#1a56db" style={{ flex: 1, marginTop: 100 }} />
  }

  const priorityStyle = PRIORITY_COLORS[req.priority] ?? { bg: '#f3f4f6', text: '#6b7280' }
  const isBusy = approving || rejecting

  async function handleApprove() {
    setApproving(true)
    try {
      const res = await fetch(`${API}/api/v1/maintenance/${req!.id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          budget: budgetText ? parseFloat(budgetText) * 100 : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.message ?? 'Failed to approve')
      }
      Alert.alert('Request Approved', 'The repair has been approved and will be assigned to a provider.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to approve request')
    } finally {
      setApproving(false)
    }
  }

  async function handleReject() {
    Alert.alert(
      'Reject Request?',
      'The tenant will be notified that this request has been declined.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setRejecting(true)
            try {
              await fetch(`${API}/api/v1/maintenance/${req!.id}/reject`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.access_token}` },
              })
              router.back()
            } catch {
              Alert.alert('Error', 'Failed to reject request')
            } finally {
              setRejecting(false)
            }
          },
        },
      ],
    )
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Approve Request</Text>
      </View>

      {/* Request summary */}
      <View style={s.card}>
        <Text style={s.requestTitle}>{req.title}</Text>
        {req.description ? <Text style={s.requestDesc}>{req.description}</Text> : null}
        <View style={s.tags}>
          <View style={[s.priorityTag, { backgroundColor: priorityStyle.bg }]}>
            <Text style={[s.priorityText, { color: priorityStyle.text }]}>
              {req.priority?.toUpperCase() ?? 'NORMAL'} PRIORITY
            </Text>
          </View>
          {req.category ? (
            <View style={s.categoryTag}>
              <Text style={s.categoryText}>{req.category}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Budget */}
      <View style={s.card}>
        <Text style={s.fieldLabel}>Approved Budget (£) <Text style={s.optional}>optional</Text></Text>
        <TextInput
          style={s.input}
          value={budgetText}
          onChangeText={setBudgetText}
          keyboardType="decimal-pad"
          placeholder="e.g. 150.00"
          placeholderTextColor="#9ca3af"
        />
        <Text style={s.fieldHint}>Leave blank to use auto-approval threshold from settings.</Text>
      </View>

      {/* Notes to provider */}
      <View style={s.card}>
        <Text style={s.fieldLabel}>Notes for Provider <Text style={s.optional}>optional</Text></Text>
        <TextInput
          style={[s.input, s.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any access instructions, specific requirements…"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.rejectBtn, isBusy && s.dim]}
          onPress={handleReject}
          disabled={isBusy}
        >
          {rejecting
            ? <ActivityIndicator size="small" color="#ef4444" />
            : <Text style={s.rejectBtnText}>Decline</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.approveBtn, isBusy && s.dim]}
          onPress={handleApprove}
          disabled={isBusy}
        >
          {approving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.approveBtnText}>✓ Approve</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

export default ApproveRequestScreen

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  inner:        { padding: 20, paddingBottom: 40 },
  topBar:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 36, marginBottom: 20 },
  back:         { color: '#1a56db', fontSize: 15 },
  title:        { fontSize: 20, fontWeight: '700', color: '#111827' },
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  requestTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  requestDesc:  { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 },
  tags:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  priorityTag:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  priorityText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  categoryTag:  { backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  optional:     { fontWeight: '400', color: '#9ca3af' },
  input:        { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  multiline:    { minHeight: 80, paddingTop: 10 },
  fieldHint:    { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  actions:      { flexDirection: 'row', gap: 12, marginTop: 8 },
  approveBtn:   { flex: 2, backgroundColor: '#1a56db', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  approveBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  rejectBtn:    { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: '#ef4444', paddingVertical: 14, alignItems: 'center' },
  rejectBtnText:{ color: '#ef4444', fontWeight: '600', fontSize: 15 },
  dim:          { opacity: 0.5 },
})
