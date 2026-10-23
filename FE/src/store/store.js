import { configureStore } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import { persistStore } from "redux-persist";

// import authReducer from "~/features/Auth/AuthSlice";

const logger = createLogger();

// const persistedAuthReducer = persistReducer(...);

export const store = configureStore({
  reducer: {
    // auth: persistedAuthReducer,
  },
  middleware: (getDefaultMiddleware) => {
    const middlewareList = getDefaultMiddleware({
      serializableCheck: false,
    });
    if (import.meta.env.DEV) {
      middlewareList.push(logger);
    }
    return middlewareList;
  },
});

export const persistor = persistStore(store);
