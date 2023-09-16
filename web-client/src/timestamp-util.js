// Take an absolute timestamp and pretty-print a time like.
// "just now"
// "$n minutes ago"
// "$n hours ago"
// "$n days ago"
// "Feb 3rd"
export function timestampToPretty(ts_ms) {
    const now_ms = Date.now();
    const since_ms = now_ms - ts_ms;

    const MINUTE_IN_MS = 1000 * 60;
    const HOUR_IN_MS = MINUTE_IN_MS * 60;
    const DAY_IN_MS = HOUR_IN_MS * 24;

    if (since_ms < MINUTE_IN_MS * 2) {
        return `just now`;
    } else if (since_ms < HOUR_IN_MS * 2) {
        return `${Math.floor(since_ms / MINUTE_IN_MS)} minutes ago`;
    } else if (since_ms < DAY_IN_MS * 2) {
        return `${Math.floor(since_ms / HOUR_IN_MS)} hours ago`;
    } else if (since_ms < DAY_IN_MS * 14) {
        return `${Math.floor(since_ms / DAY_IN_MS)} days ago`;
    } else {
        const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
        return fmt.format(new Date(ts_ms));
    }
}