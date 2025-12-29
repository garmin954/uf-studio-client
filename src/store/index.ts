import { configureStore } from '@reduxjs/toolkit'
import { combineReducers } from 'redux'
import UpdaterReducer, { UpdaterState } from './features/updater'
import AppReducer, { AppState } from './features/app'

// 合并多个模块
const reducer = combineReducers({
    app: AppReducer,
    updater: UpdaterReducer,
})


export const store = configureStore({
    // 将导出的 slice 中的 reducer 传入，合并多个slice切片
    reducer: reducer,
})

export type RootState = {
    app: AppState,
    updater: UpdaterState,
}
export type RootDispatch = typeof store.dispatch;
