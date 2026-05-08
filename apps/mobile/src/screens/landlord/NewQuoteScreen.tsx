import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

interface Property { id: string; name: string; address_line1: string }
interface Provider { id: string; business_name: string | null; first_name: string | null; last_name: string | null; trade_category: string | null }

const SERVICE_TYPES = ['Plumbing', 'Electrical', 'Gas', 'Roofing', 'Plastering', 'Carpentry', 'Painting', 'HVAC', 'General Maintenance', 'Other']
const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export function NewQuoteScreen() {
  const { user, session } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedProperty, setSelectedProperty] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user) return
      const [{ data: props }, { data: preferred }] = await Promise.all([
        supabase.from('properties').select('id, name, address_line1').eq('landlord_id', user.id),
        supabase.from('preferred_providers').select(`
          provider:provider_profiles(id, business_name, trade_category,
            users:user_id(first_name, last_name))
        `).eq('landlord_id', user.id),
      ])
      setProperties(props ?? [])
      if (props?.[0]) setSelectedProperty(props[0].id)
      setProviders((preferred ?? []).map((p: any) => ({
        id: p.provider?.id,
        business_name: p.provider?.business_name,
        first_name: p.provider?.users?.first_name,
        last_name: p.provider?.users?.last_name,
        trade_category: p.provider?.trade_category,
      })).filter((p: Provider) => p.id))
    }
    load()
  }, [user])

  function toggleProvider(id: string) {
    setSelectedProviders(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title.'); return }
    if (!selectedProperty) { Alert.alert('Required', 'Please select a property.'); return }
    if (selectedProviders.length === 0) { Alert.alert('Required', 'Select at least one provider to receive the quote request.'); return }

    setSaving(true)
    try {
      const res = await fetch(`${API}/api/v1/quotes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: selectedProperty,
          title: title.trim(),
          description: description.trim() || undefined,
          serviceType: serviceType || undefined,
          scheduledDate: scheduledDate.trim() || undefined,
          providerIds: selectedProviders,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.message ?? 'Failed to create')
      }
      const { quoteRequest } = await res.json()
      Alert.alert('Quote Request Sent ✓', `${selectedProviders.length} provider${selectedProviders.length !== 1 ? 's' : ''} will receive your request and can submit quotes.`, [
        { text: 'View Request', onPress: () => router.replace(`/(tabs)/quotes/${quoteRequest.id}` as any) },
      ])
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create quote request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>New Quote Request</Text>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Job Details</Text>

        <Text style={s.label}>Title <Text style={s.req}>*</Text></Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Replace boiler" placeholderTextColor="#9ca3af" />

        <Text style={[s.label, s.mt]}>Description <Text style={s.opt}>optional</Text></Text>
        <TextInput
          style={[s.input, s.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the work needed in detail…"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={[s.label, s.mt]}>Property <Text style={s.req}>*</Text></Text>
        {properties.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[s.selectRow, selectedProperty === p.id && s.selectRowActive]}
            onPress={() => setSelectedProperty(p.id)}
          >
            <View style={[s.radio, selectedProperty === p.id && s.radioActive]} />
            <Text style={s.selectText}>{p.name ?? p.address_line1}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[s.label, s.mt]}>Service Type <Text style={s.opt}>optional</Text></Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeChips}>
          {SERVICE_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[s.typeChip, serviceType === t && s.typeChipActive]}
              onPress={() => setServiceType(prev => prev === t ? '' : t)}
            >
              <Text style={[s.typeChipText, serviceType === t && s.typeChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[s.label, s.mt]}>Preferred Date <Text style={s.opt}>optional</Text></Text>
        <TextInput
          style={s.input}
          value={scheduledDate}
          onChangeText={setScheduledDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Select Providers <Text style={s.req}>*</Text></Text>
        <Text style={s.sectionSub}>Choose who receives this quote request. Only your preferred providers are shown.</Text>
        {providers.length === 0 ? (
          <View style={s.noProviders}>
            <Text style={s.noProvidersText}>No preferred providers yet. Add providers from the Providers tab first.</Text>
          </View>
        ) : (
          providers.map(p => {
            const selected = selectedProviders.includes(p.id)
            return (
              <TouchableOpacity
                key={p.id}
                style={[s.providerRow, selected && s.providerRowActive]}
                onPress={() => toggleProvider(p.id)}
              >
                <View style={[s.checkbox, selected && s.checkboxActive]}>
                  {selected && <Text style={s.checkmark}>✓</Text>}
                </View>
                <View style={s.providerInfo}>
                  <Text style={s.providerName}>{p.business_name ?? `${p.first_name} ${p.last_name}`}</Text>
                  <Text style={s.providerTrade}>{p.trade_category}</Text>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </View>

      <TouchableOpacity
        style={[s.createBtn, (saving || providers.length === 0) && s.dim]}
        onPress={handleCreate}
        disabled={saving || providers.length === 0}
      >
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={s.createBtnText}>Send Quote Request</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

export default NewQuoteScreen

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f9fafb' },
  inner:            { padding: 20, paddingBottom: 40 },
  topBar:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 36, marginBottom: 20 },
  back:             { color: '#7c3aed', fontSize: 15 },
  title:            { fontSize: 20, fontWeight: '700', color: '#111827' },
  card:             { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSub:       { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  label:            { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  mt:               { marginTop: 14 },
  req:              { color: '#ef4444' },
  opt:              { fontWeight: '400', color: '#9ca3af' },
  input:            { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  multiline:        { minHeight: 80, paddingTop: 10 },
  selectRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  selectRowActive:  { },
  radio:            { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#d1d5db' },
  radioActive:      { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
  selectText:       { fontSize: 14, color: '#111827' },
  typeChips:        { gap: 8, paddingBottom: 4 },
  typeChip:         { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  typeChipActive:   { backgroundColor: '#f5f3ff', borderColor: '#7c3aed' },
  typeChipText:     { fontSize: 12, color: '#374151' },
  typeChipTextActive:{ color: '#7c3aed', fontWeight: '600' },
  noProviders:      { padding: 12, backgroundColor: '#f9fafb', borderRadius: 10 },
  noProvidersText:  { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  providerRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  providerRowActive:{ },
  checkbox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkboxActive:   { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
  checkmark:        { color: '#fff', fontSize: 13, fontWeight: '700' },
  providerInfo:     { flex: 1 },
  providerName:     { fontSize: 14, fontWeight: '600', color: '#111827' },
  providerTrade:    { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  createBtn:        { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  createBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  dim:              { opacity: 0.5 },
})
