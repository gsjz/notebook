(() => {
  const { formatNumber, makeContinuousModel } = window.DistributionExplorer.utils;

  function pdf(x, lambda) {
    if (x < 0) {
      return 0;
    }

    return lambda * Math.exp(-lambda * x);
  }

  window.DistributionExplorer.register({
    id: "exponential",
    label: "指数",
    kindLabel: "连续型",
    formula: "Exp(λ)",
    summary: "泊松过程中等待下一次事件发生时间的分布。",
    controls: [
      { key: "lambda", label: "参数 λ", min: 0.1, max: 8, step: 0.1, value: 1 },
    ],
    getModel(base, state) {
      const lambda = state.lambda;
      const xMax = Math.max(4 / lambda, 6);
      const range = [0, xMax];

      return makeContinuousModel(base, {
        name: `Exp(${formatNumber(lambda)})`,
        xLabel: "x",
        pdf: (x) => pdf(x, lambda),
        xDomain: range,
        range,
        mean: 1 / lambda,
        variance: 1 / (lambda * lambda),
        support: "x >= 0",
      });
    },
  });
})();
