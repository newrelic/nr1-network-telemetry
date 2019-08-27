/*
 * Convert bytes to human readable bytes
 */
export default function bytesToSize(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10)
  if (i === 0) return `${bytes.toFixed(1)} ${sizes[i]}`
  return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`
}

