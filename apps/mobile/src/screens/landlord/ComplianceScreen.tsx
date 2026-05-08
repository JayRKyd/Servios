import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/store'

interface Certificate {
  id: string
  property_id: string
  type: string
  certificate_number: string | null
  issue_date: string | null
  expiry_date: string | null
  document_url: string | null
  status: 'valid' | 'expiring_soon' | 'expired' | 'missing'
  properties: { name: string; address_line1: string } | null
}

const CERT_TYPES = [
  { key: 'gas_safe',     label: 'Gas Safe',         icon: '🔥', required: true },
  { key: 'eicr',         label: 'EICR',             icon: '⚡', required: true },
  { key: 'epc',          label: 'EPC',              icon: '🏷',  required: true },
  { key: 'fire_safety',  label: 'Fire Safety',      icon: '🧯', required: false },
  { key: 'pat_testing',  label: 'PAT Testing',      icon: '🔌', required: false },
  { key: 'asbestos',     label: 'Asbestos Survey',  icon: '🪨', required: false },
  { key: 'legionella',   label: 'Legionella Risk',  icon: '💧', required: false },
]

function daysUntil(iso: string | null) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusFromDays(days: number | null): Certificate['status'] {
  if (days === null) return 'missing'
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'valid'
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  valid:          { bg: '#dcfce7', text: '#15803d', label: 'Valid' },
  expiring_soon:  { bg: '#fef9c3', text: '#a16207', label: 'Expiring soon' },
  expired:        { bg: '#fee2e2', text: '#b91c1c', label: 'Expired' },
  missing:        { bg: '#f3f4f6', text: '#6b7280', label: 'Not uploaded' },
}

