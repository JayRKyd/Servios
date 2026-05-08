import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal, Pressable, Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'
import { supabase } from '@/lib/supabase'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#fef9c3', text: '#854d0e' },
  accepted:    { bg: '#dcfce7', text: '#166534' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  completed:   { bg: '#f0fdf4', text: '#15803d' },
  rejected:    { bg: '#fee2e2', text: '#991b1b' },
  cancelled:   { bg: '#f3f4f6', text: '#6b7280' },
}

interface Booking {
  id: string
  booking_number: string
  scheduled_date: string
  scheduled_time_start: string
  scheduled_time_end: string | null
  status: string
  total_amount: number
  customer_notes: string | null
  service_address: { street?: string; city?: string } | null
}

const SCREEN_HEIGHT = Dimensions.get('window').height

export function CalendarScreen() {
  const { session } = useAuth()
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [loading, setLoading] = useState(true)

  // Map of dateStr → booking[]
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, Booking[]>>({})

  // Selected day detail panel
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const todayStr = now.toISOString().split('T')[0]

  const fetchMonth = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    const from = toDateStr(year, month, 1)
    const to = toDateStr(year, month, daysInMonth(year, month))

    const { data } = await supabase
      .from('bookings')
      .select('id, booking_number, scheduled_date, scheduled_time_start, scheduled_time_end, status, total_amount, customer_notes, service_address')
      .eq('provider_id', session.user.id)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .not('status', 'in', '("rejected","cancelled")')
      .order('scheduled_time_start', { ascending: true })

    const map: Record<string, Booking[]> = {}
    for (const b of data ?? []) {
      if (!map[b.scheduled_date]) map[b.scheduled_date] = []
      map[b.scheduled_date].push(b)
    }
    setBookingsByDate(map)
    setLoading(false)
  }, [session?.user?.id, year, month])

  useEffect(() => { fetchMonth() }, [fetchMonth])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
    setSelectedDate(null)
  }

  function handleDayPress(dateStr: string) {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr))
  }

  const totalDays = daysInMonth(year, month)
  const firstDay = firstDayOfMonth(year, month)
  const selectedBookings = selectedDate ? (bookingsByDate[selectedDate] ?? []) : []

  // Count bookings this month
  const monthTotal = Object.values(bookingsByDate).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Calendar</Text>
        {loading && <ActivityIndicator size='small' color='#1a56db' />}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Month nav */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
            <Text style={s.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
            <Text style={s.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={s.calCard}>
          {/* Day labels */}
          <View style={s.dayRow}>
            {DAYS.map((d) => (
              <Text key={d} style={s.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Date cells */}
          <View style={s.grid}>
            {/* Empty leading cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`e${i}`} style={s.cell} />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1
              const dateStr = toDateStr(year, month, day)
              const bookings = bookingsByDate[dateStr] ?? []
              const isBooked = bookings.length > 0
              const isToday = dateStr === todayStr
              const isSelected = selectedDate === dateStr
              const isPast = dateStr < todayStr

              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    s.cell,
                    isSelected && s.cellSelected,
                    !isSelected && isBooked && s.cellBooked,
                    !isSelected && !isBooked && isToday && s.cellToday,
                  ]}
                  onPress={() => handleDayPress(dateStr)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    s.cellText,
                    isSelected && s.cellTextSelected,
                    !isSelected && isBooked && s.cellTextBooked,
                    !isSelected && !isBooked && isToday && s.cellTextToday,
                    isPast && !isBooked && !isToday && s.cellTextPast,
                  ]}>
                    {day}
                  </Text>
                  {isBooked && !isSelected && (
                    <View style={s.dot}>
                      {bookings.length > 1 && (
                        <Text style={s.dotCount}>{bookings.length}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Legend */}
          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#1a56db' }]} />
              <Text style={s.legendText}>Booked</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#fff', borderWidth: 2, borderColor: '#1a56db' }]} />
              <Text style={s.legendText}>Today</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#7c3aed' }]} />
              <Text style={s.legendText}>Selected</Text>
            </View>
          </View>
        </View>

        {/* Month summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{monthTotal}</Text>
            <Text style={s.summaryLabel}>Bookings this month</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{Object.keys(bookingsByDate).length}</Text>
            <Text style={s.summaryLabel}>Days scheduled</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>
              {Object.values(bookingsByDate)
                .flat()
                .filter((b) => b.status === 'accepted' || b.status === 'in_progress')
                .length}
            </Text>
            <Text style={s.summaryLabel}>Upcoming</Text>
          </View>
        </View>

        {/* Selected day bookings */}
        {selectedDate && (
          <View style={s.dayDetail}>
            <Text style={s.dayDetailTitle}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>

            {selectedBookings.length === 0 ? (
              <View style={s.emptyDay}>
                <Text style={s.emptyDayText}>No bookings on this day</Text>
              </View>
            ) : (
              selectedBookings.map((b) => {
                const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.pending
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={s.bookingCard}
                    onPress={() => router.push((`/provider/bookings/${b.id}`) as any)}
                    activeOpacity={0.8}
                  >
                    <View style={s.bookingCardLeft}>
                      <Text style={s.bookingTime}>
                        {b.scheduled_time_start}
                        {b.scheduled_time_end ? ` – ${b.scheduled_time_end}` : ''}
                      </Text>
                      <Text style={s.bookingNum}>{b.booking_number}</Text>
                      {b.service_address?.street && (
                        <Text style={s.bookingAddr} numberOfLines={1}>
                          {b.service_address.street}, {b.service_address.city}
                        </Text>
                      )}
                      {b.customer_notes && (
                        <Text style={s.bookingNotes} numberOfLines={1}>{b.customer_notes}</Text>
                      )}
                    </View>
                    <View style={s.bookingCardRight}>
                      <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.statusText, { color: sc.text }]}>
                          {b.status.replace('_', ' ')}
                        </Text>
                      </View>
                      <Text style={s.bookingAmt}>USD {(b.total_amount / 100).toFixed(2)}</Text>
                      <Text style={s.viewLink}>View →</Text>
                    </View>
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        )}

        {/* Upcoming bookings — next 7 days */}
        {!selectedDate && (
          <View style={s.upcomingSection}>
            <Text style={s.upcomingTitle}>Upcoming — Next 7 Days</Text>
            {(() => {
              const upcoming: { date: string; booking: Booking }[] = []
              for (let i = 0; i <= 7; i++) {
                const d = new Date(now)
                d.setDate(d.getDate() + i)
                const ds = d.toISOString().split('T')[0]
                for (const b of bookingsByDate[ds] ?? []) {
                  upcoming.push({ date: ds, booking: b })
                }
              }
              if (upcoming.length === 0) {
                return <Text style={s.emptyDayText}>No upcoming bookings in the next 7 days</Text>
              }
              return upcoming.map(({ date, booking: b }) => {
                const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.pending
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={s.bookingCard}
                    onPress={() => router.push((`/provider/bookings/${b.id}`) as any)}
                    activeOpacity={0.8}
                  >
                    <View style={s.bookingCardLeft}>
                      <Text style={s.bookingTime}>
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {'  '}{b.scheduled_time_start}
                      </Text>
                      <Text style={s.bookingNum}>{b.booking_number}</Text>
                      {b.service_address?.street && (
                        <Text style={s.bookingAddr} numberOfLines={1}>
                          {b.service_address.street}, {b.service_address.city}
                        </Text>
                      )}
                    </View>
                    <View style={s.bookingCardRight}>
                      <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.statusText, { color: sc.text }]}>{b.status.replace('_', ' ')}</Text>
                      </View>
                      <Text style={s.bookingAmt}>USD {(b.total_amount / 100).toFixed(2)}</Text>
                      <Text style={s.viewLink}>View →</Text>
                    </View>
                  </TouchableOpacity>
                )
              })
            })()}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default CalendarScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  // Month nav
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  navBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  navBtnText: { fontSize: 22, color: '#374151', lineHeight: 26 },
  monthLabel: { fontSize: 18, fontWeight: '700', color: '#111827' },

  // Calendar card
  calCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  dayRow: { flexDirection: 'row', marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  cellBooked: { backgroundColor: '#1a56db', borderRadius: 10 },
  cellToday: { borderWidth: 2, borderColor: '#1a56db', borderRadius: 10 },
  cellSelected: { backgroundColor: '#7c3aed', borderRadius: 10 },
  cellText: { fontSize: 14, color: '#374151', fontWeight: '400' },
  cellTextBooked: { color: '#fff', fontWeight: '700' },
  cellTextToday: { color: '#1a56db', fontWeight: '700' },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellTextPast: { color: '#d1d5db' },
  dot: { position: 'absolute', bottom: 3, right: 3, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center' },
  dotCount: { fontSize: 9, color: '#1e40af', fontWeight: '700' },

  legend: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6b7280' },

  // Summary
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#1a56db' },
  summaryLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#f3f4f6' },

  // Day detail
  dayDetail: { gap: 10 },
  dayDetailTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  emptyDay: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyDayText: { fontSize: 14, color: '#9ca3af' },

  // Upcoming
  upcomingSection: { gap: 10 },
  upcomingTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  // Booking card
  bookingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  bookingCardLeft: { flex: 1, gap: 3 },
  bookingTime: { fontSize: 13, fontWeight: '600', color: '#1a56db' },
  bookingNum: { fontSize: 14, fontWeight: '500', color: '#111827' },
  bookingAddr: { fontSize: 12, color: '#6b7280' },
  bookingNotes: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
  bookingCardRight: { alignItems: 'flex-end', gap: 4, marginLeft: 8 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  bookingAmt: { fontSize: 13, fontWeight: '700', color: '#111827' },
  viewLink: { fontSize: 12, color: '#1a56db' },
})
