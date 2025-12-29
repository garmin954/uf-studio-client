import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { ArrowRight, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import wholeMachineTest from "@/assets/svgs/whole_machine_test_logo.svg";

const enterOpts = [
  {
    label: "配件测试",
    icon: "test_configuration",
    description: "适用于xArm机械爪、BIO机械爪G2和六维力矩的功能测试",
    path: "/app/accessories",
  },
  {
    label: "关节测试",
    icon: "test_joint",
    description: "适用于Lite6、850和xArm1305单关节的功能测试",
    path: "/app/joint_test",
  },
  {
    label: "老化测试",
    icon: "test-aging",
    description: "适用于BIO机械爪G2和六维力矩的老化测试",
    path: "/app/aging_test",
  },
  {
    label: "整机测试",
    icon: wholeMachineTest,
    isSvg: true,
    description: "适用于 Lite6，850，xArm1305的整机测试",
    path: "/app/whole_machine_test",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch({ type: "app/setTitleBar", payload: { visible: false } });
  }, []);

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* <RippleBackground /> */}
      <div className="h-full w-full flex flex-col items-center pt-[8%] gap-24 relative">
        <div className="flex gap-4 items-center">
          <AnimateTitleBoll />
        </div>

        <ul className="grid grid-cols-4 gap-8 mt-4">
          {enterOpts.map((opt, index) => (
            <li
              className="bg-card px-[3.7rem]  py-8 shadow rounded-xl w-[23.25rem] h-[21.2rem] cursor-pointer transition-all duration-300 hover:shadow-lg group"
              key={index}
              onClick={() => {
                navigate(opt.path);
              }}
            >
              <div className="m-auto mb-[1.3rem] w-24 h-20 flex justify-center items-center">
                {opt.isSvg ? <img src={opt.icon} alt={opt.label} className="w-full h-full" /> : (
                  <i
                    className={`iconfont text-[3.3rem] text-primary icon-${opt.icon} `}
                  />
                )}

              </div>

              <div className="text-center text-2xl font-sans font-bold mb-4">
                {opt.label}
              </div>

              <div className="text-center text-base mb-[1.3rem] text-subtext">
                {opt.description}
              </div>
              <div className="w-full text-center">
                <Button className="mx-auto w-[11.85rem] h-[2.7rem] text-base">
                  开始测试 <ArrowRight />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div
          className="cursor-pointer absolute right-[3rem] bottom-[3rem] transition-all  duration-300 hover:rotate-90"
          onClick={() => navigate("/app/settings")}
        >
          <Settings size={50} className="text-primary" />
        </div>
      </div>
    </div >
  );
}


function AnimateTitleBoll() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  const animationRef = useRef<{
    isActive: boolean;
    rect?: DOMRect;
    ballParams?: Array<{
      freqX: number;
      freqY: number;
      amp: number;
      phase: number;
    }>;
    startTime?: number;
    rafId?: number;
  }>({ isActive: true });

  // 使用 useCallback 缓存动画函数，避免重复创建
  const animate = useCallback((currentTime: number) => {
    const animState = animationRef.current;
    const el = titleRef.current;
    if (!animState.isActive || !animState.rect || !animState.ballParams || !el) return;

    if (!animState.startTime) animState.startTime = currentTime;
    const duration = 8000;
    const elapsed = (currentTime - animState.startTime) % duration;
    const t = elapsed / duration;

    const vars = [
      {
        x: animState.ballParams[0].freqX * Math.cos(t * Math.PI * 2 + animState.ballParams[0].phase) * 45 + 50,
        y: animState.ballParams[0].amp * Math.sin(t * Math.PI * 2 + animState.ballParams[0].phase) * 100 + 50,
      },
      {
        x: animState.ballParams[1].freqX * Math.cos(t * Math.PI * 2 + animState.ballParams[1].phase) * 45 + 50,
        y: animState.ballParams[1].amp * Math.sin(t * Math.PI * 2 + animState.ballParams[1].phase) * 100 + 50,
      },
      {
        x: animState.ballParams[2].freqX * Math.cos(t * Math.PI * 2 + animState.ballParams[2].phase) * 45 + 50,
        y: animState.ballParams[2].amp * Math.sin(t * Math.PI * 2 + animState.ballParams[2].phase) * 100 + 50,
      },
    ];

    // ⚡ 直接通过 DOM API 设置变量，不触发 React 渲染
    vars.forEach((pos, i) => {
      el.style.setProperty(`--pos-${i + 1}-x`, `${pos.x}%`);
      el.style.setProperty(`--pos-${i + 1}-y`, `${pos.y}%`);
    });

    animState.rafId = requestAnimationFrame(animate);
  }, []);

  const resizeTimeoutRef = useRef<number>();
  // 初始化动画参数和开始动画
  useEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return;

    // 只在初始化时获取一次元素尺寸，减少重排
    const rect = titleElement.getBoundingClientRect();

    // 生成随机参数并存储在 ref 中，避免每次渲染重新创建
    animationRef.current = {
      isActive: true,
      rect,
      ballParams: Array(3).fill(0).map(() => ({
        freqX: 0.5 + Math.random() * 0.5,
        freqY: 0.5 + Math.random() * 0.5,
        amp: 0.35 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
      })),
    };

    // 启动动画
    const rafId = requestAnimationFrame(animate);
    animationRef.current.rafId = rafId;

    // 添加 resize 事件监听器，在窗口大小变化时更新元素尺寸
    const handleResize = () => {
      if (titleElement && animationRef.current.isActive) {
        animationRef.current.rect = titleElement.getBoundingClientRect();
      }
    };

    // 使用节流函数减少 resize 事件触发频率
    const throttledResize = () => {
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = window.setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', throttledResize);

    return () => {
      // 清理逻辑
      const animState = animationRef.current;
      animState.isActive = false;
      if (animState.rafId) {
        cancelAnimationFrame(animState.rafId);
      }
      window.removeEventListener('resize', throttledResize);
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }


    };
  }, [animate]);

  return (
    <motion.h1
      ref={titleRef}
      className="text-[3rem] font-sans font-bold relative will-change-auto"
      style={{
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "black",
        background: `
              radial-gradient(circle closest-side at var(--pos-1-x) var(--pos-1-y), #2563eb, transparent),
              radial-gradient(circle closest-side at var(--pos-2-x) var(--pos-2-y), #2563eb, transparent),
              radial-gradient(circle closest-side at var(--pos-3-x) var(--pos-3-y), #2563eb, transparent)
            `,
      }}
    >
      UFACTORY Studio
    </motion.h1>
  )
}

