import { combineReducers } from "@reduxjs/toolkit";

import authReducer from "@/features/auth/store/authSlice";
import { logoutUser } from "@/features/auth/store/authThunks";
import usersReducer, {
  usersInitialState,
} from "@/features/users/store/usersSlice";

const combinedReducer = combineReducers({
  auth: authReducer,
  users: usersReducer,
});

export const rootReducer: typeof combinedReducer = (state, action) => {
  const nextState = combinedReducer(state, action);

  if (logoutUser.fulfilled.match(action)) {
    return {
      ...nextState,
      users: usersInitialState,
    };
  }

  return nextState;
};
