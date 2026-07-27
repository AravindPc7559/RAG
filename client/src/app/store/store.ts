import { configureStore } from "@reduxjs/toolkit";

import { rootReducer } from "@/app/store/rootReducer";

export const createAppStore = () =>
  configureStore({
    reducer: rootReducer,
    devTools: import.meta.env.DEV,
  });

export const store = createAppStore();

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
