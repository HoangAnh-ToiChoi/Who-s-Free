import axios from "axios";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_API,
});

const _send = async (url, method, data, config) => {
  try {
    const response = await httpClient.request({
      ...config,
      url,
      method,
      data,
    });

    return response.data?.data ?? response.data;
  } catch (error) {
    throw error.response?.data ?? { message: error.message };
  }
};

httpClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

// Hàm xử lý hàng đợi các API bị kẹt
const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error); // Báo lỗi cho các request đang chờ
    } else {
      prom.resolve(); // Báo thành công, cho phép request chạy tiếp
    }
  });

  // Sau khi giải quyết xong (dù thành công hay thất bại) thì dọn sạch hàng đợi
  failedQueue = [];
};

const refreshToken = async () => {
  try {
    const result = await httpClient.post("/api/auth/refresh", {
      refresh_token: localStorage.getItem("refreshToken"),
    });
    localStorage.setItem("accessToken", result.data.data.access_token);
    localStorage.setItem("refreshToken", result.data.data.refresh_token);

    processQueue(null);
  } catch (error) {
    processQueue(error);
    throw error;
  }
};

const getNewToken = async () => {
  if (!isRefreshing) {
    isRefreshing = true;
    try {
      await refreshToken();
    } finally {
      isRefreshing = false;
    }
    return;
  }

  // Return a promise that resolves with the new token
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  });
};
// Handle refresh token
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const shouldRenewToken =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/api/auth/");

    if (shouldRenewToken) {
      originalRequest._retry = true;
      try {
        await getNewToken();
        return httpClient(originalRequest);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

const get = async (path, config) => {
  return await _send(path, "get", null, config);
};

const post = async (path, data, config) => {
  return await _send(path, "post", data, config);
};

const put = async (path, data, config) => {
  return await _send(path, "put", data, config);
};

const patch = async (path, data, config) => {
  return await _send(path, "patch", data, config);
};

const del = async (path, config) => {
  return await _send(path, "delete", null, config);
};

const http = { get, post, put, patch, del };

export default http;
