import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useBookings, useAuth } from '@/store/store'
import { apiRequest } from '@/services/api/client'
import { BookingPhotos } from '@/components/shared/BookingPhotos'

type Payment = {
  id: string
  status: string
  amount: number
  captured_at: string | null
}

type Milestone = {
  id: string
  title: string
  amount_cents: number
  status: 'pending' | 'released' | 'failed'
  due_date: string | null
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: '#fef9c3', text: '#854d0e' },
  accepted:   { bg: '#dcfce7', text: '#166534' },
  in_progress:{ bg: '#dbeafe', text: '#1e40af' },
  completed:  { bg: '#f0fdf4', text: '#15803d' },
  rejected:   { bg: '#fee2e2', text: '#991b1b' },
  cancelled:  { bg: '#f3f4f6', text: '#6b7280' },
}

export function BookingDetailsScreen({ bookingId }: { bookingId: string }) {
  const { selectedBooking: bk, isLoading, fetchBooking, cancelBooking } = useBookings()
  const { session } = useAuth()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [releasing, setReleasing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [filing, setFiling] = useState(false)

  useEffect(() => { fetchBooking(bookingId) }, [bookingId])

  useEffect(() => {
    if (!bk || !session?.access_token) return
    apiRequest<{ payment: Payment }>('/api/v1/payments/booking/' + bookingId, { token: session.access_token })
      .then(({ payment }) => setPayment(payment)).catch(() => {})
    apiRequest<{ milestones: Milestone[] }>('/api/v1/bookings/' + bookingId + '/milestones', { token: session.access_token })
      .then(({ milestones }) => setMilestones(milestones)).catch(() => {})
  }, [bk?.id, session?.access_token])

  async function handlePay() {
    if (!session?.access_token) return
    setPaymentLoading(true)
    try {
      const { clientSecret } = await apiRequest<{ clientSecret: string }>('/api/v1/payments/intent', {
        method: 'POST',
        token: session.access_token,
        body: JSON.stringify({ bookingId }),
      })
      // TODO: open Stripe Payment Sheet with clientSecret
      Alert.alert('Payment Ready', 'Stripe Payment Sheet integration required. Client secret received.')
    } catch (e) {
      Alert.alert('Payment Error', e instanceof Error ? e.message : 'Failed to initiate payment')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCapture() {
    if (!payment?.id || !session?.access_token) return
    setCapturing(true)
    try {
      await apiRequest('/api/v1/payments/capture/' + payment.id, { method: 'POST', token: session.access_token })
      setPayment((p) => p ? { ...p, status: 'succeeded', captured_at: new Date().toISOString() } : p)
      Alert.alert('Funds Released', 'Payment captured and transferred to the provider.')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to release funds')
    } finally {
      setCapturing(false)
    }
  }

  async function handleConfirmComplete() {
    if (!session?.access_token) return
    Alert.alert(
      'Confirm Job Complete',
      'Are you happy with the work? This will mark the booking as completed and you can then leave a review.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, confirm',
          onPress: async () => {
            setConfirming(true)
            try {
              await apiRequest(`/api/v1/bookings/${bookingId}/customer-confirm`, {
                method: 'PUT',
                token: session.access_token,
              })
              await fetchBooking(bookingId)
              Alert.alert(
                'Job Confirmed!',
                'Would you like to leave a review for the provider?',
                [
                  { text: 'Later', style: 'cancel' },
                  { text: 'Leave Review', onPress: () => router.push(`/(tabs)/bookings/${bookingId}/review` as any) },
                ],
              )
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to confirm')
            } finally {
              setConfirming(false)
            }
          },
        },
      ],
    )
  }

  async function handleFileClaim() {
    if (!session?.access_token) return
    const completedAt = bk?.completed_at ? new Date(bk.completed_at) : null
    if (completedAt) {
      const days = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (days > 90) {
        Alert.alert('Claim period expired', 'Workmanship claims must be filed within 90 days of completion.')
        return
      }
    }
    Alert.prompt(
      '🛡 File a Workmanship Claim',
      'Describe the issue with the work done (min 10 characters):',
      async (description) => {
        if (!description || description.trim().length < 10) {
          Alert.alert('Too short', 'Please provide a more detailed description.')
          return
        }
        setFiling(true)
        try {
          const res = await apiRequest('/api/v1/claims', {
            method: 'POST',
            token: session.access_token,
            body: JSON.stringify({ bookingId, description: description.trim() }),
          })
          Alert.alert('✓ Claim submitted', 'Our team will review your claim within 3–5 business days.')
        } catch (e) {
          Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit claim')
        } finally {
          setFiling(false)
        }
      },
      'plain-text',
    )
  }

  async function handleReleaseMilestone(milestoneId: string) {
    if (!session?.access_token) return
    setReleasing(milestoneId)
    try {
      await apiRequest('/api/v1/bookings/' + bookingId + '/milestones/' + milestoneId + '/release', {
        method: 'POST',
        token: session.access_token,
      })
      setMilestones((ms) => ms.map((m) => m.id === milestoneId ? { ...m, status: 'released' } : m))
      Alert.alert('Milestone Released', 'Funds transferred to the provider.')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to release milestone')
    } finally {
      setReleasing(null)
    }
  }

  if (isLoading || !bk) return <ActivityIndicator color='#1a56db' style={{ flex: 1, marginTop: 100 }} />

  const sc = STATUS_COLORS[bk.status] ?? STATUS_COLORS.pending
  const amt = (bk.total_amount / 100).toFixed(2)
  const canPay = bk.status === 'accepted' && (!payment || payment.status === 'failed')
  const canCapture = bk.status === 'completed' && payment?.status === 'authorized'
  const canClaim = bk.status === 'completed' && (() => {
    if (!bk.completed_at) return true
    const days = (Date.now() - new Date(bk.completed_at).getTime()) / (1000 * 60 * 60 * 24)
    return days <= 90
  })()

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backText}>← Back</Text></TouchableOpacity>

      <View style={s.headerRow}>
        <Text style={s.number}>{bk.booking_number}</Text>
        <View style={[s.badge, { backgroundColor: sc.bg }]}>
          <Text style={[s.badgeText, { color: sc.text }]}>{bk.status}</Text>
        </View>
      </View>

      <View style={s.card}>
        {[['Date', bk.scheduled_date], ['Time', bk.scheduled_time_start], ['Amount', 'USD ' + amt], ['Payment', bk.payment_status], ['Type', bk.booking_type]].map(([l, v]) => (
          <View key={l} style={s.row}><Text style={s.rowLabel}>{l}</Text><Text style={s.rowValue}>{v}</Text></View>
        ))}
        {bk.customer_notes ? <Text style={s.notes}>{bk.customer_notes}</Text> : null}
      </View>

      {/* Payment panel */}
      {(canPay || payment) && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Payment</Text>
          {payment && (
            <View style={s.payRow}>
              <Text style={s.rowLabel}>Status</Text>
              <Text style={[s.rowValue, { color: payment.status === 'succeeded' ? '#16a34a' : payment.status === 'authorized' ? '#1d4ed8' : '#6b7280' }]}>
                {payment.status === 'authorized' ? 'Held in escrow' : payment.status}
              </Text>
            </View>
          )}
          {payment?.status === 'authorized' && (
            <View style={s.escrowBox}>
              <Text style={s.escrowText}>USD {amt} is held in escrow. Release after job completion.</Text>
            </View>
          )}
          {canPay && (
            <TouchableOpacity style={[s.payBtn, paymentLoading && s.disabled]} onPress={handlePay} disabled={paymentLoading}>
              {paymentLoading ? <ActivityIndicator color='#fff' /> : <Text style={s.payBtnText}>Pay USD {amt}</Text>}
            </TouchableOpacity>
          )}
          {canCapture && (
            <TouchableOpacity style={[s.releaseBtn, capturing && s.disabled]} onPress={handleCapture} disabled={capturing}>
              {capturing ? <ActivityIndicator color='#fff' /> : <Text style={s.releaseBtnText}>Release Funds to Provider</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Milestones</Text>
          {milestones.map((m) => (
            <View key={m.id} style={s.milestoneRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.milestoneTitle}>{m.title}</Text>
                <Text style={s.milestoneAmt}>USD {(m.amount_cents / 100).toFixed(2)}</Text>
              </View>
              {m.status === 'released' ? (
                <View style={s.releasedBadge}><Text style={s.releasedText}>Released</Text></View>
              ) : m.status === 'pending' && payment?.status === 'succeeded' ? (
                <TouchableOpacity style={[s.releaseSmall, releasing === m.id && s.disabled]} onPress={() => handleReleaseMilestone(m.id)} disabled={releasing !== null}>
                  {releasing === m.id ? <ActivityIndicator color='#fff' size='small' /> : <Text style={s.releaseSmallText}>Release</Text>}
                </TouchableOpacity>
              ) : (
                <View style={s.pendingBadge}><Text style={s.pendingText}>Pending</Text></View>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: 10 }}>
        {(bk.status === 'in_progress' || bk.status === 'accepted') && (
          <TouchableOpacity
            style={[s.confirmBtn, confirming && s.disabled]}
            onPress={handleConfirmComplete}
            disabled={confirming}
          >
            {confirming
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.confirmText}>✓ Confirm Job Complete</Text>
            }
          </TouchableOpacity>
        )}
        {(bk.status === 'pending' || bk.status === 'accepted') && (
          <TouchableOpacity style={s.cancelBtn} onPress={() =>
            Alert.alert('Cancel booking?', '', [
              { text: 'No', style: 'cancel' },
              { text: 'Yes, cancel', style: 'destructive', onPress: async () => { await cancelBooking(bk.id); router.back() } },
            ])
          }>
            <Text style={s.cancelText}>Cancel booking</Text>
          </TouchableOpacity>
        )}
        {bk.status === 'completed' && (
          <TouchableOpacity style={s.reviewBtn} onPress={() => router.push(('/(tabs)/bookings/' + bk.id + '/review') as any)}>
            <Text style={s.reviewText}>Leave a review</Text>
          </TouchableOpacity>
        )}
        {canClaim && (
          <TouchableOpacity style={[s.claimBtn, filing && s.disabled]} onPress={handleFileClaim} disabled={filing}>
            {filing
              ? <ActivityIndicator color="#c2410c" />
              : <Text style={s.claimText}>🛡 File a Workmanship Claim</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <BookingPhotos
        bookingId={bookingId}
        bookingStatus={bk.status}
        isProvider={false}
        authToken={session?.access_token}
      />
    </ScrollView>
  )
}

export default BookingDetailsScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { padding: 20, paddingTop: 60, gap: 14 },
  back: { marginBottom: 4 },
  backText: { color: '#1a56db', fontSize: 15 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  number: { fontSize: 20, fontWeight: '700', color: '#111827' },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, fontWeight: '500', color: '#111827', textTransform: 'capitalize' },
  notes: { fontSize: 14, color: '#374151', marginTop: 10, fontStyle: 'italic' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  escrowBox: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginBottom: 8 },
  escrowText: { fontSize: 13, color: '#1e40af', lineHeight: 18 },
  payBtn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  releaseBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  releaseBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  milestoneTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  milestoneAmt: { fontSize: 13, color: '#1a56db', fontWeight: '600', marginTop: 2 },
  releasedBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  releasedText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  pendingBadge: { backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  pendingText: { fontSize: 12, color: '#6b7280' },
  releaseSmall: { backgroundColor: '#1a56db', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  releaseSmallText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  confirmBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  reviewBtn:  { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  reviewText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  claimBtn:   { borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff7ed' },
  claimText:  { color: '#c2410c', fontSize: 14, fontWeight: '600' },
})
