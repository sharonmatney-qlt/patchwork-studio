'use client'

import { useRef, useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import type { MakePhoto } from '@/lib/supabase'
import { uploadMakePhoto, deleteMakePhoto } from '@/app/actions/makes'

interface StepPhotosProps {
  makeId: string
  step: string
  initialPhotos: MakePhoto[]
  onAdd?: (photo: MakePhoto) => void
  onRemove?: (id: string) => void
}

export default function StepPhotos({ makeId, step, initialPhotos, onAdd, onRemove }: StepPhotosProps) {
  const [photos, setPhotos]       = useState<MakePhoto[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox]   = useState<MakePhoto | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const { photo } = await uploadMakePhoto(makeId, step, fd)
      if (photo) {
        setPhotos(prev => [...prev, photo])
        onAdd?.(photo)
      }
    }
    setUploading(false)
  }

  const handleDelete = async (photo: MakePhoto) => {
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    onRemove?.(photo.id)
    if (lightbox?.id === photo.id) setLightbox(null)
    await deleteMakePhoto(photo.id, photo.storage_path)
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2 items-center">
        {photos.map(photo => (
          <div key={photo.id} className="relative group w-16 h-16 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt="Step photo"
              className="w-16 h-16 rounded-xl object-cover cursor-pointer border border-[#E7E5E4] hover:border-[#C2683A] transition-colors"
              onClick={() => setLightbox(photo)}
            />
            <button
              onClick={() => handleDelete(photo)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              title="Delete photo"
            >
              <X size={9} strokeWidth={3} />
            </button>
          </div>
        ))}

        {/* Upload button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-16 h-16 rounded-xl border-2 border-dashed border-[#D6D3D1] flex flex-col items-center justify-center gap-0.5 text-[#A8A29E] hover:border-[#C2683A] hover:text-[#C2683A] transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
          title="Add photo"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Camera size={14} />
              <span className="text-[9px] font-medium">Add</span>
            </>
          )}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors cursor-pointer"
            onClick={() => setLightbox(null)}
          >
            <X size={24} />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt="Step photo"
            className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />

          <button
            onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
          >
            Delete photo
          </button>
        </div>
      )}
    </div>
  )
}
