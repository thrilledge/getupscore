export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 1) return "Just now";
  const sign = minutes < 0 ? "-" : "";
  const absMins = Math.abs(minutes);
  if (absMins < 60) return `${sign}${absMins} minute${absMins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(absMins / 60);
  if (hours < 24) return `${sign}${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return minutes > 0 ? "Yesterday" : "in 1 day";
  return `${sign}${days} day${days !== 1 ? "s" : ""} ago`;
}
