import { backendRequest } from "./backendApi";

/** Compatibility facade for feature services; auth and refresh live in backendApi. */
const send = (url, method, data, config = {}) => {
  return backendRequest(url, {
    method: method.toUpperCase(),
    body: data === null ? undefined : data,
    headers: config.headers,
    signal: config.signal,
    credentials: config.credentials || (config.withCredentials ? "include" : "omit"),
    responseType: config.responseType,
  });
};

const get = (path, config) => send(path, "get", null, config);
const post = (path, data, config) => send(path, "post", data, config);
const put = (path, data, config) => send(path, "put", data, config);
const patch = (path, data, config) => send(path, "patch", data, config);
const del = (path, config) => send(path, "delete", null, config);

const http = { get, post, put, patch, del };

export default http;
