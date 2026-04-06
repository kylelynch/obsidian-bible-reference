/**
 * Builds inline wikilinks for selected verses.
 *
 * Single verse:  [[Genesis 1#v1|Genesis 1:1]]
 * Consecutive:   [[Romans 3#v23|Romans 3:23]]-[[Romans 3#v24|24]]-[[Romans 3#v25|25]]
 * With gaps:     [[Romans 3#v23|Romans 3:23]]-[[Romans 3#v24|24]], [[Romans 3#v26|26]]
 */
export function buildInlineReference(
  book: string,
  chapter: number,
  verseNumbers: number[]
): string {
  const sorted = [...verseNumbers].sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  // Group into consecutive runs
  const runs: number[][] = [];
  let currentRun: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentRun.push(sorted[i]);
    } else {
      runs.push(currentRun);
      currentRun = [sorted[i]];
    }
  }
  runs.push(currentRun);

  const parts: string[] = [];

  for (let r = 0; r < runs.length; r++) {
    const run = runs[r];
    for (let i = 0; i < run.length; i++) {
      const v = run[i];
      const target = `${book} ${chapter}#v${v}`;

      // First verse of the entire reference gets full label
      if (r === 0 && i === 0) {
        parts.push(`[[${target}|${book} ${chapter}:${v}]]`);
      } else {
        // First verse of a new run after a gap — just verse number
        // Subsequent verses in a run — just verse number
        parts.push(`[[${target}|${v}]]`);
      }
    }
  }

  // Now join: consecutive verses with "-", gaps with ", "
  let result = parts[0];
  let idx = 1;

  for (let r = 0; r < runs.length; r++) {
    const run = runs[r];
    const startIdx = r === 0 ? 1 : 0;

    for (let i = startIdx; i < run.length; i++) {
      result += '-' + parts[idx];
      idx++;
    }

    // Add comma separator before next run (if there is one)
    if (r < runs.length - 1) {
      result += ', ' + parts[idx];
      idx++;
    }
  }

  return result;
}
