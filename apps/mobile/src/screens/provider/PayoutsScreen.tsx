import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, Alert,
} from 'react-native'
import { useAuth } from '@/store/store'
import { apiRequest } from '@/services/api/client'

type ConnectStatus = {
  connected: boolean
  status: 'not_connected' | 'pending' | 'active' | 'restricted'
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
  requirements?: { currently_due?: string[] }
}

export function PayoutsScreen() {
  const { session } = useAuth()
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest<ConnectStatus>('/api/v1/connect/status', {
        token: session.access_token,
      })
      setStatus(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load status')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  async function handleOnboard() {
    if (!session?.access_token) return
    setActionLoading(true)
    setError(null)
    try {
      const { url } = await apiRequest<{ url: string }>('/api/v1/connect/onboard', {
        method: 'POST',
        token: session.access_token,
      })
      await Linking.openURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start onboarding')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDashboard() {
    if (!session?.access_token) return
    setActionLoading(true)
    try {
      const { url } = await apiRequest<{ url: string }>('/api/v1/connect/dashboard', {
        method: 'POST',
        token: session.access_token,
      })
      await Linking.openURL(url)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to open dashboard')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <ActivityIndicator color='#1a56db' style={{ flex: 1, marginTop: 100 }} />

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <Text style={s.title}>Payouts</Text>

      {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

      {/* Status card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Stripe Connect</Text>
          <StatusBadge status={status?.status ?? 'not_connected'} />
        </View>
        <Text style={s.cardDesc}>
          Servios uses Stripe to pay you directly into your bank account after each completed job.
        </Text>

        {status?.status === 'not_connected' && (
          <View style={s.section}>
            <Text style={s.bodyText}>Connect your bank account to start receiving payments.</Text>
            {['Verify your identity', 'Add a bank account', 'Receive payouts automatically'].map((item) => (
              <Text key={item} style={s.bullet}>• {item}</Text>
            ))}
            <TouchableOpacity style={[s.btn, actionLoading && s.btnDisabled]} onPress={handleOnboard} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color='#fff' /> : <Text style={s.btnText}>Connect Bank Account</Text>}
            </TouchableOpacity>
          </View>
        )}

        {status?.status === 'pending' && (
          <View style={s.section}>
            <View style={s.warningBox}>
              <Text style={s.warningText}>Setup incomplete — finish onboarding to receive payouts.</Text>
              {status.requirements?.currently_due?.map((r) => (
                <Text key={r} style={s.reqText}>• {r.replace(/_/g, ' ')}</Text>
              ))}
            </View>
            <TouchableOpacity style={[s.btn, actionLoading && s.btnDisabled]} onPress={handleOnboard} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color='#fff' /> : <Text style={s.btnText}>Continue Onboarding</Text>}
            </TouchableOpacity>
          </View>
        )}

        {status?.status === 'active' && (
          <View style={s.section}>
            <View style={s.capRow}>
              <Capability label="Charges" enabled={status.chargesEnabled ?? false} />
              <Capability label="Payouts" enabled={status.payoutsEnabled ?? false} />
              <Capability label="Verified" enabled={status.detailsSubmitted ?? false} />
            </View>
            <Text style={s.bodyText}>
              Your Stripe account is active. Funds are transferred after each completed job.
            </Text>
            <View style={s.btnRow}>
              <TouchableOpacity style={[s.btn, s.btnOutline, actionLoading && s.btnDisabled]} onPress={handleDashboard} disabled={actionLoading}>
                <Text style={s.btnOutlineText}>{actionLoading ? 'Opening…' : 'Stripe Dashboard'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnRefresh} onPress={fetchStatus}>
                <Text style={s.btnOutlineText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* How it works */}
      <View style={s.card}>
        <Text style={s.cardTitle}>How payouts work</Text>
        {[
          ['1', 'Customer pays', 'Funds are held in escrow after booking is accepted.'],
          ['2', 'Job completed', 'Release happens once the job is marked complete.'],
          ['3', 'Funds transferred', 'Your earnings (minus commission) go to Stripe.'],
          ['4', 'Bank payout', 'Stripe sends funds to your bank within 2 business days.'],
        ].map(([num, step, desc]) => (
          <View key={num} style={s.step}>
            <View style={s.stepNum}><Text style={s.stepNumText}>{num}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{step}</Text>
              <Text style={s.stepDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

export default PayoutsScreen

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    not_connected: { bg: '#f3f4f6', text: '#6b7280', label: 'Not connected' },
    pending:       { bg: '#fef3c7', text: '#92400e', label: 'Incomplete' },
    active:        { bg: '#dcfce7', text: '#166534', label: 'Active' },
    restricted:    { bg: '#fee2e2', text: '#991b1b', label: 'Restricted' },
  }
  const c = config[status] ?? config.not_connected
  return (
    <View style={[sb.badge, { backgroundColor: c.bg }]}>
      <Text style={[sb.text, { color: c.text }]}>{c.label}</Text>
    </View>
  )
}

function Capability({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={cap.box}>
      <Text style={cap.label}>{label}</Text>
      <Text style={[cap.value, { color: enabled ? '#16a34a' : '#9ca3af' }]}>
        {enabled ? 'Enabled' : 'Pending'}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { padding: 16, paddingTop: 60, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardDesc: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  section: { gap: 10 },
  bodyText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  bullet: { fontSize: 13, color: '#6b7280', marginLeft: 4 },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1d5db' },
  btnOutlineText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnRefresh: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  capRow: { flexDirection: 'row', gap: 8 },
  warningBox: { backgroundColor: '#fffbeb', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#fcd34d' },
  warningText: { fontSize: 13, color: '#92400e', marginBottom: 6 },
  reqText: { fontSize: 12, color: '#b45309', fontFamily: 'monospace' },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontWeight: '700', color: '#1a56db' },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  stepDesc: { fontSize: 13, color: '#6b7280', marginTop: 2, lineHeight: 18 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12 },
  errorText: { color: '#ef4444', fontSize: 13 },
})

const sb = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: '600' },
})

const cap = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, alignItems: 'center' },
  label: { fontSize: 11, color: '#6b7280' },
  value: { fontSize: 13, fontWeight: '600', marginTop: 2 },
})
