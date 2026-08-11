(() => {
  const { finiteExp, logGamma, makeDiscreteModel, makePoints } =
    window.DistributionExplorer.utils;

  function pmf(k, lambda) {
    return finiteExp(k * Math.log(lambda) - lambda - logGamma(k + 1));
  }

  window.DistributionExplorer.register({
    id: "poisson",
    label: "泊松",
    kindLabel: "离散型",
    formula: "P(λ)",
    summary: "单位时间或单位区域内稀有事件发生次数的分布。",
    controls: [
      { key: "lambda", label: "参数 λ", min: 0.1, max: 30, step: 0.1, value: 4 },
    ],
    getModel(base, state) {
      const lambda = state.lambda;
      const upper = Math.min(
        80,
        Math.max(12, Math.ceil(lambda + 6 * Math.sqrt(lambda + 1)))
      );

      return makeDiscreteModel(base, {
        points: makePoints(0, upper, (k) => pmf(k, lambda)),
        mean: lambda,
        variance: lambda,
        support: "k = 0, 1, 2, ...",
      });
    },
  });
})();
