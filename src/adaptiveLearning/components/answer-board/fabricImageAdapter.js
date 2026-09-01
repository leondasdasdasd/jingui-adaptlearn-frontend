const ANSWER_BOARD_SIZE = { width: 960, height: 540 };

const loadImage = async (source) => {
  const image = new Image();
  image.src = source;
  try {
    await image.decode();
    return image;
  } catch {
    throw new Error("画板内容导出失败，请重试");
  }
};

const containedRect = (
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
) => {
  const scale = Math.min(
    targetWidth / Math.max(sourceWidth, 1),
    targetHeight / Math.max(sourceHeight, 1),
  );
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
};

const drawContained = (context, image, targetWidth, targetHeight) => {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const rect = containedRect(width, height, targetWidth, targetHeight);
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
};

/**
 * 将 Fabric 画布与题目照片合成为统一的 960 x 540 图片作答契约。
 * @param boardCanvas
 * @param backgroundImageDataUrl
 */
export async function exportFabricBoardToPng(
  boardCanvas,
  backgroundImageDataUrl = "",
) {
  if (!boardCanvas?.getObjects().length && !backgroundImageDataUrl) return "";
  const output = document.createElement("canvas");
  output.width = ANSWER_BOARD_SIZE.width;
  output.height = ANSWER_BOARD_SIZE.height;
  const context = output.getContext("2d");
  if (!context) throw new Error("当前设备无法导出画板");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, output.width, output.height);

  if (backgroundImageDataUrl) {
    drawContained(
      context,
      await loadImage(backgroundImageDataUrl),
      output.width,
      output.height,
    );
  }
  if (boardCanvas.getObjects().length > 0) {
    const ink = await loadImage(
      boardCanvas.toDataURL({ format: "png", multiplier: 1 }),
    );
    drawContained(context, ink, output.width, output.height);
  }
  return output.toDataURL("image/png");
}

export const createImageAnswerContent = (inkDataUrl = "") => ({
  kind: "image",
  backgroundDataUrl: "",
  inkDataUrl,
});