export function ComplianceScreen() {
  const { user } = useAuth()
  const [certs, setCerts] = useState<Certificate[]>([])
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addType, setAddType] = useState(CERT_TYPES[0].key)
  const [addPropertyId, setAddPropertyId] = useState('')
  const [addExpiry, setAddExpiry] = useState('')
  const [addNumber, setAddNumber] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchCerts() {
    if (!user) return
    const { data: props } = await supabase
      .from('properties')
      .select('id, name, address_line1')
      .eq('landlord_id', user.id)

    setProperties(props?.map(p => ({ id: p.id, name: p.name ?? p.address_line1 })) ?? [])

    if (!props || props.length === 0) { setCerts([]); return }

    const { data } = await supabase
      .from('property_certificates')
      .select('*, properties:property_id (name, address_line1)')
      .in('property_id', props.map(p => p.id))
      .order('expiry_date', { ascending: true })

    setCerts(
      (data ?? []).map((c: any) => ({
        ...c,
        status: statusFromDays(daysUntil(c.expiry_date)),
      }))
    )
  }

  useEffect(() => {
    fetchCerts().finally(() => setLoading(false))
  }, [user])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchCerts()
    setRefreshing(false)
  }

  async function handleAdd() {
    if (!addExpiry.trim()) { Alert.alert('Required', 'Please enter an expiry date.'); return }
    if (!addPropertyId) { Alert.alert('Required', 'Please select a property.'); return }
    setSaving(true)
    try {
      await supabase.from('property_certificates').insert({
        property_id: addPropertyId,
        type: addType,
        expiry_date: addExpiry.trim(),
        certificate_number: addNumber.trim() || null,
      })
      await fetchCerts()
      setShowAddModal(false)
      setAddExpiry(''); setAddNumber('')
    } catch {
      Alert.alert('Error', 'Failed to save certificate.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = selectedProperty === 'all'
    ? certs
    : certs.filter(c => c.property_id === selectedProperty)

  const urgent = filtered.filter(c => c.status === 'expired' || c.status === 'expiring_soon')

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#1a56db" /></View>
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Compliance</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => {
          setAddPropertyId(properties[0]?.id ?? '')
          setShowAddModal(true)
        }}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Property filter */}
      {properties.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {[{ id: 'all', name: 'All Properties' }, ...properties].map(p => (
            <TouchableOpacity
              key={p.id}
              style={[s.chip, selectedProperty === p.id && s.chipActive]}
              onPress={() => setSelectedProperty(p.id)}
            >
              <Text style={[s.chipText, selectedProperty === p.id && s.chipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Urgent alert */}
      {urgent.length > 0 && (
        <View style={s.urgentBanner}>
          <Text style={s.urgentText}>⚠️ {urgent.length} certificate{urgent.length !== 1 ? 's' : ''} need{urgent.length === 1 ? 's' : ''} attention</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1a56db" />}
        contentContainerStyle={filtered.length === 0 ? s.emptyContainer : s.list}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>No certificates yet</Text>
            <Text style={s.emptySub}>Upload Gas Safe, EICR, EPC and other compliance documents to stay on top of requirements.</Text>
          </View>
        }
        renderItem={({ item: cert }) => {
          const days = daysUntil(cert.expiry_date)
          const st = STATUS_STYLE[cert.status]
          const certType = CERT_TYPES.find(t => t.key === cert.type)
          return (
            <View style={s.card}>
              <View style={s.cardRow}>
                <Text style={s.certIcon}>{certType?.icon ?? '📄'}</Text>
                <View style={s.cardBody}>
                  <View style={s.nameRow}>
                    <Text style={s.certName}>{certType?.label ?? cert.type}</Text>
                    {certType?.required && <Text style={s.required}>Required</Text>}
                  </View>
                  <Text style={s.propName} numberOfLines={1}>
                    {(cert.properties as any)?.name ?? (cert.properties as any)?.address_line1}
                  </Text>
                  <Text style={s.expiry}>Expires: {formatDate(cert.expiry_date)}</Text>
                  {days !== null && days >= 0 && days <= 30 && (
                    <Text style={s.daysLeft}>⏳ {days} day{days !== 1 ? 's' : ''} left</Text>
                  )}
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
            </View>
          )
        }}
      />

      {/* Add modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={s.modalInner} keyboardShouldPersistTaps="handled">
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add Certificate</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.fieldLabel}>Certificate Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeChips}>
            {CERT_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[s.typeChip, addType === t.key && s.typeChipActive]}
                onPress={() => setAddType(t.key)}
              >
                <Text style={s.typeChipIcon}>{t.icon}</Text>
                <Text style={[s.typeChipText, addType === t.key && s.typeChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {properties.length > 1 && (
            <>
              <Text style={[s.fieldLabel, s.mt]}>Property</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeChips}>
                {properties.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.typeChip, addPropertyId === p.id && s.typeChipActive]}
                    onPress={() => setAddPropertyId(p.id)}
                  >
                    <Text style={[s.typeChipText, addPropertyId === p.id && s.typeChipTextActive]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={[s.fieldLabel, s.mt]}>Expiry Date <Text style={s.req}>*</Text></Text>
          <TextInput
            style={s.input}
            value={addExpiry}
            onChangeText={setAddExpiry}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />

          <Text style={[s.fieldLabel, s.mt]}>Certificate Number <Text style={s.opt}>optional</Text></Text>
          <TextInput
            style={s.input}
            value={addNumber}
            onChangeText={setAddNumber}
            placeholder="e.g. GS-123456"
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity style={[s.saveBtn, saving && s.dim]} onPress={handleAdd} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save Certificate</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  )
}

export default ComplianceScreen

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f9fafb' },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title:           { fontSize: 24, fontWeight: '700', color: '#111827' },
  addBtn:          { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:      { color: '#fff', fontWeight: '700', fontSize: 13 },
  chips:           { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip:            { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive:      { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText:        { fontSize: 13, color: '#374151' },
  chipTextActive:  { color: '#fff', fontWeight: '600' },
  urgentBanner:    { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff7ed', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  urgentText:      { fontSize: 13, color: '#b45309', fontWeight: '600' },
  list:            { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyState:      { alignItems: 'center', gap: 10 },
  emptyIcon:       { fontSize: 48 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySub:        { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  card:            { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  certIcon:        { fontSize: 28 },
  cardBody:        { flex: 1, gap: 2 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  certName:        { fontSize: 15, fontWeight: '600', color: '#111827' },
  required:        { fontSize: 10, color: '#7c3aed', fontWeight: '700', backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  propName:        { fontSize: 12, color: '#6b7280' },
  expiry:          { fontSize: 12, color: '#6b7280' },
  daysLeft:        { fontSize: 12, color: '#b45309', fontWeight: '600' },
  badge:           { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText:       { fontSize: 11, fontWeight: '700' },
  modal:           { flex: 1, backgroundColor: '#f9fafb' },
  modalInner:      { padding: 24, paddingBottom: 40 },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle:      { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalClose:      { fontSize: 18, color: '#6b7280', padding: 4 },
  fieldLabel:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  mt:              { marginTop: 16 },
  req:             { color: '#ef4444' },
  opt:             { fontWeight: '400', color: '#9ca3af' },
  typeChips:       { gap: 8, paddingBottom: 4 },
  typeChip:        { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', gap: 4 },
  typeChipActive:  { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' },
  typeChipIcon:    { fontSize: 20 },
  typeChipText:    { fontSize: 12, color: '#374151', fontWeight: '500' },
  typeChipTextActive:{ color: '#7c3aed', fontWeight: '700' },
  input:           { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  saveBtn:         { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  dim:             { opacity: 0.5 },
})
