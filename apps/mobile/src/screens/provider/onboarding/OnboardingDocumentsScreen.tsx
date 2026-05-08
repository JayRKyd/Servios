import { useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native'
import { router } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '@/store/store'
import { supabase } from '@/lib/supabase'

const DOC_TYPES = [
  { value: 'id',            label: 'Government ID',     required: true },
  { value: 'insurance',     label: 'Liability Insurance', required: true },
  { value: 'certification', label: 'Trade Certification', required: false },
  { value: 'license',       label: 'Business License',   required: false },
]

interface UploadedDoc {
  type: string
  title: string
  fileName: string
  url: string
  expiryDate: string
}

export function OnboardingDocumentsScreen() {
  const { session } = useAuth()
  const [uploads, setUploads] = useState<UploadedDoc[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({})

  const uploadedTypes = new Set(uploads.map((u) => u.type))
  const requiredComplete = DOC_TYPES.filter((d) => d.required).every((d) => uploadedTypes.has(d.value))

  async function handleUpload(docType: string, docLabel: string) {
    setUploading(docType)
    try {
      let uri: string | null = null
      let fileName: string = 'document'
      let mimeType: string = 'application/octet-stream'

      // Try document picker first (PDFs + images)
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })

      if (result.canceled || !result.assets?.[0]) {
        setUploading(null)
        return
      }

      uri = result.assets[0].uri
      fileName = result.assets[0].name ?? `${docType}_${Date.now()}`
      mimeType = result.assets[0].mimeType ?? 'application/octet-stream'

      if (!session?.user?.id) throw new Error('Not authenticated')

      const ext = fileName.split('.').pop() ?? 'pdf'
      const storagePath = `${session.user.id}/onboarding/${docType}_${Date.now()}.${ext}`

      const response = await fetch(uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('provider-documents')
        .upload(storagePath, blob, { contentType: mimeType })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('provider-documents')
        .getPublicUrl(storagePath)

      // Save to provider_documents table
      await supabase.from('provider_documents').insert({
        provider_id: session.user.id,
        document_type: docType,
        title: docLabel,
        file_url: urlData.publicUrl,
        storage_path: storagePath,
        expiry_date: expiryDates[docType] || null,
        status: 'pending',
      })

      setUploads((prev) => [
        ...prev.filter((u) => u.type !== docType),
        { type: docType, title: docLabel, fileName, url: urlData.publicUrl, expiryDate: expiryDates[docType] ?? '' },
      ])
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Please try again.')
    } finally {
      setUploading(null)
    }
  }

  async function handleSubmit() {
    if (!requiredComplete) {
      Alert.alert('Required documents', 'Please upload your Government ID and Liability Insurance to continue.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1/onboarding/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error('Submit failed')
      router.replace('/(onboarding)/complete')
    } catch {
      Alert.alert('Error', 'Could not submit your application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.stepRow}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[s.stepDot, s.stepDotActive]} />
          ))}
        </View>
        <Text style={s.title}>Upload documents</Text>
        <Text style={s.subtitle}>
          We verify all providers for your customers' safety. Marked with * are required.
        </Text>

        {DOC_TYPES.map((doc) => {
          const uploaded = uploads.find((u) => u.type === doc.value)
          const isUploading = uploading === doc.value

          return (
            <View key={doc.value} style={[s.docCard, uploaded && s.docCardDone]}>
              <View style={s.docCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.docLabel}>
                    {doc.label}{doc.required ? ' *' : ''}
                  </Text>
                  {uploaded && (
                    <Text style={s.docFileName} numberOfLines={1}>{uploaded.fileName}</Text>
                  )}
                </View>
                {uploaded
                  ? <View style={s.doneTag}><Text style={s.doneTagText}>✓ Uploaded</Text></View>
                  : null
                }
              </View>

              {/* Expiry date input */}
              {!uploaded && (
                <TextInput
                  style={s.expiryInput}
                  value={expiryDates[doc.value] ?? ''}
                  onChangeText={(v) => setExpiryDates((prev) => ({ ...prev, [doc.value]: v }))}
                  placeholder='Expiry date (YYYY-MM-DD) — optional'
                  placeholderTextColor='#9ca3af'
                />
              )}

              <TouchableOpacity
                style={[s.uploadBtn, uploaded && s.uploadBtnRedo, isUploading && s.uploadBtnDisabled]}
                onPress={() => handleUpload(doc.value, doc.label)}
                disabled={isUploading}
              >
                {isUploading
                  ? <ActivityIndicator color={uploaded ? '#1a56db' : '#fff'} size='small' />
                  : <Text style={[s.uploadBtnText, uploaded && s.uploadBtnTextRedo]}>
                      {uploaded ? '↩ Replace' : '📎 Upload'}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          )
        })}

        <View style={s.notice}>
          <Text style={s.noticeText}>
            🔒 Documents are stored securely and only reviewed by our verification team. They are never shared with customers.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.submitBtn, (!requiredComplete || submitting) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!requiredComplete || submitting}
        >
          {submitting
            ? <ActivityIndicator color='#fff' />
            : <Text style={s.submitBtnText}>Submit for Verification →</Text>
          }
        </TouchableOpacity>
        {!requiredComplete && (
          <Text style={s.footerHint}>Upload ID and Insurance to continue</Text>
        )}
      </View>
    </View>
  )
}

export default OnboardingDocumentsScreen

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 20, paddingTop: 60, gap: 14 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#1a56db', fontSize: 15 },
  stepRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: '#1a56db', width: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 8 },
  docCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, borderWidth: 2, borderColor: '#f3f4f6' },
  docCardDone: { borderColor: '#bbf7d0' },
  docCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  docLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  docFileName: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  doneTag: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  doneTagText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  expiryInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#374151' },
  uploadBtn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  uploadBtnRedo: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  uploadBtnDisabled: { opacity: 0.55 },
  uploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  uploadBtnTextRedo: { color: '#1a56db' },
  notice: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14 },
  noticeText: { fontSize: 13, color: '#15803d', lineHeight: 19 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#f9fafb', borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 6 },
  submitBtn: { backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footerHint: { textAlign: 'center', fontSize: 12, color: '#9ca3af' },
})
