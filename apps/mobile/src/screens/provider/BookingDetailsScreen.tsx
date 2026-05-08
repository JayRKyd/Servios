import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useBookings, useAuth } from '@/store/store'
import { apiRequest } from '@/services/api/client'
import { BookingPhotos } from '@/components/shared/BookingPhotos'

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
  const { selectedBooking: bk, isLoading, fetchBooking, acceptBooking, rejectBooking, completeBooking } = useBookings()
  const { session } = useAuth()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [startingWork, setStartingWork] = useState(false)

  useEffect(() => { fetchBooking(bookingId) }, [bookingId])

  useEffect(() => {
    if (!bk || !session?.access_token) return
    apiRequest<{ milestones: Milestone[] }>('/api/v1/bookings/' + bookingId + '/milestones', { token: session.access_token })
      .then(({ milestones }) => setMilestones(milestones)).catch(() => {})
    apiRequest<{ payment: { status: string } }>('/api/v1/payments/booking/' + bookingId, { token: session.access_token })
      .then(({ payment }) => setPaymentStatus(payment.status)).catch(() => {})
  }, [bk?.id, session?.access_token])

  async function handleStartWork() {
    if (!session?.access_token) return
    setStartingWork(true)
    try {
      await apiRequest('/api/v1/bookings/' + bookingId + '/start', { method: 'PUT', token: session.access_token })
      fetchBooking(bookingId)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to start job')
    } finally {
      setStartingWork(false)
    }
  }

  if (isLoading || !bk) return <ActivityIndicator color='#1a56db' style={{ flex: 1, marginTop: 100 }} />

  const sc = STATUS_COLORS[bk.status] ?? STATUS_COLORS.pending
  const amt = (bk.total_amount / 100).toFixed(2)
  const isPaid = paymentStatus === 'authorized' || paymentStatus === 'succeeded'

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
        {[['Date', bk.scheduled_date], ['Time', bk.scheduled_time_start], ['Amount', 'USD ' + amt], ['Type', bk.booking_type]].map(([l, v]) => (
          <View key={l} style={s.row}><Text style={s.rowLabel}>{l}</Text><Text style={s.rowValue}>{v}</Text></View>
        ))}
        {paymentStatus && (
          <View style={s.row}>
            <Text style={s.rowLabel}>Payment</Text>
            <Text style={[s.rowValue, { color: isPaid ? '#16a34a' : '#6b7280' }]}>
              {paymentStatus === 'authorized' ? 'Held in escrow' : paymentStatus}
            </Text>
          </View>
        )}
        {bk.customer_notes ? <Text style={s.notes}>{bk.customer_notes}</Text> : null}
      </View>

      {isPaid && bk.status === 'accepted' && (
        <View style={s.escrowCard}>
          <Text style={s.escrowTitle}>Payment Secured</Text>
          <Text style={s.escrowDesc}>USD {amt} is held in escrow. You'll receive funds when the job is complete.</Text>
        </View>
      )}

      {milestones.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Milestones</Text>
          {milestones.map((m) => (
            <View key={m.id} style={s.milestoneRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.milestoneTitle}>{m.title}</Text>
                <Text style={s.milestoneAmt}>USD {(m.amount_cents / 100).toFixed(2)}</Text>
                {m.due_date && <Text style={s.milestoneDue}>Due {m.due_date}</Text>}
              </View>
              <View style={m.status === 'released' ? s.releasedBadge : s.pendingBadge}>
                <Text style={m.status === 'released' ? s.releasedText : s.pendingText}>
                  {m.status === 'released' ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <BookingPhotos
        bookingId={bookingId}
        bookingStatus={bk.status}
        isProvider={true}
        authToken={session?.access_token}
      />

      <View style={s.buttons}>
        {bk.status === 'pending' && (
          <>
            <TouchableOpacity style={s.acceptBtn} onPress={async () => { await acceptBooking(bk.id); fetchBooking(bookingId) }}>
              <Text style={s.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.rejectBtn} onPress={() =>
              Alert.alert('Reject booking?', '', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reject', style: 'destructive', onPress: async () => { await rejectBooking(bk.id); router.back() } },
              ])
            }>
              <Text style={s.rejectText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
        {bk.status === 'accepted' && (
          <TouchableOpacity style={[s.acceptBtn, startingWork && s.disabled]} onPress={handleStartWork} disabled={startingWork}>
            {startingWork ? <ActivityIndicator color='#fff' /> : <Text style={s.acceptText}>Start Job</Text>}
          </TouchableOpacity>
        )}
        {bk.status === 'in_progress' && (
          <TouchableOpacity style={s.completeBtn} onPress={async () => { await completeBooking(bk.id); router.back() }}>
            <Text style={s.completeText}>Mark Complete</Text>
          </TouchableOpacity>
        )}
      </View>
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
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, fontWeight: '500', color: '#111827', textTransform: 'capitalize' },
  notes: { fontSize: 14, color: '#374151', marginTop: 10, fontStyle: 'italic' },
  escrowCard: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#bbf7d0' },
  escrowTitle: { fontSize: 14, fontWeight: '600', color: '#15803d', marginBottom: 4 },
  escrowDesc: { fontSize: 13, color: '#166534', lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  milestoneTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  milestoneAmt: { fontSize: 13, color: '#1a56db', fontWeight: '600', marginTop: 2 },
  milestoneDue: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  releasedBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  releasedText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  pendingBadge: { backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  pendingText: { fontSize: 12, color: '#6b7280' },
  buttons: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  acceptBtn: { flex: 1, backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  rejectText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  completeBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  completeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
})
