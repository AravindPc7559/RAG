import { combineReducers } from "@reduxjs/toolkit";

import authReducer from "@/features/auth/store/authSlice";

export const rootReducer = combineReducers({
  auth: authReducer,
});
