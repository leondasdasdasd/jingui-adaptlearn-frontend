/**
 * 独立前端的测验平台请求边界。Cookie 由浏览器随同源代理请求发送，
 * 业务模块只消费解析后的平台响应，不感知 fetch 细节。
 */
export default async function request(url, options = {}) {
  const requestOptions = {
    credentials: "include",
    ...options,
  };

  if (
    requestOptions.body !== undefined &&
    !(requestOptions.body instanceof FormData) &&
    !(requestOptions.body instanceof ArrayBuffer) &&
    !(requestOptions.body instanceof Uint8Array)
  ) {
    requestOptions.headers = {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      ...requestOptions.headers,
    };
    requestOptions.body = JSON.stringify(requestOptions.body);
  }

  try {
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
      const error = new Error(response.statusText || "Request failed");
      error.response = response;
      throw error;
    }
    if (requestOptions.method === "DELETE" || response.status === 204) {
      return response.text();
    }
    return response.json();
  } catch (error) {
    return {
      err: error,
      ifLogin: error.response?.status !== 401,
    };
  }
}

/**
 * 统一平台 GET 请求的查询串规则，空参数不产生多余问号。
 */
export function withQuery(url, parameters = {}) {
  const query = new URLSearchParams(parameters).toString();
  return query ? `${url}?${query}` : url;
}
