/**
 *
 * @param file
 * @param maxDimension
 * @param quality
 */
export function compressAnswerImage(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("请选择图片文件"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.addEventListener("load", () => {
      const image = new Image();
      image.onerror = () => reject(new Error("图片格式无法识别"));
      image.addEventListener("load", () => {
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", quality),
          name: file.name,
          width: canvas.width,
          height: canvas.height,
        });
      });
      image.src = reader.result;
    });
    reader.readAsDataURL(file);
  });
}
