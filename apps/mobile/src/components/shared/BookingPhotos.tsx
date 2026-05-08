import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Modal, Pressable,
  Dimensions, Switch,
} from 'react-native'
import * as ImagePickerLib from 'expo-image-picker'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'
const SCREEN_WIDTH = Dimensions.get('window').width

interface BookingPhoto {
  id: string
  signed_url: string
  type: 'before' | 'after'
  caption: string | null
}

interface BookingPhotosProps {
  bookingId: string
  bookingStatus: string
  isProvider: boolean
  authToken?: string
}

export function BookingPhotos({ bookingId, bookingStatus, isProvider, authToken }: BookingPhotosProps) {
  const [photos, setPhotos] = useState<BookingPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState<'before' | 'after'>('before')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [lightbox, setLightbox] = useState<BookingPhoto | null>(null)

  const canUpload = isProvider && ['in_progress', 'completed'].includes(bookingStatus)

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/bookings/${bookingId}/photos`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
      const data = await res.json()
      setPhotos(data.photos ?? [])
    } catch {
      // silently fail — photos are supplementary
    } finally {
      setLoading(false)
    }
  }, [bookingId, authToken])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  async function handlePickImage() {
    const perm = await ImagePickerLib.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.')
      return
    }
    const result = await ImagePickerLib.launchImageLibraryAsync({
      mediaTypes: ImagePickerLib.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    })
    if (result.canceled || !result.assets?.[0]) return
    uploadPhoto(result.assets[0])
  }

  async function handleTakePhoto() {
    const perm = await ImagePickerLib.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow camera access.')
      return
    }
    const result = await ImagePickerLib.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    })
    if (result.canceled || !result.assets?.[0]) return
    uploadPhoto(result.assets[0])
  }

  async function uploadPhoto(asset: ImagePickerLib.ImagePickerAsset) {
    setUploading(true)
    try {
      const filename = asset.uri.split('/').pop() ?? 'photo.jpg'
      const ext = filename.split('.').pop() ?? 'jpg'
      const mimeType = asset.mimeType ?? `image/${ext}`

      const form = new FormData()
      form.append('file', { uri: asset.uri, name: filename, type: mimeType } as any)
      form.append('type', uploadType)
      form.append('marketing_consent', String(marketingConsent))

      const res = await fetch(`${API_URL}/api/v1/bookings/${bookingId}/photos`, {
        method: 'POST',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          // Don't set Content-Type — let fetch set multipart boundary automatically
        },
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      await fetchPhotos()
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(photoId: string) {
    Alert.alert('Delete photo?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await fetch(`${API_URL}/api/v1/bookings/${bookingId}/photos/${photoId}`, {
            method: 'DELETE',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          })
          setPhotos((prev) => prev.filter((p) => p.id !== photoId))
        },
      },
    ])
  }

  function showUploadSheet() {
    Alert.alert('Add photo', `Upload as "${uploadType}"`, [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickImage },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const beforePhotos = photos.filter((p) => p.type === 'before')
  const afterPhotos = photos.filter((p) => p.type === 'after')

  if (loading) return null
  if (!canUpload && photos.length === 0) return null

  return (
    <View style={s.container}>
      <Text style={s.heading}>Job Photos</Text>

      {/* Upload controls — provider only */}
      {canUpload && (
        <>
          <View style={s.uploadRow}>
            <View style={s.typeToggle}>
              {(['before', 'after'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeBtn, uploadType === t && s.typeBtnActive]}
                  onPress={() => setUploadType(t)}
                >
                  <Text style={[s.typeBtnText, uploadType === t && s.typeBtnTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[s.addBtn, uploading && s.disabled]}
              onPress={showUploadSheet}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator color='#fff' size='small' />
                : <Text style={s.addBtnText}>📷 Add Photo</Text>
              }
            </TouchableOpacity>
          </View>
          <View style={s.consentRow}>
            <Switch
              value={marketingConsent}
              onValueChange={setMarketingConsent}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={marketingConsent ? '#1a56db' : '#9ca3af'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
            <Text style={s.consentText}>Allow Servios to feature this work on social media</Text>
          </View>
        </>
      )}

      {/* Grid */}
      {[{ label: 'Before', list: beforePhotos }, { label: 'After', list: afterPhotos }].map(({ label, list }) =>
        list.length > 0 ? (
          <View key={label} style={s.section}>
            <Text style={s.sectionLabel}>{label.toUpperCase()}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoScroll}>
              {list.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={s.photoThumb}
                  onPress={() => setLightbox(photo)}
                  onLongPress={() => canUpload && handleDelete(photo.id)}
                >
                  <Image source={{ uri: photo.signed_url }} style={s.thumbImg} />
                  {photo.caption ? (
                    <View style={s.captionOverlay}>
                      <Text style={s.captionText} numberOfLines={1}>{photo.caption}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null
      )}

      {canUpload && photos.length > 0 && (
        <Text style={s.hint}>Long-press a photo to delete</Text>
      )}

      {/* Lightbox */}
      <Modal visible={lightbox !== null} transparent animationType='fade' onRequestClose={() => setLightbox(null)}>
        <Pressable style={s.lightboxBg} onPress={() => setLightbox(null)}>
          {lightbox && (
            <View style={s.lightboxInner}>
              <Image
                source={{ uri: lightbox.signed_url }}
                style={s.lightboxImg}
                resizeMode='contain'
              />
              {lightbox.caption ? (
                <Text style={s.lightboxCaption}>{lightbox.caption}</Text>
              ) : null}
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  )
}

const THUMB = (SCREEN_WIDTH - 48) / 3.5

const s = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  heading: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  typeToggle: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  typeBtnActive: { backgroundColor: '#1a56db' },
  typeBtnText: { fontSize: 13, fontWeight: '500', color: '#6b7280', textTransform: 'capitalize' },
  typeBtnTextActive: { color: '#fff' },
  addBtn: { flex: 1, backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  section: { marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5, marginBottom: 8 },
  photoScroll: { flexDirection: 'row' },
  photoThumb: { width: THUMB, height: THUMB, borderRadius: 8, overflow: 'hidden', marginRight: 8, backgroundColor: '#f3f4f6' },
  thumbImg: { width: '100%', height: '100%' },
  captionOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 4, paddingVertical: 3 },
  captionText: { color: '#fff', fontSize: 10 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  consentText: { fontSize: 12, color: '#6b7280', flex: 1, lineHeight: 16 },
  hint: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
  lightboxBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  lightboxInner: { width: '90%', alignItems: 'center' },
  lightboxImg: { width: '100%', height: SCREEN_WIDTH * 0.9, borderRadius: 10 },
  lightboxCaption: { color: '#e5e7eb', marginTop: 10, fontSize: 13, textAlign: 'center' },
})
