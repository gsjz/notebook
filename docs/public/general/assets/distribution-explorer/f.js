(() => {
  const { finiteExp, logBeta, makeContinuousModel } = window.DistributionExplorer.utils;

  function pdf(x, df1, df2) {
    if (x <= 0) {
      return 0;
    }

    return finiteExp(
      0.5 *
        (df1 * Math.log(df1 * x) +
          df2 * Math.log(df2) -
          (df1 + df2) * Math.log(df1 * x + df2)) -
        Math.log(x) -
        logBeta(df1 / 2, df2 / 2)
    );
  }

  window.DistributionExplorer.register({
    id: "f",
    label: "F",
    kindLabel: "连续型",
    formula: "F(m, n)",
    summary: "两个独立卡方变量分别除以自由度后所得比值的分布。",
    controls: [
      { key: "df1", label: "第一自由度 m", min: 1, max: 40, step: 1, value: 5 },
      { key: "df2", label: "第二自由度 n", min: 1, max: 60, step: 1, value: 10 },
    ],
    getModel(base, state) {
      const df1 = state.df1;
      const df2 = state.df2;
      const variance =
        df2 > 4
          ? (2 * df2 * df2 * (df1 + df2 - 2)) /
            (df1 * (df2 - 2) * (df2 - 2) * (df2 - 4))
          : null;
      const mean = df2 > 2 ? df2 / (df2 - 2) : null;
      const xMax =
        mean !== null && variance !== null
          ? Math.min(25, Math.max(5, mean + 4 * Math.sqrt(variance)))
          : 10;
      const range = [0.005, xMax];

      return makeContinuousModel(base, {
        name: `F(${df1}, ${df2})`,
        xLabel: "F",
        pdf: (x) => pdf(x, df1, df2),
        xDomain: [0, xMax],
        range,
        mean,
        variance,
        support: "x > 0",
      });
    },
  });
})();
