import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  loadAssessmentPaperQuestions,
  loadAssessmentPapers,
  loadAssessmentQuestionBank,
} from "../data/assessmentQuestionSourceRepository";
import AssessmentQuestionPickerModal from "./AssessmentQuestionPickerModal";

vi.mock("../data/assessmentQuestionSourceRepository", () => ({
  loadAssessmentPaperQuestions: vi.fn(),
  loadAssessmentPapers: vi.fn(),
  loadAssessmentQuestionBank: vi.fn(),
}));

const questionSourceScope = {
  subject: "science",
  publisher: "zhejiang",
  grade: "grade7-up",
  volume: "up",
};

const selection = (kind, id, label) => ({
  key: `${kind}:${id}`,
  renderKey: `${kind}:${id}`,
  label,
  typeLabel: "单选题",
  difficulty: 2,
  supported: true,
  source: { kind, questionId: id },
  snapshot: { id, stem: label, type: "single_choice" },
});

describe("AssessmentQuestionPickerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.globalLange = "zh-CN";
    loadAssessmentQuestionBank.mockResolvedValue({
      items: [selection("question_bank", "q-1", "光的反射")],
      questionTypes: [{ id: "single_choice", label: "单选题" }],
      total: 1,
    });
    loadAssessmentPapers.mockResolvedValue([
      {
        id: "paper-1",
        title: "七年级科学单元卷",
        gradeName: "七年级",
        subjectName: "科学",
        questionCount: 2,
      },
    ]);
    loadAssessmentPaperQuestions.mockResolvedValue([
      selection("paper", "pq-1", "入射角判断"),
      selection("paper", "pq-2", "反射规律应用"),
    ]);
  });

  test("reuses question-bank scope, type, difficulty and keyword filters", async () => {
    render(
      <AssessmentQuestionPickerModal
        open={true}
        initialSource="question_bank"
        preferredQuestionType="single_choice"
        questionSourceScope={questionSourceScope}
        existingSourceKeys={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    await screen.findByText("光的反射");
    expect(
      screen.getByRole("option", { name: "全部题型" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "校本" }));
    fireEvent.change(screen.getByLabelText("题型"), {
      target: { value: "single_choice" },
    });
    fireEvent.change(screen.getByLabelText("难度"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("关键词"), {
      target: { value: "观察" },
    });

    await waitFor(() =>
      expect(loadAssessmentQuestionBank).toHaveBeenLastCalledWith(
        expect.objectContaining({
          difficulty: "2",
          keyword: "观察",
          questionType: "single_choice",
          scope: "school",
        }),
      ),
    );
  });

  test("opens a paper, supports full-paper selection and returns to the paper list", async () => {
    const onConfirm = vi.fn();
    render(
      <AssessmentQuestionPickerModal
        open={true}
        initialSource="paper"
        questionSourceScope={questionSourceScope}
        existingSourceKeys={[]}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "单元卷" },
    });
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    await waitFor(() =>
      expect(loadAssessmentPapers).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: "单元卷" }),
      ),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /七年级科学单元卷/ }),
    );
    await screen.findByText("入射角判断");
    fireEvent.click(screen.getByRole("button", { name: "选择整卷题目" }));
    expect(screen.getByText("已选择 2 题")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "添加所选题目" }));
    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({
        source: expect.objectContaining({ questionId: "pq-1" }),
      }),
      expect.objectContaining({
        source: expect.objectContaining({ questionId: "pq-2" }),
      }),
    ]);
    fireEvent.click(screen.getByRole("button", { name: "返回试卷列表" }));
    expect(await screen.findByText("七年级科学单元卷")).toBeInTheDocument();
  });

  test("shows explicit empty states without creating fallback data", async () => {
    loadAssessmentQuestionBank.mockResolvedValue({
      items: [],
      questionTypes: [{ id: "", label: "全部题型" }],
      total: 0,
    });
    const { rerender } = render(
      <AssessmentQuestionPickerModal
        open={true}
        initialSource="question_bank"
        questionSourceScope={questionSourceScope}
        existingSourceKeys={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(
      await screen.findByText("当前筛选条件下没有可用题目"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "全部题型" })).toHaveLength(1);

    loadAssessmentPapers.mockResolvedValue([]);
    rerender(
      <AssessmentQuestionPickerModal
        open={true}
        initialSource="paper"
        questionSourceScope={questionSourceScope}
        existingSourceKeys={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(
      await screen.findByText("当前筛选条件下没有可用试卷"),
    ).toBeInTheDocument();
  });

  test("renders multiple unavailable records with independent view keys", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    loadAssessmentQuestionBank.mockResolvedValue({
      items: [
        {
          ...selection("question_bank", "", "缺少题号一"),
          key: "",
          renderKey: "question_bank:unidentified:0",
          supported: false,
          unsupportedReason: "题目缺少来源标识，无法加入课时",
        },
        {
          ...selection("question_bank", "", "缺少题号二"),
          key: "",
          renderKey: "question_bank:unidentified:1",
          supported: false,
          unsupportedReason: "题目缺少来源标识，无法加入课时",
        },
      ],
      questionTypes: [],
      total: 2,
    });
    render(
      <AssessmentQuestionPickerModal
        open={true}
        initialSource="question_bank"
        questionSourceScope={questionSourceScope}
        existingSourceKeys={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(await screen.findByText("缺少题号一")).toBeInTheDocument();
    expect(screen.getByText("缺少题号二")).toBeInTheDocument();
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes("same key"),
      ),
    ).toBe(false);
    consoleError.mockRestore();
  });

  test("keeps the latest question-bank result when requests resolve out of order", async () => {
    let resolveInitialRequest;
    let resolveLatestRequest;
    loadAssessmentQuestionBank
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInitialRequest = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveLatestRequest = resolve;
          }),
      );
    render(
      <AssessmentQuestionPickerModal
        open={true}
        initialSource="question_bank"
        questionSourceScope={questionSourceScope}
        existingSourceKeys={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("关键词"), {
      target: { value: "最新筛选" },
    });
    await waitFor(() =>
      expect(loadAssessmentQuestionBank).toHaveBeenCalledTimes(2),
    );
    await act(async () => {
      resolveLatestRequest({
        items: [selection("question_bank", "q-latest", "最新结果")],
        questionTypes: [],
        total: 1,
      });
    });
    expect(await screen.findByText("最新结果")).toBeInTheDocument();

    await act(async () => {
      resolveInitialRequest({
        items: [selection("question_bank", "q-stale", "过期结果")],
        questionTypes: [],
        total: 1,
      });
    });
    expect(screen.getByText("最新结果")).toBeInTheDocument();
    expect(screen.queryByText("过期结果")).not.toBeInTheDocument();
  });

  test("traps keyboard focus and restores it after closing", async () => {
    const onClose = vi.fn();
    const modal = (open) => (
      <>
        <button type="button">打开选题</button>
        <AssessmentQuestionPickerModal
          open={open}
          initialSource="question_bank"
          questionSourceScope={questionSourceScope}
          existingSourceKeys={[]}
          onClose={onClose}
          onConfirm={vi.fn()}
        />
      </>
    );
    const { rerender } = render(modal(false));
    const trigger = screen.getByRole("button", { name: "打开选题" });
    trigger.focus();
    rerender(modal(true));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());

    const closeButton = screen.getByRole("button", { name: "关闭" });
    const cancelButton = screen.getByRole("button", { name: "取消" });
    cancelButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
    closeButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(cancelButton).toHaveFocus();

    rerender(modal(false));
    expect(trigger).toHaveFocus();
  });
});
