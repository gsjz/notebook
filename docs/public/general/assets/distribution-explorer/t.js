(() => {
  const { finiteExp, logGamma, makeContinuousModel } = window.DistributionExplorer.utils;

  function pdf(x, df) {
    return finiteExp(
      logGamma((df + 1) / 2) -
        0.5 * Math.log(df * Math.PI) -
        logGamma(df / 2) -
        ((df + 1) / 2) * Math.log(1 + (x * x) / df)
    );
  }

  window.DistributionExplorer.register({
    id: "t",
    label: "t",
    kindLabel: "连续型",
    formula: "t(n)",
    summary: "标准正态变量除以独立卡方变量标准化平方根后的分布。",
    controls: [
      { key: "df", label: "自由度 n", min: 1, max: 40, step: 1, value: 5 },
    ],
    getModel(base, state) {
      const df = state.df;
      const range = [-6, 6];

      return makeContinuousModel(base, {
        name: `t(${df})`,
        xLabel: "t",
        pdf: (x) => pdf(x, df),
        xDomain: range,
        range,
        mean: df > 1 ? 0 : null,
        variance: df > 2 ? df / (df - 2) : null,
        support: "全体实数",
      });
    },
  });
})();
