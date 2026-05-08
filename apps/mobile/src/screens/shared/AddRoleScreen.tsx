import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useRole, useAuth } from '@/store/store'
import type { Role } from '@/types'

const ROLE_META: Record<string, { icon: string; label: string; desc: string; color: string; bg: string }> = {
  customer: { icon: '🛒', label: 'Customer',  desc: 'Book services from providers',          color: '#1a56db', bg: '#eff6ff' },
  provider: { icon: '🔧', label: 'Provider',  desc: 'Offer and manage your services',         color: '#16a34a', bg: '#f0fdf4' },
  landlord: { icon: '🏠', label: 'Landlord',  desc: 'Manage properties and maintenance',      color: '#7c3aed', bg: '#f5f3ff' },
  tenant:   { icon: '🔑', label: 'Tenant',    desc: 'Report issues and view service history', color: '#d97706', bg: '#fffbeb' },
}

const ADDABLE_ROLES = ['customer', 'provider', 'landlord', 'tenant'] as const

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export function AddRoleScreen() {
  const { availableRoles, switchRole } = useRole()
  const { session } = useAuth()
  const [addingRole, setAddingRole] = useState<string | null>(null)

  const unobtainedRoles = ADDABLE_ROLES.filter(r => !availableRoles.includes(r as Role))

  async function handleAddRole(role: string) {
    if (!session?.access_token) return
    const meta = ROLE_META[role]
    Alert.alert(
      `Add ${meta.label} role?`,
      `This adds the ${meta.label.toLowerCase()} role to your account. You can switch between roles at any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Role',
          onPress: async () => {
            setAddingRole(role)
            try {
              const res = await fetch(`${API}/api/v1/users/add-role`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role }),
              })
              if (!res.ok) {
                const j = await res.json()
                throw new Error(j.message ?? 'Failed to add role')
              }
              Alert.alert(
                '✓ Role Added',
                `The ${meta.label.toLowerCase()} role has been added to your account.`,
                [
                  { text: 'Later', style: 'cancel' },
                  {
                    text: 'Switch Now',
                    onPress: async () => {
                      await switchRole(role as Role)
                      router.replace('/(tabs)')
                    },
                  },
                ],
              )
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add role')
            } finally {
              setAddingRole(null)
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
        <Text style={s.title}>Add a Role</Text>
      </View>

      <Text style={s.subtitle}>Expand what you can do on Servios. Each role gives you access to different features.</Text>

      {unobtainedRoles.length === 0 ? (
        <View style={s.allDone}>
          <Text style={s.allDoneEmoji}>🎉</Text>
          <Text style={s.allDoneText}>You have all available roles</Text>
          <Text style={s.allDoneSub}>Use the role switcher to move between them.</Text>
        </View>
      ) : (
        <View style={s.list}>
          {unobtainedRoles.map(role => {
            const meta = ROLE_META[role]
            const isAdding = addingRole === role
            return (
              <TouchableOpacity
                key={role}
                style={s.roleCard}
                onPress={() => handleAddRole(role)}
                disabled={isAdding || !!addingRole}
              >
                <View style={[s.iconBox, { backgroundColor: meta.bg }]}>
                  <Text style={s.icon}>{meta.icon}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.roleName}>{meta.label}</Text>
                  <Text style={s.roleDesc}>{meta.desc}</Text>
                </View>
                {isAdding
                  ? <ActivityIndicator size="small" color={meta.color} />
                  : (
                    <View style={[s.addBtn, { borderColor: meta.color, backgroundColor: meta.bg }]}>
                      <Text style={[s.addBtnText, { color: meta.color }]}>+ Add</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Already have roles */}
      {availableRoles.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Your Current Roles</Text>
          {availableRoles.map(role => {
            const meta = ROLE_META[role as string]
            if (!meta) return null
            return (
              <View key={role} style={[s.existingRole, { borderColor: meta.color }]}>
                <Text style={s.icon}>{meta.icon}</Text>
                <Text style={[s.roleName, { color: meta.color }]}>{meta.label}</Text>
                <View style={[s.ownedBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[s.ownedBadgeText, { color: meta.color }]}>Owned</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

export default AddRoleScreen

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f9fafb' },
  inner:          { padding: 20, paddingBottom: 40 },
  topBar:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 36, marginBottom: 12 },
  back:           { color: '#1a56db', fontSize: 15 },
  title:          { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle:       { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 24 },
  list:           { gap: 12, marginBottom: 28 },
  roleCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  iconBox:        { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  icon:           { fontSize: 26 },
  info:           { flex: 1 },
  roleName:       { fontSize: 15, fontWeight: '700', color: '#111827' },
  roleDesc:       { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addBtn:         { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText:     { fontSize: 13, fontWeight: '700' },
  allDone:        { alignItems: 'center', paddingVertical: 48, gap: 8 },
  allDoneEmoji:   { fontSize: 40 },
  allDoneText:    { fontSize: 17, fontWeight: '700', color: '#111827' },
  allDoneSub:     { fontSize: 14, color: '#6b7280' },
  section:        { marginTop: 4 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  existingRole:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1.5 },
  ownedBadge:     { marginLeft: 'auto', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  ownedBadgeText: { fontSize: 11, fontWeight: '700' },
})
