import "@testing-library/jest-dom/vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function createMemoryStorage() {
  const values = new Map();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(String(key)) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(String(key));
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
  };
}

// Node 26 的占位 localStorage 会遮蔽 JSDOM 实现，统一在测试边界提供稳定的浏览器契约。
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: createMemoryStorage(),
});
