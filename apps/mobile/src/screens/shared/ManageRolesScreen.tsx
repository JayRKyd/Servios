import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useRole, useAuth } from '@/store/store'
import type { Role } from '@/types'

const ROLE_META: Record<Role, { icon: string; label: string; desc: string; color: string; bg: string }> = {
  customer: { icon: '🛒', label: 'Customer',  desc: 'Book services from providers',           color: '#1a56db', bg: '#eff6ff' },
  provider: { icon: '🔧', label: 'Provider',  desc: 'Offer and manage your services',          color: '#16a34a', bg: '#f0fdf4' },
  landlord: { icon: '🏠', label: 'Landlord',  desc: 'Manage properties and maintenance',       color: '#7c3aed', bg: '#f5f3ff' },
  tenant:   { icon: '🔑', label: 'Tenant',    desc: 'Report issues and view service history',  color: '#d97706', bg: '#fffbeb' },
  admin:    { icon: '⚙️', label: 'Admin',     desc: 'Platform management and moderation',      color: '#ef4444', bg: '#fff1f2' },
}

// Roles users can self-add (admin is granted only by platform)
const ADDABLE_ROLES: Role[] = ['customer', 'provider', 'landlord', 'tenant']

export function ManageRolesScreen() {
  const { activeRole, availableRoles, switchRole, isSwitchingRole } = useRole()
  const { session } = useAuth()
  const [addingRole, setAddingRole] = useState<Role | null>(null)

  async function handleSwitch(role: Role) {
    if (role === activeRole) return
    try {
      await switchRole(role)
      router.replace('/(tabs)')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to switch role')
    }
  }

  async function handleAddRole(role: Role) {
    if (!session?.access_token) return
    Alert.alert(
      `Add ${ROLE_META[role].label} role?`,
      `This will add the ${ROLE_META[role].label.toLowerCase()} role to your account. You can switch between roles at any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Role',
          onPress: async () => {
            setAddingRole(role)
            try {
              const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1/users/add-role`, {
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
              Alert.alert('✓ Role added', `The ${ROLE_META[role].label.toLowerCase()} role has been added. Switch to it now?`, [
                { text: 'Later', style: 'cancel' },
                { text: 'Switch Now', onPress: () => handleSwitch(role) },
              ])
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

  const unobtainedRoles = ADDABLE_ROLES.filter(r => !availableRoles.includes(r))

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Manage Roles</Text>
      </View>

      {/* Current role indicator */}
      <View style={[s.activeCard, { borderColor: ROLE_META[activeRole].color, backgroundColor: ROLE_META[activeRole].bg }]}>
        <Text style={s.activeEmoji}>{ROLE_META[activeRole].icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.activeName, { color: ROLE_META[activeRole].color }]}>
            {ROLE_META[activeRole].label}
          </Text>
          <Text style={s.activeSub}>Currently active</Text>
        </View>
      </View>

      {/* Switch between existing roles */}
      {availableRoles.length > 1 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Switch Role</Text>
          {availableRoles.map(role => {
            const meta = ROLE_META[role]
            const isActive = role === activeRole
            return (
              <TouchableOpacity
                key={role}
                style={[s.roleCard, isActive && { borderColor: meta.color }]}
                onPress={() => handleSwitch(role)}
                disabled={isActive || isSwitchingRole}
              >
                <Text style={s.roleIcon}>{meta.icon}</Text>
                <View style={s.roleInfo}>
                  <Text style={[s.roleName, isActive && { color: meta.color }]}>{meta.label}</Text>
                  <Text style={s.roleDesc}>{meta.desc}</Text>
                </View>
                {isActive ? (
                  <View style={[s.activeBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[s.activeBadgeText, { color: meta.color }]}>Active</Text>
                  </View>
                ) : isSwitchingRole ? (
                  <ActivityIndicator size="small" color={meta.color} />
                ) : (
                  <View style={s.switchBtn}>
                    <Text style={s.switchBtnText}>Switch</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Add new roles */}
      {unobtainedRoles.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Add a Role</Text>
          <Text style={s.sectionSub}>Expand what you can do on Servios</Text>
          {unobtainedRoles.map(role => {
            const meta = ROLE_META[role]
            const isAdding = addingRole === role
            return (
              <TouchableOpacity
                key={role}
                style={s.addCard}
                onPress={() => handleAddRole(role)}
                disabled={isAdding || !!addingRole}
              >
                <Text style={s.roleIcon}>{meta.icon}</Text>
                <View style={s.roleInfo}>
                  <Text style={s.roleName}>{meta.label}</Text>
                  <Text style={s.roleDesc}>{meta.desc}</Text>
                </View>
                {isAdding
                  ? <ActivityIndicator size="small" color={meta.color} />
                  : (
                    <View style={[s.addBtn, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                      <Text style={[s.addBtnText, { color: meta.color }]}>+ Add</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

export default ManageRolesScreen

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f9fafb' },
  inner:          { padding: 20, paddingBottom: 40 },
  topBar:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 36, marginBottom: 20 },
  back:           { color: '#1a56db', fontSize: 15 },
  title:          { fontSize: 20, fontWeight: '700', color: '#111827' },
  activeCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 2, padding: 16, marginBottom: 24 },
  activeEmoji:    { fontSize: 32 },
  activeName:     { fontSize: 18, fontWeight: '700' },
  activeSub:      { fontSize: 13, color: '#6b7280', marginTop: 2 },
  section:        { marginBottom: 24 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSub:     { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  roleCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  addCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f3f4f6', borderStyle: 'dashed' },
  roleIcon:       { fontSize: 28 },
  roleInfo:       { flex: 1 },
  roleName:       { fontSize: 15, fontWeight: '600', color: '#111827' },
  roleDesc:       { fontSize: 12, color: '#6b7280', marginTop: 2 },
  activeBadge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText:{ fontSize: 12, fontWeight: '700' },
  switchBtn:      { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  switchBtnText:  { fontSize: 13, fontWeight: '600', color: '#374151' },
  addBtn:         { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText:     { fontSize: 13, fontWeight: '700' },
})
