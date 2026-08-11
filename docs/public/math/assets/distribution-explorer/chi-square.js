(() => {
  const { finiteExp, logGamma, makeContinuousModel } = window.DistributionExplorer.utils;

  function pdf(x, df) {
    if (x <= 0) {
      return 0;
    }

    return finiteExp(
      (df / 2 - 1) * Math.log(x) -
        x / 2 -
        (df / 2) * Math.log(2) -
        logGamma(df / 2)
    );
  }

  window.DistributionExplorer.register({
    id: "chi2",
    label: "χ²",
    kindLabel: "连续型",
    formula: "χ²(n)",
    summary: "n 个独立标准正态变量平方和的分布。",
    controls: [
      { key: "df", label: "自由度 n", min: 1, max: 40, step: 1, value: 5 },
    ],
    getModel(base, state) {
      const df = state.df;
      const xMax = Math.max(10, df + 5 * Math.sqrt(2 * df));
      const range = [0.005, xMax];

      return makeContinuousModel(base, {
        name: `chi-square(${df})`,
        xLabel: "x",
        pdf: (x) => pdf(x, df),
        xDomain: [0, xMax],
        range,
        mean: df,
        variance: 2 * df,
        support: "x > 0",
      });
    },
  });
})();
