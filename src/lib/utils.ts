import { clsx, type ClassValue } from "clsx"
import { toast } from "sonner";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export function sleep(wait: number = 3000) {
  return new Promise(resolve => setTimeout(resolve, wait))
}


export function formatBytes(bytes: number): string {
  if (bytes >= 1099511627776) {
    return (bytes / 1099511627776).toFixed(2) + 'T';
  } else if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + 'GB';
  } else if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + 'MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + 'KB';
  } else {
    return bytes + 'B';
  }
}


export function formatSpeed(speed: number): string {
  if (speed >= 1073741824) {
    return (speed / 1073741824).toFixed(2) + ' GB/s';
  } else if (speed >= 1048576) {
    return (speed / 1048576).toFixed(2) + ' MB/s';
  } else if (speed >= 1024) {
    return (speed / 1024).toFixed(2) + ' KB/s';
  } else {
    return speed.toFixed(2) + ' B/s';
  }
}


export function enterEvent(e: React.KeyboardEvent<HTMLInputElement>, fnc: () => void, blur = false) {
  const { type } = e;
  const isEnterKey =
    (e as React.KeyboardEvent<HTMLInputElement>).key === "Enter";
  const isClickEvent = type === "click";

  if ((type === "keydown" && isEnterKey) || isClickEvent) {
    blur && e.currentTarget.blur();
    fnc()
  }
}


export function getVersionNumber(str: string): string {
  const parts = str.split('_');
  const versionPartIndex = parts.length - 1;
  const versionPart = parts[versionPartIndex];
  const dotIndex = versionPart.lastIndexOf('.');
  if (dotIndex !== -1) {
    return versionPart.substring(0, dotIndex);
  }
  return versionPart;
}


function normalizeVersion(version: string): number[] | null {
  if (!version) return null;
  console.log('version', version);

  const trimmed = version.trim();
  const firstDigitIndex = trimmed.search(/\d/);
  if (firstDigitIndex === -1) return null;
  const numericPart = trimmed.slice(firstDigitIndex);
  if (!/^\d+(\.\d+)*$/.test(numericPart)) return null;
  const parts = numericPart.split('.');
  const nums: number[] = [];
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isFinite(n)) return null;
    nums.push(n);
  }
  return nums;
}


/**
 * 比较两个版本号
 * @param version1 版本号1
 * @param version2 版本号2
 * @returns 1: version1 > version2, -1: version1 < version2, 0: version1 = version2
 */
export function compareVersions(version1: string, version2: string): number {
  const parts1 = normalizeVersion(version1);
  const parts2 = normalizeVersion(version2);
  if (!parts1 || !parts2) return 0;
  const length = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < length; i++) {
    const v1 = parts1[i] ?? 0;
    const v2 = parts2[i] ?? 0;
    if (v1 > v2) {
      return 1;
    }
    if (v1 < v2) {
      return -1;
    }
  }
  return 0;
}


export function deepClone<T>(source: T, seen = new WeakMap()): T {
  if (source === null || typeof source !== 'object') {
    return source;
  }

  if (seen.has(source)) {
    return seen.get(source);
  }

  if (source instanceof Date) {
    const copy = new Date(source.getTime()) as unknown as T;
    seen.set(source, copy);
    return copy;
  }

  if (source instanceof RegExp) {
    const copy = new RegExp(source.source, source.flags) as unknown as T;
    seen.set(source, copy);
    return copy;
  }

  if (Array.isArray(source)) {
    const copy = [] as unknown[];
    seen.set(source, copy);
    for (const item of source) {
      copy.push(deepClone(item, seen));
    }
    return copy as unknown as T;
  }

  const copy = {} as { [key: string]: any };
  seen.set(source, copy);
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      copy[key] = deepClone(source[key], seen);
    }
  }

  return copy as T;
}




type RspData = {
  code: number;
  msg: string;
}

// 响应信息提示
export function responseTips(data: RspData) {
  const { code, msg } = data
  // 10002 错误信息
  if (code === 10002) {
    return toast.error(msg);
  }

  // 10003 提示信息
  if (code === 10003) {
    return toast.info(msg);
  }
  // ...
}


type Point = {
  x: number,
  y: number,
}
export function isPointInsideDiv(point: Point, div: HTMLElement) {
  const rect = div.getBoundingClientRect();
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

/**
 * 深度合并两个对象，保留目标对象中源对象没有的属性
 * @param target 目标对象，合并后会被修改
 * @param source 源对象，提供要合并的属性
 * @returns 合并后的目标对象
 */
export function deepMerge<T extends object, S extends object>(target: T, source: S): T & S {
  // 确保目标和源都是普通对象
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return source as T & S;
  }

  // 遍历源对象的所有可枚举属性
  for (const key of Object.keys(source) as (keyof S)[]) {
    const targetValue = target[key as unknown as keyof T];
    const sourceValue = source[key];

    // 如果源属性值是普通对象，且目标属性也是普通对象，则递归合并
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      target[key as unknown as keyof T] = deepMerge(targetValue, sourceValue) as any;
    } else {
      // 否则直接用源值覆盖目标值（包括源值为 undefined 的情况）
      target[key as unknown as keyof T] = sourceValue as any;
    }
  }

  return target as T & S;
}

/**
 * 检查值是否为普通对象（通过 {} 或 new Object() 创建）
 */
function isPlainObject(value: any): value is object {
  if (typeof value !== 'object' || value === null) return false;

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}


//最大长度14位，只允许输入数字和英文字母，自动过滤空格
export function checkSn(sn: string) {
  const value = sn.replace(/\s/g, '')
  if (!/^[0-9a-zA-Z]*$/.test(value) || value.length > 14) {
    return
  }

  return true
}


/**
 * 带超时且可中断的 fetch 请求
 * @param {string} url - 请求地址
 * @param {RequestInit} options - fetch 配置
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Response>}
 */
export function fetchWithAbortTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
  const controller = new AbortController();
  const fetchOptions = { ...options, signal: controller.signal };
  const fetchPromise = fetch(url, fetchOptions);
  let timer: any;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`超时(${timeout}ms)，已中断`));
    }, timeout);
  });

  // 清理定时器
  const racePromise = Promise.race([fetchPromise, timeoutPromise]);
  racePromise.finally(() => clearTimeout(timer));

  // 暴露手动中止方法（可选）
  return {
    promise: racePromise,
    abort: () => {
      controller.abort();
      clearTimeout(timer);
    },
  };
}
