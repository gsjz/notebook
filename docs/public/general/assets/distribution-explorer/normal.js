(() => {
  const { formatNumber, makeContinuousModel } = window.DistributionExplorer.utils;

  function pdf(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (Math.sqrt(2 * Math.PI) * sigma);
  }

  window.DistributionExplorer.register({
    id: "normal",
    label: "正态",
    kindLabel: "连续型",
    formula: "N(μ, σ²)",
    summary: "由位置参数 μ 和尺度参数 σ 控制的对称钟形分布。",
    controls: [
      { key: "mu", label: "均值 μ", min: -5, max: 5, step: 0.1, value: 0 },
      { key: "sigma", label: "标准差 σ", min: 0.2, max: 5, step: 0.1, value: 1 },
    ],
    getModel(base, state) {
      const mu = state.mu;
      const sigma = state.sigma;
      const range = [mu - 4 * sigma, mu + 4 * sigma];

      return makeContinuousModel(base, {
        name: `N(${formatNumber(mu)}, ${formatNumber(sigma * sigma)})`,
        xLabel: "x",
        pdf: (x) => pdf(x, mu, sigma),
        xDomain: range,
        range,
        mean: mu,
        variance: sigma * sigma,
        support: "全体实数",
      });
    },
  });
})();