// @ts-ignore
function RippleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const sizeRef = useRef<{ width: number; height: number }>({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const pointsRef = useRef<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const createGrid = (width: number, height: number) => {
      // 稍微加密中心区域的点阵密度
      const spacing = 45;
      const margin = 0;
      const pts: Array<{ x: number; y: number }> = [];
      for (let x = margin; x < width - margin; x += spacing) {
        for (let y = margin; y < height - margin; y += spacing) {
          pts.push({ x, y });
        }
      }
      pointsRef.current = pts;
    };

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      sizeRef.current = { width, height };
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createGrid(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    // @ts-ignore
    let lastMouseTime = performance.now();

    const handleMouseMove = useCallback((e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
      lastMouseTime = performance.now();
    }, []);

    const handleMouseLeave = useCallback(() => {
      mouseRef.current.active = false;
    }, []);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const start = performance.now();

    const render = (time: number) => {
      const t = (time - start) / 1000;
      const { width, height } = sizeRef.current;
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const baseRadius = 1.1;
      const maxOffset = 22;
      const waveLength = 70;
      const waveSpeed = 5;
      const influenceRadius = 520; // 超过这个距离几乎不受影响

      for (const p of pointsRef.current) {
        let dx = 0;
        let dy = 0;
        let scale = 1;
        let alpha = 0.15;

        if (mouse.active) {
          const vx = p.x - mouse.x;
          const vy = p.y - mouse.y;
          const dist = Math.sqrt(vx * vx + vy * vy) || 1;

          if (dist < influenceRadius) {
            const dirX = vx / dist;
            const dirY = vy / dist;

            // 椭圆波：结合距离和时间，让波纹像水波一样向外传播
            const phase = dist / waveLength - t * waveSpeed;
            const wave = Math.sin(phase);

            // 高斯衰减，越远影响越小
            const falloff = Math.exp(-Math.pow(dist / influenceRadius, 2));

            // 组合径向 + 切向偏移，制造轻微旋涡感
            const radialOffset = wave * falloff * maxOffset;
            const tangentialOffset = radialOffset * 0.35;

            dx = dirX * radialOffset - dirY * tangentialOffset;
            dy = dirY * radialOffset + dirX * tangentialOffset;

            // 尺寸和透明度随波纹衰减
            scale = 1 + wave * falloff * 0.9;
            alpha = 0.04 + falloff * 0.95;
          }
        }

        const x = p.x + dx;
        const y = p.y + dy;
        const r = baseRadius * scale;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37, 99, 235, ${alpha})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
