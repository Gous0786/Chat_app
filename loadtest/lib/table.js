// Turns a k6 summary into per-step rows and finds the knee.
// Pure JS with no k6 imports, so both k6 (handleSummary) and Node (report.mjs)
// use the same logic.

// Below this many samples in a step, a closed-loop metric can't fail the SLO.
const MIN_SAMPLES = 20;

function sub(summary, metric, name, step) {
  const m = summary.metrics[`${metric}{name:${name},step:${step}}`];
  return m ? m.values : null;
}

// One row per stair: target load, measured throughput, latency percentiles, errors.
export function stepRows(doc, plan) {
  const holdSec = doc.stepSec - doc.rampSec;
  const rows = [];
  for (let s = 0; s < plan.levels.length; s++) {
    const lat = sub(doc.summary, plan.latency, plan.name, s);
    const err = plan.errors ? sub(doc.summary, plan.errors, plan.name, s) : null;
    const cnt = sub(doc.summary, plan.count || plan.latency, plan.name, s);
    const n = cnt ? (cnt.count ?? 0) : 0;
    let errRate = err ? err.rate : 0;
    // A step whose samples never arrived (e.g. every connection failed) is a failure, not a pass.
    if (plan.errorsFromCount) {
      const e = sub(doc.summary, plan.errorsFromCount, plan.name, s);
      const ec = e ? e.count : 0;
      errRate = n + ec > 0 ? ec / (n + ec) : 0;
    }
    const row = {
      step: s,
      target: plan.levels[s],
      throughput: n / holdSec,
      samples: n,
      p50: lat ? lat.med : null,
      p95: lat ? lat['p(95)'] : null,
      p99: lat ? lat['p(99)'] : null,
      max: lat ? lat.max : null,
      errRate,
    };
    const latencyOk = row.p95 !== null && row.p95 <= (plan.sloP95Ms ?? doc.slo.p95Ms);
    const errOk = row.errRate <= doc.slo.maxErrorRate;
    // For open-loop (arrival-rate) tests the server must also keep up with the offered rate.
    const keptUp = !plan.openLoop || row.throughput >= 0.9 * row.target;
    // Open-loop steps must produce samples. Closed-loop steps can be legitimately
    // empty (e.g. nobody searched in that window) and then say nothing: ok = null.
    row.notRun = n === 0 && rows.some((r) => r.ok === false);
    // A p95 from a handful of samples is one unlucky request, not a trend.
    // Closed-loop steps with too few samples report but don't decide the knee.
    row.fewSamples = !plan.openLoop && n > 0 && n < MIN_SAMPLES;
    if (n === 0) row.ok = plan.openLoop || row.notRun ? false : null;
    else if (row.fewSamples && errOk) row.ok = null;
    else row.ok = latencyOk && errOk && keptUp && n > 0;
    rows.push(row);
  }
  return rows;
}

// Highest level reached before the first failing step.
export function knee(rows) {
  let best = null;
  for (const r of rows) {
    if (r.ok === false) break;
    if (r.ok) best = r;
  }
  return best;
}

const f = (v, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? '-' : v.toFixed(d));

export function stepTable(doc, plan, extraCols) {
  const rows = stepRows(doc, plan);
  const k = knee(rows);
  const unitLabel = plan.unit === 'rps' ? 'target req/s' : plan.unit;
  const head = [unitLabel, 'achieved/s', 'p50 ms', 'p95 ms', 'p99 ms', 'max ms', 'err %', ...(extraCols ? extraCols.head : []), 'SLO'];
  const lines = [];
  lines.push(`#### ${plan.label}`);
  lines.push('');
  lines.push(`| ${head.join(' | ')} |`);
  lines.push(`|${head.map(() => '---').join('|')}|`);
  for (const r of rows) {
    const extra = extraCols ? extraCols.cells(r) : [];
    lines.push(
      `| ${r.target} | ${f(r.throughput, 1)} | ${f(r.p50, 1)} | ${f(r.p95, 1)} | ${f(r.p99, 1)} | ${f(r.max, 0)} | ${f(r.errRate * 100, 2)} | ${extra.join(' | ')}${extra.length ? ' | ' : ''}${r.notRun ? 'not run (stopped)' : r.fewSamples && r.ok === null ? `too few samples (${r.samples})` : r.ok === null ? 'no data' : r.ok ? 'ok' : 'FAIL'} |`
    );
  }
  lines.push('');
  lines.push(
    k
      ? `**Knee:** ${k.target} ${plan.unit === 'rps' ? 'req/s' : plan.unit} (p95 ${f(k.p95, 1)} ms, ${f(k.throughput, 1)}/s served)`
      : '**Knee:** below the first step (failed SLO at the lowest load)'
  );
  return lines.join('\n');
}
