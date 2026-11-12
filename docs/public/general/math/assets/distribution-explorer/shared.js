(() => {
  const api = (window.DistributionExplorer = window.DistributionExplorer || {});

  api.definitions = api.definitions || [];

  function logGamma(z) {
    const coefficients = [
      676.5203681218851,
      -1259.1392167224028,
      771.3234287776531,
      -176.6150291621406,
      12.507343278686905,
      -0.13857109526572012,
      9.984369578019572e-6,
      1.5056327351493116e-7,
    ];

    if (z < 0.5) {
      return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    }

    let x = 0.9999999999998099;
    const shifted = z - 1;
    for (let i = 0; i < coefficients.length; i += 1) {
      x += coefficients[i] / (shifted + i + 1);
    }

    const t = shifted + coefficients.length - 0.5;
    return (
      0.5 * Math.log(2 * Math.PI) +
      (shifted + 0.5) * Math.log(t) -
      t +
      Math.log(x)
    );
  }

  function logBeta(a, b) {
    return logGamma(a) + logGamma(b) - logGamma(a + b);
  }

  function logCombination(n, k) {
    if (k < 0 || k > n) {
      return Number.NEGATIVE_INFINITY;
    }

    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  }

  function finiteExp(logValue) {
    const value = Math.exp(logValue);
    return Number.isFinite(value) ? value : 0;
  }

  function sampleRange(start, end, count) {
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, index) => start + step * index);
  }

  function estimateYMax(pdf, range) {
    const values = sampleRange(range[0], range[1], 520)
      .map((x) => pdf(x))
      .filter((value) => Number.isFinite(value) && value >= 0);
    return Math.max(0.1, ...values);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampInteger(value, min, max) {
    return Math.round(clamp(Number(value), min, max));
  }

  function formatNumber(value) {
    if (value === null || Number.isNaN(value) || !Number.isFinite(value)) {
      return "不存在";
    }

    const absValue = Math.abs(value);
    if (absValue !== 0 && absValue < 0.001) {
      return value.toExponential(2);
    }

    return absValue >= 100
      ? value.toFixed(1)
      : value.toFixed(3).replace(/\.?0+$/, "");
  }

  function makePoints(start, end, pmf) {
    const points = [];
    for (let x = start; x <= end; x += 1) {
      points.push({ x, y: pmf(x) });
    }
    return points;
  }

  function makeDiscreteModel(base, options) {
    const yMax = Math.max(0.1, ...options.points.map((point) => point.y));
    const xValues = options.points.map((point) => point.x);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);

    return {
      ...base,
      plotKind: "discrete",
      xLabel: "k",
      yLabel: "probability",
      points: options.points,
      xDomain: [xMin - 0.75, xMax + 0.75],
      yDomain: [0, yMax * 1.18],
      mean: options.mean,
      variance: options.variance,
      support: options.support,
    };
  }

  function makeContinuousModel(base, options) {
    const yMax = estimateYMax(options.pdf, options.range);
    return {
      ...base,
      plotKind: "continuous",
      yLabel: "density",
      yDomain: [0, yMax * 1.18],
      ...options,
    };
  }

  function register(definition) {
    api.definitions.push(definition);
  }

  api.utils = {
    clamp,
    clampInteger,
    estimateYMax,
    finiteExp,
    formatNumber,
    logBeta,
    logCombination,
    logGamma,
    makeContinuousModel,
    makeDiscreteModel,
    makePoints,
  };
  api.register = register;
})();
