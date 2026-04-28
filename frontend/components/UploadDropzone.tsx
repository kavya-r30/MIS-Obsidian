'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { Upload } from 'lucide-react'

interface Props {
  onUpload: (file: File) => Promise<void>
  loading: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadDropzone({ onUpload, loading }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleSubmit = async () => {
    if (!selectedFile || loading) return
    await onUpload(selectedFile)
  }

  return (
    <div className="space-y-4">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-300
          ${dragOver
            ? 'border-primary/50 bg-primary/5'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleInputChange}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>

          {selectedFile ? (
            <div className="space-y-1">
              <p className="font-body text-on-surface text-sm font-medium">
                {selectedFile.name}
              </p>
              <p className="font-body text-on-surface-variant text-xs">
                {formatBytes(selectedFile.size)}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-body text-on-surface text-sm">
                Drag and drop a receipt, or{' '}
                <span className="text-primary">browse</span>
              </p>
              <p className="font-body text-on-surface-variant text-xs">
                PDF, JPG, JPEG, PNG supported
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selectedFile || loading}
        className="
          w-full bg-gradient-to-r from-primary to-primary-container
          rounded-full text-on-primary font-body font-medium
          py-3 px-6 text-sm transition-all duration-300
          disabled:opacity-40 disabled:cursor-not-allowed
          hover:opacity-90
        "
      >
        {loading ? 'Processing receipt...' : 'Process Receipt'}
      </button>
    </div>
  )
}
