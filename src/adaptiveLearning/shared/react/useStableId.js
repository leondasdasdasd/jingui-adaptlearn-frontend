import { useRef } from "react";

let nextStableId = 0;

const normalizePrefix = (prefix) =>
  String(prefix || "adaptive-control").replaceAll(/[^\w-]/g, "-");

/**
 * React 16 没有 useId；在组件生命周期内生成稳定且可用于 aria 关联的 ID。
 * @param prefix
 */
export default function useStableId(prefix) {
  const idRef = useRef(null);
  if (idRef.current === null) {
    nextStableId += 1;
    idRef.current = `${normalizePrefix(prefix)}-${nextStableId}`;
  }
  return idRef.current;
}
