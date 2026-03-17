const tagClassMap: Record<string, string> = {
  'UX Research':          'story-tag tag-ux-research',
  'Product Design':       'story-tag tag-product-design',
  'Product Management':   'story-tag tag-product-management',
  'AI Tools':             'story-tag tag-ai-tools',
}

export function Tag({ label }: { label: string }) {
  const cls = tagClassMap[label] ?? 'story-tag tag-ai-tools'
  return <span className={cls}>{label}</span>
}
