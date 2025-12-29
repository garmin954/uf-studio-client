export const UNKNOWN = 'N/A';
export enum UPDATER_STEP {
    // 检查更新
    CHECK = 'check',
    //下载
    DOWNLOAD = 'download',
    //安装
    INSTALL = 'install',
    // 正常
    NORMAL = 'normal',
}


export const DEFAULT_IP = '192.168.1.';

export const DEFAULT_PORT = "";


export const ARM_STATE_MAP = {
    1: {
        color: '#52BF53',
        txt: '运动',
    },
    2: {
        color: "#b9b9b9",
        txt: '正常',
    },
    3: {
        color: '#FF8F1F',
        txt: '暂停',
    },
    4: {
        color: '#F56C6C',
        txt: '停止',
    },
    5: {
        color: "#b9b9b9",
        txt: '停止(5)',
    },
    6: {
        color: "#3c3c3c",
        txt: '减速',
    },
    0: {
        color: "#b9b9b9",
        txt: '正常',
    },
}