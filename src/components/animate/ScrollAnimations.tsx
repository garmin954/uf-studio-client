import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// 滚动触发动画组件
const ScrollTrigger: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-soft">
    <h3 className="text-xl font-bold mb-4">滚动触发动画</h3>
    <div className="space-y-8">
      {Array.from({ length: 5 }).map((_, index) => {
        const ref = useRef<HTMLDivElement>(null);
        const { scrollYProgress } = useScroll({
          target: ref,
          offset: ["start end", "center start"],
        });

        const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
        const scale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);

        return (
          <div key={index} ref={ref} className="h-40">
            <motion.div
              className="w-full h-full rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold"
              style={{ opacity, scale }}
            >
              滚动触发 #{index + 1}
            </motion.div>
          </div>
        );
      })}
    </div>
  </div>
);

// 滚动视差组件
const ParallaxScroll: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const translateY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <h3 className="text-xl font-bold mb-4">滚动视差效果</h3>
      <div ref={ref} className="h-96 overflow-hidden rounded-lg relative">
        <div className="absolute inset-0 bg-gray-200"></div>
        <motion.div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url(https://picsum.photos/id/1015/1200/800)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: translateY,
          }}
        ></motion.div>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <h2 className="text-4xl font-bold">视差滚动效果</h2>
        </div>
      </div>
    </div>
  );
};

// 元素进入视口动画
const ViewportAnimation: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-soft">
    <h3 className="text-xl font-bold mb-4">元素进入视口动画</h3>
    <div className="grid grid-cols-2 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <motion.div
          key={index}
          className="h-40 rounded-xl bg-gradient-to-br from-secondary to-pink-500 flex items-center justify-center text-white font-bold"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 * index }}
        >
          元素 #{index + 1}
        </motion.div>
      ))}
    </div>
  </div>
);

// 滚动进度条组件
const ScrollProgress: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
  });

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <h3 className="text-xl font-bold mb-4">滚动进度指示器</h3>
      <div ref={ref} className="h-64 overflow-y-auto pr-4">
        <div className="space-y-6">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600"
            >
              内容区块 #{index + 1}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          style={{ width: scrollYProgress }}
        ></motion.div>
      </div>
    </div>
  );
};

const ScrollAnimations = () => {
  return (
    <div className="flex flex-col gap-8 p-4">
      <ScrollTrigger />
      <ParallaxScroll />
      <ViewportAnimation />
      <ScrollProgress />
    </div>
  );
};

export default ScrollAnimations;
export { ScrollTrigger, ParallaxScroll, ViewportAnimation, ScrollProgress };
