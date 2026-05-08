import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useBookings } from '@/store/store'

function fmt(cents: number) {
  return `£${(cents / 100).toFixed(2)}`
}

export function AcceptBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bookings, acceptBooking, rejectBooking } = useBookings()
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const booking = bookings.find(b => b.id === id)

  if (!booking) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>Booking not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.goBackBtn}>
          <Text style={s.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isBusy = accepting || rejecting

  async function handleAccept() {
    Alert.alert(
      'Accept Booking?',
      `Confirm you'll complete this job on ${booking!.scheduled_date} at ${booking!.scheduled_time_start}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAccepting(true)
            try {
              await acceptBooking(booking!.id)
              Alert.alert('Booking Accepted ✓', 'The customer has been notified. The job is now in your bookings.', [
                { text: 'View Bookings', onPress: () => router.replace('/(tabs)/bookings') },
              ])
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to accept booking')
            } finally {
              setAccepting(false)
            }
          },
        },
      ],
    )
  }

  async function handleReject() {
    Alert.alert(
      'Decline Booking?',
      'The customer will be notified that you are unavailable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setRejecting(true)
            try {
              await rejectBooking(booking!.id)
              router.back()
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to decline booking')
            } finally {
              setRejecting(false)
            }
          },
        },
      ],
    )
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Booking Request</Text>
      </View>

      {booking.is_emergency && (
        <View style={s.emergencyBanner}>
          <Text style={s.emergencyText}>🚨 Emergency Job — 15% commission applies</Text>
        </View>
      )}

      <View style={s.card}>
        <Row label="Booking #" value={booking.booking_number ?? booking.id.slice(0, 8).toUpperCase()} />
        <Divider />
        <Row label="Date" value={booking.scheduled_date} />
        <Divider />
        <Row label="Time" value={booking.scheduled_time_start} />
        <Divider />
        <Row label="Job Value" value={fmt(booking.total_amount)} bold />
      </View>

      {booking.customer_notes ? (
        <View style={s.card}>
          <Text style={s.sectionLabel}>Customer Notes</Text>
          <Text style={s.notes}>{booking.customer_notes}</Text>
        </View>
      ) : null}

      {booking.status === 'pending' && (
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
            style={[s.acceptBtn, isBusy && s.dim]}
            onPress={handleAccept}
            disabled={isBusy}
          >
            {accepting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.acceptBtnText}>✓ Accept Job</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'accepted' && (
        <View style={s.acceptedNote}>
          <Text style={s.acceptedNoteText}>✓ You accepted this booking. It appears in your calendar.</Text>
        </View>
      )}
    </ScrollView>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, bold && s.rowBold]}>{value}</Text>
    </View>
  )
}
function Divider() { return <View style={s.divider} /> }

export default AcceptBookingScreen

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f9fafb' },
  inner:          { padding: 20, paddingBottom: 40 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty:          { fontSize: 15, color: '#6b7280' },
  topBar:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 36, marginBottom: 20 },
  back:           { color: '#1a56db', fontSize: 15 },
  title:          { fontSize: 20, fontWeight: '700', color: '#111827' },
  emergencyBanner:{ backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 14 },
  emergencyText:  { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  card:           { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel:       { fontSize: 14, color: '#6b7280' },
  rowValue:       { fontSize: 14, color: '#111827' },
  rowBold:        { fontWeight: '700', fontSize: 16 },
  divider:        { height: 1, backgroundColor: '#f3f4f6' },
  sectionLabel:   { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  notes:          { fontSize: 14, color: '#374151', lineHeight: 20 },
  actions:        { flexDirection: 'row', gap: 12, marginTop: 8 },
  acceptBtn:      { flex: 2, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  acceptBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  rejectBtn:      { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: '#ef4444', paddingVertical: 14, alignItems: 'center' },
  rejectBtnText:  { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  dim:            { opacity: 0.5 },
  acceptedNote:   { backgroundColor: '#dcfce7', borderRadius: 12, padding: 14, marginTop: 8 },
  acceptedNoteText:{ color: '#15803d', fontSize: 14, fontWeight: '600' },
  goBackBtn:      { backgroundColor: '#1a56db', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  goBackBtnText:  { color: '#fff', fontWeight: '600' },
})
