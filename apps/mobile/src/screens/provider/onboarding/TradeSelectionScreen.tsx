import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

const TRADE_ICONS: Record<string, string> = {
  plumber:     '🔧',
  electrician: '⚡',
  ac_hvac:     '❄️',
  carpenter:   '🪚',
  painter:     '🎨',
  cleaner:     '🧹',
  landscaper:  '🌿',
  mason:       '🧱',
  roofer:      '🏠',
  handyman:    '🛠️',
}

interface Trade { value: string; label: string }

export function TradeSelectionScreen() {
  const { session } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/v1/onboarding/trades`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => setTrades(d.trades ?? []))
      .catch(() => Alert.alert('Error', 'Could not load trades. Please try again.'))
      .finally(() => setLoading(false))
  }, [session?.access_token])

  async function handleNext() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/onboarding/trade`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trade: selected }),
      })
      if (!res.ok) throw new Error('Failed to save trade')
      router.push('/(onboarding)/services')
    } catch {
      Alert.alert('Error', 'Could not save your selection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.stepRow}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[s.stepDot, n === 1 && s.stepDotActive]} />
          ))}
        </View>
        <Text style={s.title}>What's your trade?</Text>
        <Text style={s.subtitle}>Select the primary service you provide</Text>
      </View>

      {loading ? (
        <ActivityIndicator color='#1a56db' style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
          {trades.map((trade) => (
            <TouchableOpacity
              key={trade.value}
              style={[s.tradeCard, selected === trade.value && s.tradeCardSelected]}
              onPress={() => setSelected(trade.value)}
              activeOpacity={0.7}
            >
              <Text style={s.tradeIcon}>{TRADE_ICONS[trade.value] ?? '🔨'}</Text>
              <Text style={[s.tradeLabel, selected === trade.value && s.tradeLabelSelected]}>
                {trade.label}
              </Text>
              {selected === trade.value && (
                <View style={s.checkmark}><Text style={s.checkmarkText}>✓</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextBtn, (!selected || saving) && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selected || saving}
        >
          {saving
            ? <ActivityIndicator color='#fff' />
            : <Text style={s.nextBtnText}>Next: Select Services →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default TradeSelectionScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 20 },
  stepRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: '#1a56db', width: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6b7280' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, paddingBottom: 120 },
  tradeCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tradeCardSelected: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  tradeIcon: { fontSize: 32 },
  tradeLabel: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center' },
  tradeLabelSelected: { color: '#1a56db' },
  checkmark: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1a56db', alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#f9fafb', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  nextBtn: { backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.45 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
