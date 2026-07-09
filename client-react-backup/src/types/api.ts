export type ApiResponse<T> = {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    budget?: number;
  };
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
