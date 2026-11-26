/** A photo from the incident log, loaded from IndexedDB as an object URL. */
import { useEffect, useState } from 'react'
import { store } from '../../storage/localAdapter'

export function PhotoThumb({ photoId, alt }: { photoId: string; alt: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let u: string | undefined
    let live = true
    store.getPhoto(photoId).then((p) => {
      if (!p || !live) return
      u = URL.createObjectURL(p.blob)
      setUrl(u)
    })
    return () => {
      live = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [photoId])
  return url ? <img className="thumb" src={url} alt={alt} /> : <span className="thumb thumb--empty" />
}
