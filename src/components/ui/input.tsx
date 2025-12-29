import * as React from "react";

import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { useDebounceFn } from "ahooks";
import { info } from "@tauri-apps/plugin-log";

type ExpandProps = {
  fixed?: number;
  prefix?: string; // 添加前缀属性
  prefixCls?: string; // 添加前缀样式属性
  suffix?: React.ReactNode;
  suffixCls?: string; // 添加后缀样式属性
  readonly?: boolean;
  // 强制英文
  forceEnglish?: boolean;
};
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
  ExpandProps { }

let timer = 0
let timer2 = 0
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, autoFocus = false, suffix, suffixCls, prefix, prefixCls, readonly, forceEnglish, ...props }, ref) => {


    const { run: setKeyboardLayout } = useDebounceFn((layout: string) => {
      layout === "chinese" ? invoke("switch_cn_keyboard") : invoke("switch_us_keyboard")
    }, { wait: 300 })

    const handleOnBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement, Element>) => {
      if (forceEnglish) {
        info("🥑🥑🥑switch_us_keyboard========> blur：" + timer);
        // invoke("switch_cn_keyboard")
        setKeyboardLayout("chinese")
        timer++
      }
      if (
        type === "number" &&
        props.max !== undefined &&
        props.min !== undefined
      ) {
        const inputValue = e.currentTarget.value;
        if (
          inputValue !== "" &&
          inputValue != undefined &&
          inputValue != null
        ) {
          let value: number;

          if (/^\d*\.?\d+$/.test(inputValue)) {
            // 如果输入是小数，使用 Number 函数转换并保留小数精度
            value = Number(inputValue);
          } else {
            value = parseInt(inputValue, 10);
          }

          if (props?.fixed) {
            e.currentTarget.value = value.toFixed(props?.fixed);
          }
          const minValue = Number(props.min);
          const maxValue = Number(props.max);
          const errorMargin = 0.01; // 设置一个小的误差范围
          if (value > maxValue + errorMargin) {
            e.currentTarget.value = props.max.toString();
          } else if (value < minValue - errorMargin) {
            e.currentTarget.value = props.min.toString();
          }

          e.currentTarget.value = e.currentTarget.value || "0";
        }

        props.onInput?.(e);
        props.onChange?.(e);
      }
      props.onBlur?.(e);
    }, [forceEnglish]);


    // const [inputType, setInputType] = React.useState(type);
    const handleOnFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement, Element>) => {
      // 强制英文输入 
      if (forceEnglish) {
        info("🥕🥕🥕switch_us_keyboard========> focus：" + timer2);
        setKeyboardLayout("english")
        timer2++
      }
      props.onFocus?.(e);
    }, [forceEnglish]);



    // 最终type
    // const finalType = !forceEnglish ? type : inputType;
    // 修改 Input 组件中的前缀样式，确保不会挡住输入光标
    return (
      <div className={cn(
        "relative flex items-center",
      )}>
        {prefix && (
          <div
            className={cn(
              "absolute left-1 top-1/2 -translate-y-1/2  flex items-center justify-center bottom-0 px-1 rounded-sm bg-background",
              "text-muted-foreground text-lg pointer-events-none",
              prefixCls
            )}
          >
            {prefix}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-default w-full border border-input rounded-md bg-background px-3 py-2 text-sm ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground ",
            "placeholder:text-disabled focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 text-lg un-spin",
            // "read-only:cursor-auto read-only:opacity-50",
            prefix && "pl-[4rem] ",
            suffix && "rounded-r-none border-r-0",
            className
          )}
          autoFocus={autoFocus}
          ref={ref}
          data-force-english={forceEnglish ? "true" : undefined}
          {...props}
          onBlur={handleOnBlur}
          onFocus={handleOnFocus}
          readOnly={readonly}
        />

        {suffix && (
          <div
            className={cn(
              "flex items-center justify-center rounded-r-sm bg-background border border-input",
              "text-muted-foreground text-lg pointer-events-all h-default ",
              suffixCls
            )}
          >
            {suffix}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
