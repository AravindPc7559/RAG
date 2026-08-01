import { combineReducers } from "@reduxjs/toolkit";

import authReducer from "@/features/auth/store/authSlice";
import githubReducer from "@/features/github/store/githubSlice";

export const rootReducer = combineReducers({
  auth: authReducer,
  github: githubReducer,
});
