// @superjs/types-axios — hand-curated SJS bindings for Axios 1.x core surface.

export type AxiosRequestConfig {
  url: string;
  method: string;
  baseURL: string;
  headers: dynamic;
  params: dynamic;
  data: dynamic;
  timeout: number;
  responseType: string;
}

export type AxiosResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: dynamic;
  config: AxiosRequestConfig;
}

export type AxiosInterceptorManager<V> {
  use(onFulfilled: dynamic, onRejected: dynamic): number;
  eject(id: number): void;
}

export type AxiosInstance {
  request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  get<T>(url: string, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T>(url: string, data: dynamic, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T>(url: string, data: dynamic, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  patch<T>(url: string, data: dynamic, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  del<T>(url: string, config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  interceptors: {
    request: AxiosInterceptorManager<AxiosRequestConfig>;
    response: AxiosInterceptorManager<AxiosResponse<dynamic>>;
  };
  defaults: AxiosRequestConfig;
}

export type AxiosStatic {
  create(config: AxiosRequestConfig): AxiosInstance;
  isAxiosError(err: dynamic): boolean;
}
