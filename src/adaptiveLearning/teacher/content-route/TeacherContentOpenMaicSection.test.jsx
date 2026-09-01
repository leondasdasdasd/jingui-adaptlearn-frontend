import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import TeacherContentOpenMaicSection from "./TeacherContentOpenMaicSection";

describe("TeacherContentOpenMaicSection", () => {
  it("opens generated classrooms in playback mode and keeps regeneration scoped", () => {
    const generateOpenMaic = jest.fn();
    render(
      <TeacherContentOpenMaicSection
        scope="knowledge-1"
        title="学习内容"
        targetRuntime={{
          classroomUrl: "/openmaic/classroom/room-1?source=teacher",
        }}
        openMaicJob={null}
        previewExpanded={false}
        activeLearningScope="knowledge-1"
        previewRef={React.createRef()}
        previewFrameState="ready"
        contentMutationLocked={false}
        generateOpenMaic={generateOpenMaic}
        previewFrameKey={0}
        setPreviewFrameKey={jest.fn()}
        setPreviewFrameState={jest.fn()}
      />,
    );

    const expectedUrl =
      "/openmaic/classroom/room-1?source=teacher&view=student";
    expect(screen.getByTitle("学习内容 preview")).toHaveAttribute(
      "src",
      expectedUrl,
    );
    screen.getAllByRole("link", { name: /Student view/ }).forEach((link) => {
      expect(link).toHaveAttribute("href", expectedUrl);
    });
    expect(screen.getByRole("link", { name: /Pro mode/ })).toHaveAttribute(
      "href",
      "/openmaic/classroom/room-1?source=teacher",
    );

    fireEvent.click(screen.getByRole("button", { name: /Regenerate/ }));
    expect(generateOpenMaic).toHaveBeenCalledWith("knowledge-1");
  });
});
