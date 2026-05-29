type ReviewLike = {
  ai_score: number | null;
  expert_explanation_quality_score: number | null;
  expert_transfer_score: number | null;
  ai_misconception_labels: unknown;
  expert_misconception_labels: unknown;
};

function asNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function primaryExpertScore(review: ReviewLike) {
  return asNumber(review.expert_transfer_score) ?? asNumber(review.expert_explanation_quality_score);
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number | null) {
  return value === null || !Number.isFinite(value) ? null : Number(value.toFixed(3));
}

function metricAverage(values: number[]) {
  return values.length ? avg(values) : null;
}

function labels(value: unknown) {
  if (!Array.isArray(value)) return new Set<string>();
  return new Set(
    value
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "misconception_id" in item) {
          const id = (item as { misconception_id?: unknown }).misconception_id;
          return typeof id === "string" ? id : "";
        }
        return "";
      })
      .filter(Boolean)
  );
}

function pearson(pairs: Array<[number, number]>) {
  if (pairs.length < 2) return null;
  const xs = pairs.map(([x]) => x);
  const ys = pairs.map(([, y]) => y);
  const xMean = avg(xs);
  const yMean = avg(ys);
  const numerator = pairs.reduce((sum, [x, y]) => sum + (x - xMean) * (y - yMean), 0);
  const xDenominator = Math.sqrt(xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0));
  const yDenominator = Math.sqrt(ys.reduce((sum, y) => sum + (y - yMean) ** 2, 0));
  if (!xDenominator || !yDenominator) return null;
  return numerator / (xDenominator * yDenominator);
}

function rank(values: number[]) {
  return values.map((value, index) => ({
    value,
    index
  }))
    .sort((a, b) => a.value - b.value)
    .reduce<number[]>((ranks, item, position, sorted) => {
      const same = sorted.filter((candidate) => candidate.value === item.value);
      const first = sorted.findIndex((candidate) => candidate.value === item.value);
      ranks[item.index] = first + (same.length + 1) / 2;
      return ranks;
    }, []);
}

function spearman(pairs: Array<[number, number]>) {
  if (pairs.length < 2) return null;
  const xRanks = rank(pairs.map(([x]) => x));
  const yRanks = rank(pairs.map(([, y]) => y));
  return pearson(xRanks.map((xRank, index) => [xRank, yRanks[index]]));
}

function quadraticWeightedKappa(pairs: Array<[number, number]>, maxRating = 5) {
  if (pairs.length < 2) return null;
  const size = maxRating + 1;
  const observed = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const aiCounts = Array.from({ length: size }, () => 0);
  const expertCounts = Array.from({ length: size }, () => 0);

  for (const [ai, expert] of pairs) {
    const aiRating = Math.max(0, Math.min(maxRating, Math.round(ai)));
    const expertRating = Math.max(0, Math.min(maxRating, Math.round(expert)));
    observed[aiRating][expertRating] += 1;
    aiCounts[aiRating] += 1;
    expertCounts[expertRating] += 1;
  }

  let weightedObserved = 0;
  let weightedExpected = 0;
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      const weight = ((i - j) ** 2) / maxRating ** 2;
      weightedObserved += weight * observed[i][j];
      weightedExpected += weight * ((aiCounts[i] * expertCounts[j]) / pairs.length);
    }
  }

  if (!weightedExpected) return null;
  return 1 - weightedObserved / weightedExpected;
}

export function computeCalibrationMetrics(reviews: ReviewLike[]) {
  const scorePairs = reviews
    .map((review): [number, number] | null => {
      const ai = asNumber(review.ai_score);
      const expert = primaryExpertScore(review);
      return ai === null || expert === null ? null : [ai, expert];
    })
    .filter((pair): pair is [number, number] => Boolean(pair));

  const absoluteErrors = scorePairs.map(([ai, expert]) => Math.abs(ai - expert));
  const signedErrors = scorePairs.map(([ai, expert]) => ai - expert);

  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  for (const review of reviews) {
    const aiLabels = labels(review.ai_misconception_labels);
    const expertLabels = labels(review.expert_misconception_labels);
    for (const label of aiLabels) {
      if (expertLabels.has(label)) truePositive += 1;
      else falsePositive += 1;
    }
    for (const label of expertLabels) {
      if (!aiLabels.has(label)) falseNegative += 1;
    }
  }

  const precision = truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : null;
  const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : null;
  const f1 =
    precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;

  return {
    review_count: reviews.length,
    scored_pair_count: scorePairs.length,
    ai_score_mean: round(metricAverage(scorePairs.map(([ai]) => ai))),
    expert_score_mean: round(metricAverage(scorePairs.map(([, expert]) => expert))),
    mean_absolute_error: round(metricAverage(absoluteErrors)),
    bias_ai_minus_expert: round(metricAverage(signedErrors)),
    pearson_correlation: round(pearson(scorePairs)),
    spearman_correlation: round(spearman(scorePairs)),
    quadratic_weighted_kappa: round(quadraticWeightedKappa(scorePairs)),
    misconception_precision: round(precision),
    misconception_recall: round(recall),
    misconception_f1: round(f1),
    misconception_true_positive: truePositive,
    misconception_false_positive: falsePositive,
    misconception_false_negative: falseNegative
  };
}
