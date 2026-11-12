(() => {
  const { finiteExp, makeDiscreteModel, makePoints } = window.DistributionExplorer.utils;

  function pmf(k, p) {
    if (k < 1) {
      return 0;
    }

    return finiteExp(Math.log(p) + (k - 1) * Math.log(1 - p));
  }

  window.DistributionExplorer.register({
    id: "geometric",
    label: "几何",
    kindLabel: "离散型",
    formula: "Geo(p)",
    summary: "独立伯努利试验中，第一次成功所需试验次数的分布。",
    controls: [
      { key: "p", label: "成功概率 p", min: 0.01, max: 0.99, step: 0.01, value: 0.35 },
    ],
    getModel(base, state) {
      const p = state.p;
      const upper = Math.min(
        80,
        Math.max(12, Math.ceil(Math.log(0.001) / Math.log(1 - p)))
      );

      return makeDiscreteModel(base, {
        points: makePoints(1, upper, (k) => pmf(k, p)),
        mean: 1 / p,
        variance: (1 - p) / (p * p),
        support: "k = 1, 2, ...",
      });
    },
  });
})();
