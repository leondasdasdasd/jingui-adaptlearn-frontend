const ANSWER_BOARD_SIZE = { width: 960, height: 540 };

const loadImage = async (source) => {
  const image = new Image();
  image.src = source;
  try {
    await image.decode();
    return image;
  } catch {
    throw new Error('画板内容导出失败，请重试');
  }
};

const containedRect = (sourceWidth, sourceHeight, targetRect) => {
  const scale = Math.min(
    targetRect.width / Math.max(sourceWidth, 1),
    targetRect.height / Math.max(sourceHeight, 1),
  );
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: targetRect.x + (targetRect.width - width) / 2,
    y: targetRect.y + (targetRect.height - height) / 2,
    width,
    height,
  };
};

const drawContainedImage = (context, image, sourceWidth, sourceHeight, targetRect) => {
  const rect = containedRect(sourceWidth, sourceHeight, targetRect);
  context.drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
  );
};

/** Export the current page to the same 960 x 540 answer-content contract used by 错题本. */
export const exportTldrawPageToPng = async (editor, backgroundImageDataUrl = '') => {
  const shapeIds = editor ? [...editor.getCurrentPageShapeIds()] : [];
  if (!shapeIds.length && !backgroundImageDataUrl) return '';

  const viewportBounds = editor?.getViewportPageBounds();
  const viewportSize = {
    width: Math.max(viewportBounds?.width || ANSWER_BOARD_SIZE.width, 1),
    height: Math.max(viewportBounds?.height || ANSWER_BOARD_SIZE.height, 1),
  };
  const outputRect = { x: 0, y: 0, ...ANSWER_BOARD_SIZE };
  const viewportRect = containedRect(viewportSize.width, viewportSize.height, outputRect);
  const canvas = document.createElement('canvas');
  canvas.width = ANSWER_BOARD_SIZE.width;
  canvas.height = ANSWER_BOARD_SIZE.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前设备无法导出画板');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, ANSWER_BOARD_SIZE.width, ANSWER_BOARD_SIZE.height);

  if (backgroundImageDataUrl) {
    const backgroundImage = await loadImage(backgroundImageDataUrl);
    const backgroundWidth = backgroundImage.naturalWidth || backgroundImage.width;
    const backgroundHeight = backgroundImage.naturalHeight || backgroundImage.height;
    drawContainedImage(
      context,
      backgroundImage,
      backgroundWidth,
      backgroundHeight,
      viewportRect,
    );
  }

  if (shapeIds.length) {
    const exported = await editor.toImageDataUrl(shapeIds, {
      background: false,
      bounds: viewportBounds,
      format: 'png',
      padding: 0,
      pixelRatio: 1,
    });
    const inkImage = await loadImage(exported.url);
    context.drawImage(
      inkImage,
      viewportRect.x,
      viewportRect.y,
      viewportRect.width,
      viewportRect.height,
    );
  }

  return canvas.toDataURL('image/png');
};

export const createImageAnswerContent = (inkDataUrl = '') => ({
  kind: 'image',
  backgroundDataUrl: '',
  inkDataUrl,
});
