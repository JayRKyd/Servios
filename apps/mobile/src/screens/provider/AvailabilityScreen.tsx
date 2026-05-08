import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00',
]

interface DaySchedule {
  enabled: boolean
  start: string
  end: string
}

type WeekSchedule = Record<string, DaySchedule>

const DEFAULT_SCHEDULE: WeekSchedule = Object.fromEntries(
  DAY_KEYS.map(d => [d, { enabled: !['saturday', 'sunday'].includes(d), start: '09:00', end: '17:00' }])
)

function TimeSelector({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <View>
      <Text style={ts.timeLabel}>{label}</Text>
      <TouchableOpacity style={ts.timeBtn} onPress={() => setOpen(v => !v)}>
        <Text style={ts.timeBtnText}>{value}</Text>
        <Text style={ts.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <ScrollView style={ts.dropdown} nestedScrollEnabled showsVerticalScrollIndicator>
          {TIME_SLOTS.map(t => (
            <TouchableOpacity
              key={t}
              style={[ts.option, t === value && ts.optionActive]}
              onPress={() => { onChange(t); setOpen(false) }}
            >
              <Text style={[ts.optionText, t === value && ts.optionTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const ts = StyleSheet.create({
  timeLabel:       { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  timeBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f9fafb' },
  timeBtnText:     { fontSize: 13, fontWeight: '600', color: '#111827' },
  chevron:         { fontSize: 10, color: '#9ca3af' },
  dropdown:        { maxHeight: 160, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginTop: 2, backgroundColor: '#fff' },
  option:          { paddingHorizontal: 12, paddingVertical: 8 },
  optionActive:    { backgroundColor: '#eff6ff' },
  optionText:      { fontSize: 13, color: '#374151' },
  optionTextActive:{ color: '#1a56db', fontWeight: '700' },
})

export function AvailabilityScreen() {
  const { user, session } = useAuth()
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE)
  const [emergencyAvailable, setEmergencyAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', user.id)
        .single()

      if (data) {
        const loaded: WeekSchedule = {}
        for (const key of DAY_KEYS) {
          loaded[key] = {
            enabled: data[`${key}_enabled`] ?? DEFAULT_SCHEDULE[key].enabled,
            start: data[`${key}_start`] ?? '09:00',
            end: data[`${key}_end`] ?? '17:00',
          }
        }
        setSchedule(loaded)
        setEmergencyAvailable(data.emergency_available ?? false)
      }
      setLoading(false)
    }
    load()
  }, [user])

  function toggleDay(key: string) {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }))
  }

  function setTime(key: string, field: 'start' | 'end', value: string) {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        provider_id: user.id,
        emergency_available: emergencyAvailable,
        updated_at: new Date().toISOString(),
      }
      for (const key of DAY_KEYS) {
        payload[`${key}_enabled`] = schedule[key].enabled
        payload[`${key}_start`] = schedule[key].start
        payload[`${key}_end`] = schedule[key].end
      }

      const { error } = await supabase
        .from('provider_availability')
        .upsert(payload, { onConflict: 'provider_id' })

      if (error) throw new Error(error.message)

      Alert.alert('Saved', 'Your availability has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#1a56db" /></View>
  }

  const enabledCount = DAY_KEYS.filter(k => schedule[k].enabled).length

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Manage Availability</Text>
      </View>

      <Text style={s.subtitle}>
        Set your working hours. Customers can only book you during these times.
        {enabledCount > 0 ? ` You're available ${enabledCount} day${enabledCount !== 1 ? 's' : ''} a week.` : ''}
      </Text>

      {/* Emergency availability */}
      <View style={s.emergencyCard}>
        <View style={s.emergencyInfo}>
          <Text style={s.emergencyTitle}>🚨 Emergency Available</Text>
          <Text style={s.emergencyDesc}>Accept emergency jobs outside normal hours (15% commission applies)</Text>
        </View>
        <Switch
          value={emergencyAvailable}
          onValueChange={setEmergencyAvailable}
          trackColor={{ true: '#ef4444', false: '#e5e7eb' }}
          thumbColor="#fff"
        />
      </View>

      {/* Day schedules */}
      {DAY_KEYS.map((key, i) => {
        const day = schedule[key]
        return (
          <View key={key} style={[s.dayCard, !day.enabled && s.dayCardDisabled]}>
            <View style={s.dayHeader}>
              <Text style={[s.dayName, !day.enabled && s.dayNameDisabled]}>{DAYS[i]}</Text>
              <Switch
                value={day.enabled}
                onValueChange={() => toggleDay(key)}
                trackColor={{ true: '#1a56db', false: '#e5e7eb' }}
                thumbColor="#fff"
              />
            </View>
            {day.enabled && (
              <View style={s.timeRow}>
                <View style={s.timeField}>
                  <TimeSelector
                    label="From"
                    value={day.start}
                    onChange={v => setTime(key, 'start', v)}
                  />
                </View>
                <Text style={s.timeSep}>–</Text>
                <View style={s.timeField}>
                  <TimeSelector
                    label="Until"
                    value={day.end}
                    onChange={v => setTime(key, 'end', v)}
                  />
                </View>
              </View>
            )}
            {!day.enabled && (
              <Text style={s.unavailableText}>Unavailable</Text>
            )}
          </View>
        )
      })}

      <TouchableOpacity
        style={[s.saveBtn, saving && s.dim]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={s.saveBtnText}>Save Availability</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

export default AvailabilityScreen

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#f9fafb' },
  inner:             { padding: 20, paddingBottom: 40 },
  center:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 36, marginBottom: 12 },
  back:              { color: '#1a56db', fontSize: 15 },
  title:             { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle:          { fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 20 },
  emergencyCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#fed7aa' },
  emergencyInfo:     { flex: 1 },
  emergencyTitle:    { fontSize: 14, fontWeight: '700', color: '#9a3412' },
  emergencyDesc:     { fontSize: 12, color: '#b45309', marginTop: 2 },
  dayCard:           { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dayCardDisabled:   { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6' },
  dayHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dayName:           { fontSize: 15, fontWeight: '700', color: '#111827' },
  dayNameDisabled:   { color: '#9ca3af' },
  timeRow:           { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  timeField:         { flex: 1 },
  timeSep:           { fontSize: 16, color: '#9ca3af', paddingBottom: 8 },
  unavailableText:   { fontSize: 13, color: '#9ca3af' },
  saveBtn:           { backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  saveBtnText:       { color: '#fff', fontWeight: '700', fontSize: 15 },
  dim:               { opacity: 0.5 },
})
