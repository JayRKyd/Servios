import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

type Stage = 'form' | 'submitting' | 'sent'

interface StatusUpdate {
  label: string
  time: string
  done: boolean
}

export function EmergencyReportScreen() {
  const { user, session } = useAuth()
  const [stage, setStage] = useState<Stage>('form')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([])
  const [requestStatus, setRequestStatus] = useState<string>('pending')

  // Poll for status changes after submission
  useEffect(() => {
    if (!requestId || stage !== 'sent') return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('maintenance_requests')
        .select('status, approved_at, updated_at')
        .eq('id', requestId)
        .single()
      if (data && data.status !== requestStatus) {
        setRequestStatus(data.status)
        setStatusUpdates(prev => [
          ...prev,
          {
            label: statusLabel(data.status),
            time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            done: true,
          },
        ])
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [requestId, stage, requestStatus])

  function statusLabel(s: string) {
    const map: Record<string, string> = {
      pending:    'Landlord notified — awaiting response',
      approved:   'Approved — provider being assigned',
      in_progress:'Provider en route',
      resolved:   'Issue resolved',
    }
    return map[s] ?? s
  }

  async function handleSubmit() {
    if (!title.trim()) { Alert.alert('Required', 'Please describe the emergency.'); return }
    if (!session?.access_token || !user) return

    // Get tenant's linked property
    const { data: tenantProfile } = await supabase
      .from('tenant_profiles')
      .select('property_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantProfile?.property_id) {
      Alert.alert(
        'No Property Linked',
        'You need to be linked to a property to report an emergency. Scan the QR code at your property first.',
        [
          { text: 'Scan QR Code', onPress: () => router.push('/(tabs)/qr-scan' as any) },
          { text: 'Cancel', style: 'cancel' },
        ]
      )
      return
    }

    setStage('submitting')

    try {
      const res = await fetch(`${API}/api/v1/maintenance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: tenantProfile.property_id,
          title: title.trim(),
          description: description.trim() || title.trim(),
          priority: 'emergency',
        }),
      })

      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.message ?? 'Failed to submit')
      }

      const { request } = await res.json()
      setRequestId(request.id)
      setStatusUpdates([
        {
          label: '🚨 Emergency reported — landlord alerted',
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          done: true,
        },
      ])
      setStage('sent')
    } catch (e) {
      setStage('form')
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit emergency request')
    }
  }

  if (stage === 'form') {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={s.emergencyBadge}>
          <Text style={s.emergencyIcon}>🚨</Text>
          <Text style={s.emergencyTitle}>Emergency Report</Text>
        </View>

        <View style={s.lifeSafetyBox}>
          <Text style={s.lifeSafetyText}>
            ⚠️ For life-threatening emergencies — fire, gas leak, flooding — call <Text style={s.bold}>999</Text> immediately.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>What is the emergency? <Text style={s.req}>*</Text></Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Boiler failure, burst pipe, no heating"
            placeholderTextColor="#9ca3af"
          />

          <Text style={[s.label, s.mt]}>Additional details <Text style={s.opt}>optional</Text></Text>
          <TextInput
            style={[s.input, s.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Any extra information that will help the landlord respond…"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit}>
          <Text style={s.submitBtnText}>🚨 Alert Landlord Now</Text>
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          Your landlord will receive an immediate push notification. This will be logged as an emergency maintenance request.
        </Text>
      </ScrollView>
    )
  }

  if (stage === 'submitting') {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={s.submittingText}>Alerting your landlord…</Text>
      </View>
    )
  }

  // stage === 'sent'
  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <View style={s.sentHeader}>
        <Text style={s.sentIcon}>📢</Text>
        <Text style={s.sentTitle}>Landlord Alerted</Text>
        <Text style={s.sentSub}>Your landlord has received an emergency notification and will respond shortly.</Text>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Status Updates</Text>
        {statusUpdates.map((u, i) => (
          <View key={i} style={s.statusRow}>
            <View style={[s.statusDot, u.done && s.statusDotDone]} />
            <View style={s.statusInfo}>
              <Text style={s.statusLabel}>{u.label}</Text>
              <Text style={s.statusTime}>{u.time}</Text>
            </View>
          </View>
        ))}
        {requestStatus === 'pending' && (
          <View style={s.statusRow}>
            <ActivityIndicator size="small" color="#9ca3af" style={{ marginRight: 12 }} />
            <Text style={s.statusLabel}>Waiting for landlord response…</Text>
          </View>
        )}
      </View>

      <View style={s.emergencyServicesCard}>
        <Text style={s.emergencyServicesTitle}>Emergency Services</Text>
        {[
          { label: 'Police / Fire / Ambulance', number: '999' },
          { label: 'Gas Emergency', number: '0800 111 999' },
          { label: 'Non-emergency Police', number: '101' },
        ].map(({ label, number }) => (
          <View key={number} style={s.serviceRow}>
            <Text style={s.serviceLabel}>{label}</Text>
            <Text style={s.serviceNumber}>{number}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/(tabs)' as any)}>
        <Text style={s.doneBtnText}>Return to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

export default EmergencyReportScreen

const s = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f9fafb' },
  inner:                { padding: 20, paddingBottom: 40 },
  center:               { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#f9fafb' },
  submittingText:       { fontSize: 16, color: '#ef4444', fontWeight: '600' },
  header:               { paddingTop: 36, marginBottom: 20 },
  back:                 { color: '#1a56db', fontSize: 15 },
  emergencyBadge:       { alignItems: 'center', gap: 8, marginBottom: 20 },
  emergencyIcon:        { fontSize: 52 },
  emergencyTitle:       { fontSize: 26, fontWeight: '800', color: '#b91c1c' },
  lifeSafetyBox:        { backgroundColor: '#fff7ed', borderRadius: 12, padding: 14, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  lifeSafetyText:       { fontSize: 14, color: '#92400e', lineHeight: 20 },
  bold:                 { fontWeight: '800' },
  card:                 { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  label:                { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  mt:                   { marginTop: 14 },
  req:                  { color: '#ef4444' },
  opt:                  { fontWeight: '400', color: '#9ca3af' },
  input:                { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  multiline:            { minHeight: 80, paddingTop: 10 },
  submitBtn:            { backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 14 },
  submitBtnText:        { color: '#fff', fontWeight: '800', fontSize: 16 },
  disclaimer:           { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  sentHeader:           { alignItems: 'center', gap: 10, marginBottom: 24, paddingTop: 36 },
  sentIcon:             { fontSize: 52 },
  sentTitle:            { fontSize: 24, fontWeight: '800', color: '#111827' },
  sentSub:              { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  sectionTitle:         { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 14 },
  statusRow:            { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot:            { width: 10, height: 10, borderRadius: 5, backgroundColor: '#d1d5db', marginRight: 12 },
  statusDotDone:        { backgroundColor: '#ef4444' },
  statusInfo:           { flex: 1 },
  statusLabel:          { fontSize: 14, color: '#111827' },
  statusTime:           { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  emergencyServicesCard:{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  emergencyServicesTitle:{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  serviceRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  serviceLabel:         { fontSize: 14, color: '#374151' },
  serviceNumber:        { fontSize: 14, fontWeight: '700', color: '#ef4444' },
  doneBtn:              { backgroundColor: '#111827', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  doneBtnText:          { color: '#fff', fontWeight: '700', fontSize: 15 },
})
