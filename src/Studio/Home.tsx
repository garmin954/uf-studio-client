import { useEffect, useRef, useState } from "react";
import logo_xarm from "@/assets/images/logo_xarm.png";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useNavigate } from "react-router-dom";
import { fetchWithAbortTimeout } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ArmIpsIntro = {
    arm_sn: string;
    axis: string;
    control_sn: string;
    device_type: string;
    ip: string;
    port: string;
    version: string;
    addr_type: string;
}
export default function StudioHome() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation("home");
    // @ts-ignore
    const [connectTip, setConnectTip] = useState<string>("");
    const [selectedIp, setSelectedIp] = useState<string>(localStorage.getItem("selectedIp") || "");
    const [armIps, setArmIps] = useState<ArmIpsIntro[]>([]);
    const [showIpList, setShowIpList] = useState<boolean>(false);
    const channel = useRef<string>(localStorage.getItem("channel") || "prod");
    // 延迟显示“正在连接中...”的计时器
    const connectTipTimerRef = useRef<number | null>(null);
    // 自动清除 connectTip 的计时器
    const clearTipTimerRef = useRef<number | null>(null);

    // 组件卸载时清理计时器
    useEffect(() => {
        return () => {
            if (connectTipTimerRef.current !== null) {
                window.clearTimeout(connectTipTimerRef.current);
            }
            if (clearTipTimerRef.current !== null) {
                window.clearTimeout(clearTipTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (selectedIp) {
            localStorage.setItem("selectedIp", selectedIp);
        }
    }, [selectedIp]);

    useEffect(() => {
        let un_listen: Promise<UnlistenFn>;
        un_listen = listen("xarm_ip", (data) => {
            if (typeof data.payload === "string") {
                return;
            }
            const { payload } = data as { payload: ArmIpsIntro };
            setArmIps((prevArmIps) => [...prevArmIps, payload]);
        })

        return () => {
            un_listen.then((un_listen) => un_listen());
            invoke("stop_udp_broadcast").then(() => { });
        };
    }, []);



    // @ts-ignore
    function getProductModel(device_type: string, axis: string) {
        let model = "xArm " + device_type;
        if (+device_type === 12) {
            model = "850";
        }
        // 小六轴型号显示
        if (+axis === 6 && +device_type === 9) {
            model = "Lite 6";
        }

        if (+axis === 7 && +device_type === 13) {
            model = "xArm 7T";
        }
        return model;
    }

    function genAddress() {
        let selected_ip = "127.0.0.1";
        let selected_port = 18333;
        // 将 i18n 当前语言映射为后端使用的参数值
        const currentLang = i18n.language || "cn";
        const langParam = currentLang.startsWith("en") ? "en" : "cn";

        // 正则获取字符串中的ip 和 port 这是字符串可能包含的格式
        // 192.168.1.100:18333?channel=prod&lang=cn
        // http://192.168.1.100:18333?channel=prod&lang=cn
        // 192.168.1.100:18333
        // 192.168.1.100
        // http://192.168.1.100
        // http://192.168.1.100:18333

        const ipRegex = /(?:https?:\/\/)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?(?:\?.*)?/;
        const match = selectedIp.match(ipRegex);
        console.log('match===>', match);

        if (match) {
            selected_ip = match[1];
            selected_port = match[2] ? +match[2] : 18333;
        }

        return {
            ip: selected_ip,
            port: selected_port,
            url: `http://${selected_ip}:${selected_port}?lang=${langParam}&channel=${channel.current}`,
            channel: channel.current,
            lang: langParam
        }
    }

    // 统一处理带 3s 自动清除的提示
    function setTipWithAutoClear(message: string) {
        setConnectTip(message);
        if (clearTipTimerRef.current !== null) {
            window.clearTimeout(clearTipTimerRef.current);
        }
        if (message) {
            clearTipTimerRef.current = window.setTimeout(() => {
                setConnectTip("");
            }, 3000);
        }
    }

    function connect() {
        const { ip, port, url } = genAddress();
        console.log('url===>', url);
        console.log('ip===>', ip);
        console.log('port===>', port);
        console.log('selectedIp===>', selectedIp);
        console.log('===========================================');

        if (port === 18333) {
            const startTime = performance.now();

            if (connectTipTimerRef.current !== null) {
                window.clearTimeout(connectTipTimerRef.current);
            }
            connectTipTimerRef.current = window.setTimeout(() => {
                setConnectTip(t("connecting"));
            }, 100);

            const { promise } = fetchWithAbortTimeout(`http://${ip}:${port}/check`, { method: "GET" }, 5000);
            promise.then((res: any) => {
                if (connectTipTimerRef.current !== null) {
                    window.clearTimeout(connectTipTimerRef.current);
                    connectTipTimerRef.current = null;
                }

                const cost = performance.now() - startTime;

                if (res.status === 200) {
                    if (cost >= 100) {
                        setConnectTip(t("connect_success"));
                    } else {
                        setConnectTip("");
                    }
                    localStorage.setItem("selectedIp", selectedIp);
                    navigate(`/app/studio?url=${url}`);
                } else {
                    setTipWithAutoClear(t("connect_failed"));
                    return;
                }
            }).catch((e) => {
                console.log('e===>', e);
                if (connectTipTimerRef.current !== null) {
                    window.clearTimeout(connectTipTimerRef.current);
                    connectTipTimerRef.current = null;
                }
                setTipWithAutoClear(t("connect_failed"));
                return;
            });
        } else {
            setTipWithAutoClear(t("select_correct_device"));
            return;
        }
    }

    function search(e: React.MouseEvent<HTMLButtonElement>) {
        e.stopPropagation();
        console.log("search");
        setShowIpList(true);
        setArmIps([]);
        // invoke("start_udp_broadcast").then(() => { });
    }

    useEffect(() => {
        if (showIpList) {
            invoke("start_udp_broadcast").then(() => { });
        } else {
            invoke("stop_udp_broadcast").then(() => { });
        }
    }, [showIpList]);

    return (
        <div id="wrapper" className="main-wrapper">
            <div className="search-wrapper" onClick={() => setShowIpList(false)}>
                <div className="position-absolute">
                    <div style={{ fontSize: "3em", marginBottom: "6vh" }}>
                        <span className="top-title">{t("title")}</span>
                    </div>
                    <div className="search">
                        <p className="hint">
                            <input
                                autoFocus
                                className="ip-input"
                                type="text"
                                value={selectedIp}
                                onChange={(e) => setSelectedIp(e.target.value)}
                                placeholder={t("ip_placeholder")}
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === "Enter") {
                                        connect();
                                    }
                                }}
                            />
                        </p>
                        <ul className="ip-list" style={{ display: showIpList && armIps.length > 0 ? "block" : "none" }}>
                            {armIps.map((xarm, index) => (
                                <li key={index} onClick={() => setSelectedIp(xarm.ip)}>
                                    {index + 1}.
                                    <span style={{ color: "green" }}> {xarm.ip} </span>
                                    <span>{xarm.device_type},{xarm.axis},{xarm.arm_sn},{xarm.control_sn},{xarm.version}</span>
                                    <span style={{ color: xarm.addr_type === "localhost" ? "#2196f3" : xarm.addr_type === "PC" ? "#b58130" : "#7e57c2" }}>
                                        ({xarm.addr_type})
                                    </span>
                                </li>
                            ))}

                            {/* <li v-for="(xarm, index) in xarm_list" :key='index' @click="pickIp(xarm)">{{ index + 1 }}. <span style="color: green">{{ xarm.address }}</span> <span style="color: #585454">{{ xarm.version }}</span> <span v-if="xarm.addrType" :style="{color: xarm.addrType === 'localhost' ? '#2196f3' : xarm.addrType === 'PC' ? '#b58130' : '#7e57c2'}">({{ xarm.addrType }})</span></li> */}
                        </ul>
                        <button className="search-btn com-btn" onClick={search}>{t("search_server")}</button>
                    </div>
                    <div className="connect-wrapper">
                        {
                            selectedIp ? (
                                <button className="connect-btn com-btn" onClick={connect}>{t("connect")}</button>
                            ) : (
                                <div className="title">
                                    <img src={logo_xarm} />
                                    <h3>{t("title")}</h3>
                                </div>
                            )
                        }
                    </div>
                    <div className="connect-tips">{connectTip}</div>
                </div>
                {/* <div className={clsx(connectTip && "text-red-500")}>{connectTip}</div>
                <div v-else className="search">
                    <button className="connect-btn com-btn" style={{ background: "#3662ec", marginTop: "45vh" }} onClick={() => { }}>
                        连接失败
                    </button>
                </div> */}
                {/* <ProgressBar /> */}
            </div >
        </div>
    )
}
