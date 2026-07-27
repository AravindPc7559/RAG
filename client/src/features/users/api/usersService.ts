import type { AxiosRequestConfig } from "axios";

import type { UserListItem } from "@/features/users/types/users.types";
import { baseService } from "@/services/baseService";
import type { ApiResponse } from "@/shared/types/api";

export const usersService = {
  async list(config?: AxiosRequestConfig) {
    const response = await baseService.get<ApiResponse<UserListItem[]>>(
      "/users",
      config,
    );
    return response.data.data;
  },
};
