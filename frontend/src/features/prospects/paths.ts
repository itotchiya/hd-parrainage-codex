export function buildProspectDetailPath({
  prospectId,
  agentId,
  hash,
}: {
  prospectId: string
  agentId?: string | null
  hash?: string | null
}) {
  const basePath = agentId ? `/agents/${agentId}/${prospectId}` : `/prospects/${prospectId}`

  if (!hash) {
    return basePath
  }

  return `${basePath}${hash.startsWith('#') ? hash : `#${hash}`}`
}
