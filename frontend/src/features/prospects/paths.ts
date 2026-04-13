export function buildProspectDetailPath({
  prospectId,
  hash,
}: {
  prospectId: string
  hash?: string | null
}) {
  const basePath = `/prospects/${prospectId}`

  if (!hash) {
    return basePath
  }

  return `${basePath}${hash.startsWith('#') ? hash : `#${hash}`}`
}
