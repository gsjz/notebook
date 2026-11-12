(() => {
  const { finiteExp, logCombination, makeDiscreteModel, makePoints } =
    window.DistributionExplorer.utils;

  function pmf(k, n, p) {
    return finiteExp(
      logCombination(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)
    );
  }

  window.DistributionExplorer.register({
    id: "binomial",
    label: "二项",
    kindLabel: "离散型",
    formula: "B(n, p)",
    summary: "固定次数的独立伯努利试验中，成功次数的分布。",
    controls: [
      { key: "n", label: "试验次数 n", min: 1, max: 80, step: 1, value: 10 },
      { key: "p", label: "成功概率 p", min: 0.01, max: 0.99, step: 0.01, value: 0.5 },
    ],
    getModel(base, state) {
      const n = state.n;
      const p = state.p;

      return makeDiscreteModel(base, {
        points: makePoints(0, n, (k) => pmf(k, n, p)),
        mean: n * p,
        variance: n * p * (1 - p),
        support: `k = 0, 1, ..., ${n}`,
      });
    },
  });
})();
