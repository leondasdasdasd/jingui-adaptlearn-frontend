import React, { useRef, useState } from "react";

import { compressAnswerImage } from "../lib/imageAnswer";
import { Camera } from "./Icons";

/**
 *
 * @param root0
 * @param root0.image
 * @param root0.onChange
 * @param root0.disabled
 */
export default function PhotoAnswerInput({ image, onChange, disabled }) {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProcessing(true);
    setError("");
    try {
      onChange({ ...(await compressAnswerImage(file)), source: "photo" });
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="photo-answer">
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled || processing}
        onChange={chooseImage}
        aria-label="拍照或上传作答图片"
      />
      <button
        className="answer-tool-button"
        type="button"
        aria-busy={processing}
        disabled={disabled || processing}
        onClick={() => inputRef.current?.click()}
      >
        <Camera size={17} />
        {processing
          ? "正在处理"
          : image?.source === "photo"
            ? "重新拍照"
            : "拍照上传"}
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
