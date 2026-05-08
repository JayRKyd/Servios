import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Template {
  id: string
  name: string
  description: string | null
  price_min: number | null
  price_max: number | null
  price_type: 'fixed' | 'hourly' | 'quote'
}

interface SelectedService {
  templateId: string | null
  name: string
  description: string
  price: string
  priceType: 'fixed' | 'hourly' | 'quote'
  isCustom: boolean
}

const PRICE_TYPE_LABELS = { fixed: 'Fixed', hourly: '/hr', quote: 'Quote' }

export function ServiceTemplateScreen() {
  const { session } = useAuth()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected, setSelected] = useState<Record<string, SelectedService>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customPriceType, setCustomPriceType] = useState<'fixed' | 'hourly' | 'quote'>('fixed')

  useEffect(() => {
    // First get the trade category from onboarding status
    fetch(`${API_URL}/api/v1/onboarding/status`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
      .then((r) => r.json())
      .then((status) => {
        if (!status.trade_category) {
          router.replace('/(onboarding)/trade')
          return
        }
        return fetch(`${API_URL}/api/v1/onboarding/templates/${status.trade_category}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
          .then((r) => r.json())
          .then((d) => setTemplates(d.templates ?? []))
      })
      .catch(() => Alert.alert('Error', 'Could not load services.'))
      .finally(() => setLoading(false))
  }, [session?.access_token])

  function toggleTemplate(t: Template) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[t.id]) {
        delete next[t.id]
      } else {
        next[t.id] = {
          templateId: t.id,
          name: t.name,
          description: t.description ?? '',
          price: t.price_min != null ? String(t.price_min) : '',
          priceType: t.price_type,
          isCustom: false,
        }
      }
      return next
    })
  }

  function updatePrice(id: string, price: string) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], price } }))
  }

  function addCustomService() {
    if (!customName.trim() || !customPrice.trim()) {
      Alert.alert('Required', 'Please enter a name and price.')
      return
    }
    const id = `custom_${Date.now()}`
    setSelected((prev) => ({
      ...prev,
      [id]: {
        templateId: null,
        name: customName.trim(),
        description: '',
        price: customPrice.trim(),
        priceType: customPriceType,
        isCustom: true,
      },
    }))
    setCustomName('')
    setCustomPrice('')
    setShowCustomForm(false)
  }

  async function handleNext() {
    const services = Object.values(selected)
    if (services.length === 0) {
      Alert.alert('Required', 'Please select at least one service you offer.')
      return
    }

    // Validate all prices are filled in
    const missingPrice = services.find((s) => s.priceType !== 'quote' && (!s.price || isNaN(Number(s.price))))
    if (missingPrice) {
      Alert.alert('Missing price', `Please enter a price for "${missingPrice.name}".`)
      return
    }

    setSaving(true)
    try {
      const payload = services.map((s) => ({
        templateId: s.templateId,
        name: s.name,
        description: s.description || undefined,
        price: s.priceType === 'quote' ? 0 : Number(s.price),
        priceType: s.priceType,
      }))

      const res = await fetch(`${API_URL}/api/v1/onboarding/services`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ services: payload }),
      })
      if (!res.ok) throw new Error('Failed to save services')
      router.push('/(onboarding)/documents')
    } catch {
      Alert.alert('Error', 'Could not save your services. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = Object.keys(selected).length

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.stepRow}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[s.stepDot, n <= 2 && s.stepDotActive]} />
          ))}
        </View>
        <Text style={s.title}>Your services</Text>
        <Text style={s.subtitle}>Tick what you offer and set your prices</Text>
      </View>

      {loading ? (
        <ActivityIndicator color='#1a56db' style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {templates.map((t) => {
            const isSelected = Boolean(selected[t.id])
            const svc = selected[t.id]
            return (
              <View key={t.id} style={[s.card, isSelected && s.cardSelected]}>
                <TouchableOpacity style={s.cardTop} onPress={() => toggleTemplate(t)} activeOpacity={0.7}>
                  <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                    {isSelected && <Text style={s.checkboxTick}>✓</Text>}
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.cardName}>{t.name}</Text>
                    {t.description ? <Text style={s.cardDesc}>{t.description}</Text> : null}
                    {t.price_min && t.price_max ? (
                      <Text style={s.cardRange}>
                        Typical: USD {t.price_min}–{t.price_max}
                        {t.price_type === 'hourly' ? '/hr' : ''}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[s.priceBadge, { backgroundColor: isSelected ? '#dbeafe' : '#f3f4f6' }]}>
                    <Text style={[s.priceBadgeText, { color: isSelected ? '#1e40af' : '#9ca3af' }]}>
                      {PRICE_TYPE_LABELS[t.price_type]}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isSelected && t.price_type !== 'quote' && (
                  <View style={s.priceInputRow}>
                    <Text style={s.priceInputLabel}>Your price (USD)</Text>
                    <TextInput
                      style={s.priceInput}
                      value={svc?.price ?? ''}
                      onChangeText={(v) => updatePrice(t.id, v)}
                      keyboardType='decimal-pad'
                      placeholder={t.price_min ? String(t.price_min) : '0'}
                      placeholderTextColor='#9ca3af'
                    />
                  </View>
                )}
              </View>
            )
          })}

          {/* Custom services added */}
          {Object.values(selected).filter((s) => s.isCustom).map((svc) => (
            <View key={svc.name} style={[s.card, s.cardSelected, s.cardCustom]}>
              <View style={s.cardTop}>
                <View style={[s.checkbox, s.checkboxSelected]}>
                  <Text style={s.checkboxTick}>✓</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{svc.name}</Text>
                  <Text style={s.cardDesc}>Custom service · USD {svc.price}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const id = Object.keys(selected).find((k) => selected[k] === svc)
                    if (id) setSelected((prev) => { const n = { ...prev }; delete n[id]; return n })
                  }}
                >
                  <Text style={s.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add custom service */}
          {showCustomForm ? (
            <View style={s.customForm}>
              <Text style={s.customFormTitle}>Add custom service</Text>
              <TextInput
                style={s.customInput}
                value={customName}
                onChangeText={setCustomName}
                placeholder='Service name'
                placeholderTextColor='#9ca3af'
              />
              <View style={s.customPriceRow}>
                <TextInput
                  style={[s.customInput, { flex: 1 }]}
                  value={customPrice}
                  onChangeText={setCustomPrice}
                  placeholder='Price (USD)'
                  keyboardType='decimal-pad'
                  placeholderTextColor='#9ca3af'
                />
                <View style={s.priceTypeToggle}>
                  {(['fixed', 'hourly', 'quote'] as const).map((pt) => (
                    <TouchableOpacity
                      key={pt}
                      style={[s.ptBtn, customPriceType === pt && s.ptBtnActive]}
                      onPress={() => setCustomPriceType(pt)}
                    >
                      <Text style={[s.ptBtnText, customPriceType === pt && s.ptBtnTextActive]}>
                        {PRICE_TYPE_LABELS[pt]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.customFormBtns}>
                <TouchableOpacity style={s.customCancelBtn} onPress={() => setShowCustomForm(false)}>
                  <Text style={s.customCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.customAddBtn} onPress={addCustomService}>
                  <Text style={s.customAddText}>Add Service</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.addCustomBtn} onPress={() => setShowCustomForm(true)}>
              <Text style={s.addCustomText}>+ Add a service not listed above</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      <View style={s.footer}>
        <Text style={s.selectedCount}>{selectedCount} service{selectedCount !== 1 ? 's' : ''} selected</Text>
        <TouchableOpacity
          style={[s.nextBtn, (selectedCount === 0 || saving) && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={selectedCount === 0 || saving}
        >
          {saving
            ? <ActivityIndicator color='#fff' />
            : <Text style={s.nextBtnText}>Next: Upload Documents →</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

export default ServiceTemplateScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#1a56db', fontSize: 15 },
  stepRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: '#1a56db', width: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280' },
  list: { paddingHorizontal: 16, gap: 10, paddingTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: '#f3f4f6', overflow: 'hidden' },
  cardSelected: { borderColor: '#1a56db' },
  cardCustom: { borderStyle: 'dashed' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxSelected: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  cardDesc: { fontSize: 12, color: '#6b7280', lineHeight: 17 },
  cardRange: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
  priceBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  priceBadgeText: { fontSize: 11, fontWeight: '600' },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  priceInputLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  priceInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, fontSize: 15, color: '#111827', textAlign: 'right' },
  removeText: { color: '#ef4444', fontSize: 12 },
  addCustomBtn: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#d1d5db', borderRadius: 14, padding: 16, alignItems: 'center' },
  addCustomText: { color: '#1a56db', fontSize: 14, fontWeight: '600' },
  customForm: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#1a56db', gap: 10 },
  customFormTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  customInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#111827' },
  customPriceRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  priceTypeToggle: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  ptBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  ptBtnActive: { backgroundColor: '#1a56db' },
  ptBtnText: { fontSize: 12, color: '#6b7280' },
  ptBtnTextActive: { color: '#fff', fontWeight: '600' },
  customFormBtns: { flexDirection: 'row', gap: 8 },
  customCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  customCancelText: { color: '#6b7280', fontSize: 14 },
  customAddBtn: { flex: 1, backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  customAddText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#f9fafb', borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 8 },
  selectedCount: { textAlign: 'center', fontSize: 13, color: '#6b7280' },
  nextBtn: { backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.45 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
