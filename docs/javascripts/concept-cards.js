(() => {
  const widgets = new WeakMap();
  const choices = [
    ["true", "成立"],
    ["false", "不成立"],
    ["unsure", "不确定"],
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = `concept-cards__${className}`;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, action, className = "button") {
    const node = element("button", className, label);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }

  function isText(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function validate(data) {
    const ids = new Set();
    if (!data || !isText(data.title) || !Array.isArray(data.cards) || !data.cards.length) {
      throw new Error("Invalid concept card collection");
    }
    data.cards.forEach((card) => {
      if (
        !card || !isText(card.id) || ids.has(card.id) || !isText(card.title) ||
        !isText(card.principle) || !Array.isArray(card.statements) ||
        card.statements.length !== 2
      ) throw new Error("Invalid concept card");
      ids.add(card.id);
      card.statements.forEach((statement) => {
        if (
          !statement || typeof statement.correct !== "boolean" ||
          !isText(statement.explanation) || !Array.isArray(statement.segments) ||
          !statement.segments.length || !statement.segments.every((segment) =>
            typeof segment === "string" ||
            (segment && typeof segment === "object" && isText(segment.highlight))
          ) || !statement.segments.some((segment) =>
            typeof segment === "string" ? segment.trim() : segment.highlight.trim()
          )
        ) throw new Error("Invalid concept statement");
      });
      if (
        !card.transfer || !isText(card.transfer.prompt) ||
        typeof card.transfer.correct !== "boolean" || !isText(card.transfer.explanation)
      ) throw new Error("Invalid concept transfer question");
    });
    return data;
  }

  function feedbackText(answer, question) {
    const expected = question.correct ? "成立" : "不成立";
    const introduction = answer === "unsure"
      ? "暂不确定也可以。"
      : answer === String(question.correct) ? "判断正确。" : "需要调整判断。";
    return `${introduction}参考判断：${expected}。${question.explanation}`;
  }

  function createQuestion(question, selected, label, onAnswer) {
    const group = element("div", "choices");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label);
    const feedback = element("p", "feedback");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    feedback.setAttribute("aria-atomic", "true");

    function update(answer) {
      group.querySelectorAll("button").forEach((option) => {
        option.setAttribute("aria-pressed", String(option.dataset.choice === answer));
      });
      feedback.hidden = answer === null;
      feedback.textContent = answer === null ? "" : feedbackText(answer, question);
      if (answer === null) {
        delete feedback.dataset.result;
      } else {
        feedback.dataset.result = answer === "unsure"
          ? "unsure" : answer === String(question.correct) ? "correct" : "incorrect";
      }
    }

    choices.forEach(([value, text]) => {
      const option = button(text, () => {
        update(value);
        onAnswer(value);
      }, "choice");
      option.dataset.choice = value;
      group.append(option);
    });
    update(selected);
    return { group, feedback };
  }

  function mount(root, data) {
    const answers = data.cards.map(() => ({ statements: [null, null], transfer: null }));
    let index = 0;
    const header = element("div", "header");
    root.setAttribute("role", "group");
    if (!root.hasAttribute("aria-label")) root.setAttribute("aria-label", data.title);
    const progress = element("span", "progress");
    progress.setAttribute("aria-label", "当前卡片");
    const body = element("div", "body");
    const navigation = element("div", "navigation");
    const previous = button("上一张", () => changeCard(index - 1), "nav-button");
    const next = button("下一张", () => changeCard(index + 1), "nav-button");
    const reset = button("重做本卡", () => {
      answers[index] = { statements: [null, null], transfer: null };
      render(true);
    }, "nav-button");
    previous.dataset.action = "previous";
    next.dataset.action = "next";
    reset.dataset.action = "reset";
    navigation.append(previous, next, reset);

    function changeCard(nextIndex) {
      if (nextIndex < 0 || nextIndex >= data.cards.length) return;
      index = nextIndex;
      render(true);
    }

    function render(focusTitle = false) {
      const card = data.cards[index];
      const saved = answers[index];
      root.dataset.conceptCard = card.id;
      progress.textContent = `${index + 1} / ${data.cards.length}`;
      previous.disabled = index === 0;
      next.disabled = index === data.cards.length - 1;
      const cardTitle = element("h3", "card-title", card.title);
      cardTitle.tabIndex = -1;
      header.replaceChildren(cardTitle, progress);
      const statements = element("div", "statements");
      const principle = element("div", "principle");
      principle.append(element("p", "label", "概念依据"), element("p", "principle-text", card.principle));
      const transfer = element("div", "transfer");
      transfer.dataset.transfer = "";
      transfer.append(element("p", "label", "情境迁移"), element("p", "prompt", card.transfer.prompt));
      const transferQuestion = createQuestion(
        card.transfer, saved.transfer, "情境迁移判断",
        (value) => { saved.transfer = value; }
      );
      transfer.append(transferQuestion.group, transferQuestion.feedback);

      function showExtension() {
        const complete = saved.statements.every((answer) => answer !== null);
        principle.hidden = !complete;
        transfer.hidden = !complete;
      }

      card.statements.forEach((statement, statementIndex) => {
        const block = element("div", "statement");
        block.dataset.statement = String(statementIndex);
        const label = `句子${statementIndex === 0 ? "一" : "二"}`;
        const text = element("p", "sentence");
        statement.segments.forEach((segment) => {
          text.append(typeof segment === "string"
            ? document.createTextNode(segment)
            : element("mark", "highlight", segment.highlight));
        });
        const question = createQuestion(
          statement, saved.statements[statementIndex], `${label}判断`,
          (value) => {
            saved.statements[statementIndex] = value;
            showExtension();
          }
        );
        block.append(element("p", "label", label), text, question.group, question.feedback);
        statements.append(block);
      });
      showExtension();
      body.replaceChildren(statements, principle, transfer);
      if (focusTitle) {
        cardTitle.focus({ preventScroll: true });
        cardTitle.scrollIntoView({ block: "start" });
      }
    }

    root.replaceChildren(header, body, navigation);
    root.dataset.conceptReady = "true";
    render();
    root.dispatchEvent(new CustomEvent("concept-cards:ready", { bubbles: true }));
  }

  async function load(root) {
    if (widgets.get(root)?.loading || root.dataset.conceptReady === "true") return;
    widgets.set(root, { loading: true });
    root.setAttribute("aria-busy", "true");
    root.querySelector(".concept-cards__error")?.remove();
    try {
      const url = new URL(root.dataset.conceptSrc, document.baseURI);
      if (url.origin !== window.location.origin) throw new Error("Cross-origin concept card source");
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Could not load concept cards");
      const data = validate(await response.json());
      if (!root.isConnected) return;
      mount(root, data);
    } catch {
      if (!root.isConnected) return;
      const error = element("div", "error");
      error.setAttribute("role", "status");
      error.append(
        element("p", "error-message", "辨析卡暂未加载，可继续阅读正文或重试。"),
        button("重新加载", () => load(root), "retry")
      );
      root.append(error);
    } finally {
      widgets.set(root, { loading: false });
      root.removeAttribute("aria-busy");
    }
  }

  function init() {
    document.querySelectorAll(".concept-cards[data-concept-src]").forEach(load);
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(init);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
