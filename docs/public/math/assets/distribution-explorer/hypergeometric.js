(() => {
  const { finiteExp, logCombination, makeDiscreteModel, makePoints } =
    window.DistributionExplorer.utils;

  function pmf(k, total, marked, sample) {
    return finiteExp(
      logCombination(marked, k) +
        logCombination(total - marked, sample - k) -
        logCombination(total, sample)
    );
  }

  window.DistributionExplorer.register({
    id: "hypergeometric",
    label: "超几何",
    kindLabel: "离散型",
    formula: "H(N, M, n)",
    summary: "有限总体中不放回抽样时，抽到目标元素个数的分布。",
    controls: [
      { key: "total", label: "总体容量 N", min: 2, max: 100, step: 1, value: 40 },
      { key: "marked", label: "目标个数 M", min: 1, max: 100, step: 1, value: 16 },
      { key: "sample", label: "抽取个数 n", min: 1, max: 100, step: 1, value: 10 },
    ],
    normalizeState(state, utils) {
      state.total = utils.clampInteger(state.total, 2, 100);
      state.marked = utils.clampInteger(state.marked, 1, state.total);
      state.sample = utils.clampInteger(state.sample, 1, state.total);
    },
    getModel(base, state) {
      const total = state.total;
      const marked = state.marked;
      const sample = state.sample;
      const lower = Math.max(0, sample - (total - marked));
      const upper = Math.min(sample, marked);
      const ratio = marked / total;

      return makeDiscreteModel(base, {
        points: makePoints(lower, upper, (k) => pmf(k, total, marked, sample)),
        mean: sample * ratio,
        variance:
          sample *
          ratio *
          (1 - ratio) *
          ((total - sample) / Math.max(1, total - 1)),
        support: `k = ${lower}, ..., ${upper}`,
      });
    },
  });
})();
