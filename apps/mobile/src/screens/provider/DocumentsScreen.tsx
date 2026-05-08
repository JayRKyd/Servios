'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from '@/lib/supabase'

const DOC_TYPES = [
  { value: 'id',            label: 'Government ID',       required: true },
  { value: 'insurance',     label: 'Liability Insurance', required: true },
  { value: 'certification', label: 'Trade Certification', required: false },
  { value: 'license',       label: 'Business License',    required: false },
  { value: 'other',         label: 'Other',               required: false },
]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: '#fef9c3', text: '#854d0e' },
  verified: { bg: '#dcfce7', text: '#166534' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
}

interface ProviderDoc {
  id: string
  document_type: string
  title: string
  file_url: string
  status: 'pending' | 'verified' | 'rejected'
  expiry_date: string | null
  created_at: string
}

export default function DocumentsScreen() {
  const [docs, setDocs] = useState<ProviderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('id')
  const [title, setTitle] = useState('')
  const [expiry, setExpiry] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const fetchDocs = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('provider_documents')
      .select('*')
      .eq('provider_id', uid)
      .order('created_at', { ascending: false })
    setDocs((data as ProviderDoc[]) ?? [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) { setLoading(false); return }
      setUserId(uid)
      await fetchDocs(uid)
      setLoading(false)
    })
  }, [fetchDocs])

  async function pickAndUpload() {
    const docLabel = DOC_TYPES.find((d) => d.value === selectedType)?.label ?? selectedType
    const docTitle = title.trim() || docLabel

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    if (!userId) return

    setUploading(true)
    try {
      const ext = asset.name.split('.').pop() ?? 'pdf'
      const storagePath = `${userId}/docs/${selectedType}_${Date.now()}.${ext}`

      const response = await fetch(asset.uri)
      const blob = await response.blob()

      const { error: uploadErr } = await supabase.storage
        .from('provider-documents')
        .upload(storagePath, blob, { contentType: asset.mimeType ?? 'application/octet-stream' })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from('provider-documents')
        .getPublicUrl(storagePath)

      const { error: dbErr } = await supabase.from('provider_documents').insert({
        provider_id: userId,
        document_type: selectedType,
        title: docTitle,
        file_url: urlData.publicUrl,
        storage_path: storagePath,
        expiry_date: expiry || null,
        status: 'pending',
      })

      if (dbErr) throw dbErr

      setTitle('')
      setExpiry('')
      await fetchDocs(userId)
      Alert.alert('Uploaded', `${docTitle} uploaded and pending review.`)
    } catch (e: any) {
      Alert.alert('Upload failed', e.message)
    } finally {
      setUploading(false)
    }
  }

  async function deleteDoc(doc: ProviderDoc) {
    Alert.alert('Delete document', `Remove "${doc.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('provider_documents').delete().eq('id', doc.id)
          if (userId) await fetchDocs(userId)
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>My Documents</Text>
      <Text style={s.sub}>Upload certifications, ID, and insurance documents</Text>

      {/* Upload form */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Upload New Document</Text>

        {/* Type selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
          {DOC_TYPES.map((dt) => (
            <TouchableOpacity
              key={dt.value}
              onPress={() => setSelectedType(dt.value)}
              style={[s.chip, selectedType === dt.value && s.chipActive]}
            >
              <Text style={[s.chipText, selectedType === dt.value && s.chipTextActive]}>
                {dt.label}{dt.required ? ' *' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          style={s.input}
          placeholder="Document title (optional)"
          placeholderTextColor="#9ca3af"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={s.input}
          placeholder="Expiry date (YYYY-MM-DD, optional)"
          placeholderTextColor="#9ca3af"
          value={expiry}
          onChangeText={setExpiry}
        />

        <TouchableOpacity
          style={[s.uploadBtn, uploading && s.uploadBtnDisabled]}
          onPress={pickAndUpload}
          disabled={uploading}
        >
          {uploading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.uploadBtnText}>📎 Choose File &amp; Upload</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Existing documents */}
      <Text style={s.sectionTitle}>Uploaded Documents ({docs.length})</Text>

      {docs.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No documents uploaded yet</Text>
        </View>
      ) : (
        docs.map((doc) => {
          const status = STATUS_COLORS[doc.status] ?? STATUS_COLORS.pending
          const typeLabel = DOC_TYPES.find((d) => d.value === doc.document_type)?.label ?? doc.document_type
          return (
            <View key={doc.id} style={[s.docCard, doc.status === 'rejected' && s.docCardRejected]}>
              <View style={s.docRow}>
                <View style={s.docInfo}>
                  <Text style={s.docTitle}>{doc.title}</Text>
                  <Text style={s.docType}>{typeLabel}</Text>
                  {doc.expiry_date && (
                    <Text style={s.docExpiry}>Expires: {doc.expiry_date}</Text>
                  )}
                </View>
                <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[s.statusText, { color: status.text }]}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </Text>
                </View>
              </View>

              {doc.status === 'rejected' && (
                <View style={s.rejectedBanner}>
                  <Text style={s.rejectedText}>
                    This document was rejected. Please upload a new version.
                  </Text>
                </View>
              )}

              <TouchableOpacity onPress={() => deleteDoc(doc)} style={s.deleteBtn}>
                <Text style={s.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )
        })
      )}

      <View style={s.notice}>
        <Text style={s.noticeText}>
          🔒 Documents are stored securely and only reviewed by our verification team.
        </Text>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  content:     { padding: 20, paddingBottom: 40 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading:     { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sub:         { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle:{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  chipRow:     { flexDirection: 'row', marginBottom: 12 },
  chip:        { borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: '#fff' },
  chipActive:  { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText:    { fontSize: 13, color: '#6b7280' },
  chipTextActive: { color: '#2563eb', fontWeight: '600' },
  input:       { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', marginBottom: 10 },
  uploadBtn:   { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText:     { color: '#fff', fontWeight: '600', fontSize: 15 },
  docCard:     { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#f3f4f6' },
  docCardRejected:   { borderColor: '#fca5a5' },
  docRow:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  docInfo:     { flex: 1 },
  docTitle:    { fontSize: 15, fontWeight: '600', color: '#111827' },
  docType:     { fontSize: 12, color: '#6b7280', marginTop: 2 },
  docExpiry:   { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText:  { fontSize: 12, fontWeight: '600' },
  rejectedBanner: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginTop: 10 },
  rejectedText:   { fontSize: 13, color: '#991b1b' },
  deleteBtn:   { marginTop: 10, alignSelf: 'flex-end' },
  deleteBtnText:  { fontSize: 13, color: '#ef4444' },
  empty:       { backgroundColor: '#fff', borderRadius: 14, padding: 32, alignItems: 'center', marginBottom: 16 },
  emptyText:   { color: '#9ca3af', fontSize: 14 },
  notice:      { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginTop: 8 },
  noticeText:  { fontSize: 13, color: '#166534' },
})
