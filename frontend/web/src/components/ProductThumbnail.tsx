'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cloudinaryImageUrl } from '@/src/lib/productImages'

export default function ProductThumbnail({ imageUrl, name, size = 40 }: {
  imageUrl?: string | null
  name: string
  size?: number
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!imageUrl || failedSrc === imageUrl) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-[13px] bg-brand-soft text-sm font-bold text-brand"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {name.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <Image
      src={cloudinaryImageUrl(imageUrl, size * 2)}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      onError={() => setFailedSrc(imageUrl)}
      className="shrink-0 rounded-[13px] object-cover"
      style={{ width: size, height: size }}
    />
  )
}
