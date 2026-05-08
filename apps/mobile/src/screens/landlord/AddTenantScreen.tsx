import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useAuth } from '@/store/store'

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export function AddTenantScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>()
  const { session } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rent, setRent] = useState('')
  const [saving, setSaving] = useState(false)

  function validate() {
    if (!firstName.trim()) return 'First name is required.'
    if (!lastName.trim()) return 'Last name is required.'
    if (!email.trim() || !email.includes('@')) return 'A valid email is required.'
    if (!startDate.trim()) return 'Tenancy start date is required.'
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) { Alert.alert('Missing info', err); return }

    setSaving(true)
    try {
      const res = await fetch(`${API}/api/v1/properties/${propertyId}/tenants`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          tenancyStartDate: startDate.trim(),
          tenancyEndDate: endDate.trim() || undefined,
          rentAmount: rent ? Math.round(parseFloat(rent) * 100) : undefined,
        }),
      })

      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.message ?? 'Failed to add tenant')
      }

      Alert.alert(
        'Tenant Added ✓',
        `An email invite has been sent to ${email.trim()}. They'll be linked to your property once they join.`,
        [{ text: 'OK', onPress: () => router.back() }],
      )
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add tenant')
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
        <Text style={s.title}>Add Tenant</Text>
      </View>

      <Text style={s.subtitle}>The tenant will receive an email invite to join Servios and will be automatically linked to this property.</Text>

      {/* Name */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Tenant Details</Text>
        <View style={s.row}>
          <View style={s.half}>
            <Text style={s.label}>First Name <Text style={s.req}>*</Text></Text>
            <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder="Jane" placeholderTextColor="#9ca3af" />
          </View>
          <View style={s.half}>
            <Text style={s.label}>Last Name <Text style={s.req}>*</Text></Text>
            <TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder="Smith" placeholderTextColor="#9ca3af" />
          </View>
        </View>

        <Text style={[s.label, s.mt]}>Email <Text style={s.req}>*</Text></Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="tenant@email.com"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[s.label, s.mt]}>Phone <Text style={s.opt}>optional</Text></Text>
        <TextInput
          style={s.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+44 7700 900000"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
        />
      </View>

      {/* Tenancy */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Tenancy Details</Text>

        <Text style={s.label}>Start Date <Text style={s.req}>*</Text></Text>
        <TextInput
          style={s.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
        />

        <Text style={[s.label, s.mt]}>End Date <Text style={s.opt}>optional</Text></Text>
        <TextInput
          style={s.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD (leave blank for rolling)"
          placeholderTextColor="#9ca3af"
        />

        <Text style={[s.label, s.mt]}>Monthly Rent (£) <Text style={s.opt}>optional</Text></Text>
        <TextInput
          style={s.input}
          value={rent}
          onChangeText={setRent}
          placeholder="e.g. 1200.00"
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
        />
      </View>

      <TouchableOpacity
        style={[s.saveBtn, saving && s.dim]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={s.saveBtnText}>Send Invite & Add Tenant</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

export default AddTenantScreen

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  inner:       { padding: 20, paddingBottom: 40 },
  topBar:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 36, marginBottom: 12 },
  back:        { color: '#1a56db', fontSize: 15 },
  title:       { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle:    { fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 20 },
  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 14 },
  row:         { flexDirection: 'row', gap: 10 },
  half:        { flex: 1 },
  label:       { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  mt:          { marginTop: 14 },
  req:         { color: '#ef4444' },
  opt:         { fontWeight: '400', color: '#9ca3af' },
  input:       { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  saveBtn:     { backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dim:         { opacity: 0.5 },
})
