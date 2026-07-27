import type { AxiosRequestConfig } from "axios";

import type {
  AuthUser,
  LoginInput,
  RegisterInput,
} from "@/features/auth/types/auth.types";
import { baseService } from "@/services/baseService";
import type { ApiResponse } from "@/shared/types/api";

export const authService = {
  async login(input: LoginInput, config?: AxiosRequestConfig) {
    const response = await baseService.post<ApiResponse<AuthUser>>(
      "/auth/login",
      input,
      config,
    );
    return response.data.data;
  },

  async register(input: RegisterInput, config?: AxiosRequestConfig) {
    const response = await baseService.post<ApiResponse<AuthUser>>(
      "/auth/register",
      input,
      config,
    );
    return response.data.data;
  },

  async getCurrentUser(config?: AxiosRequestConfig) {
    const response = await baseService.get<ApiResponse<AuthUser>>(
      "/auth/me",
      config,
    );
    return response.data.data;
  },

  async logout(config?: AxiosRequestConfig) {
    await baseService.post<ApiResponse<null>>("/auth/logout", undefined, config);
  },
};
