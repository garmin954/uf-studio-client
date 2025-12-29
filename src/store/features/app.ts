import { createSlice } from "@reduxjs/toolkit";

const slice = createSlice({
    name: 'app',
    initialState: {
        debugMode: false,
    },
    reducers: {
        setDebugMode(state, action) {
            state.debugMode = action.payload
        }
    }
})

export default slice.reducer
export type AppState = ReturnType<typeof slice.getInitialState>;