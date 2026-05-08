import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/store/store'
import { supabase } from '@/lib/supabase'

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export function EditProfileScreen() {
  const { user, session } = useAuth()

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '')
      setLastName(user.last_name ?? '')
      setPhone(user.phone ?? '')
    }
  }, [user])

  async function handleSave() {
    if (!firstName.trim()) { Alert.alert('Required', 'First name cannot be empty.'); return }
    if (!lastName.trim()) { Alert.alert('Required', 'Last name cannot be empty.'); return }

    setSaving(true)
    try {
      const res = await fetch(`${API}/api/v1/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.message ?? 'Failed to update profile')
      }
      Alert.alert('Profile Updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save profile')
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
        <Text style={s.title}>Edit Profile</Text>
      </View>

      {/* Avatar placeholder */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarInitials}>
            {(firstName?.[0] ?? '?').toUpperCase()}{(lastName?.[0] ?? '').toUpperCase()}
          </Text>
        </View>
        <Text style={s.avatarHint}>Photo editing coming soon</Text>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Personal Information</Text>

        <View style={s.row}>
          <View style={s.half}>
            <Text style={s.label}>First Name <Text style={s.req}>*</Text></Text>
            <TextInput
              style={s.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={s.half}>
            <Text style={s.label}>Last Name <Text style={s.req}>*</Text></Text>
            <TextInput
              style={s.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <Text style={[s.label, s.mt]}>Phone <Text style={s.opt}>optional</Text></Text>
        <TextInput
          style={s.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+44 7700 900000"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
        />

        <Text style={[s.label, s.mt]}>Email</Text>
        <View style={s.readOnly}>
          <Text style={s.readOnlyText}>{user?.email ?? '—'}</Text>
        </View>
        <Text style={s.hint}>Email cannot be changed here. Contact support if needed.</Text>
      </View>

      <TouchableOpacity
        style={[s.saveBtn, saving && s.dim]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={s.saveBtnText}>Save Changes</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

export default EditProfileScreen

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  inner:        { padding: 20, paddingBottom: 40 },
  topBar:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 36, marginBottom: 24 },
  back:         { color: '#1a56db', fontSize: 15 },
  title:        { fontSize: 20, fontWeight: '700', color: '#111827' },
  avatarSection:{ alignItems: 'center', marginBottom: 24, gap: 8 },
  avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a56db', alignItems: 'center', justifyContent: 'center' },
  avatarInitials:{ fontSize: 28, fontWeight: '700', color: '#fff' },
  avatarHint:   { fontSize: 12, color: '#9ca3af' },
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 14 },
  row:          { flexDirection: 'row', gap: 10 },
  half:         { flex: 1 },
  label:        { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  mt:           { marginTop: 14 },
  req:          { color: '#ef4444' },
  opt:          { fontWeight: '400', color: '#9ca3af' },
  input:        { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  readOnly:     { borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f9fafb' },
  readOnlyText: { fontSize: 14, color: '#9ca3af' },
  hint:         { fontSize: 12, color: '#9ca3af', marginTop: 5 },
  saveBtn:      { backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  dim:          { opacity: 0.5 },
})
