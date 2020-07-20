/*
 * Convert bytes to human readable bytes
 */
export const bytesToSize = (bytes, hideUnit) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return `0 ${!hideUnit ? 'B' : ''}`;
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  if (i === 0) return `${bytes.toFixed(1)} ${!hideUnit ? sizes[i] : ''}`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${!hideUnit ? sizes[i] : ''}`;
};

export const bitsToSize = (bits, hideUnit) => {
  const sizes = ['b', 'Kb', 'Mb', 'Gb', 'Tb'];
  if (bits === 0) return `0 ${!hideUnit ? 'b' : ''}`;
  const i = parseInt(Math.floor(Math.log(bits) / Math.log(1024)), 10);
  if (i === 0) return `${bits.toFixed(1)} ${!hideUnit ? sizes[i] : ''}`;
  return `${(bits / 1024 ** i).toFixed(1)} ${!hideUnit ? sizes[i] : ''}`;
};

export const intToSize = (num, hideUnit) => {
  const sizes = ['', 'K', 'M', 'B', 'T'];
  if (num === 0) return '0';
  const i = parseInt(Math.floor(Math.log(num) / Math.log(1000)), 10);
  if (i === 0) return `${num.toFixed(1)} ${!hideUnit ? sizes[i] : ''}`;
  return `${(num / 1000 ** i).toFixed(1)} ${!hideUnit ? sizes[i] : ''}`;
};
