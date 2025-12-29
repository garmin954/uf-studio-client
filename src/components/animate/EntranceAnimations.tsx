import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

// 渐入动画
const FadeInAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 页面加载后延迟显示动画
    const timer = setTimeout(() => {
      setVisible(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">渐入动画</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <motion.div
        className="w-full h-40 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        渐入效果
      </motion.div>
    </div>
  );
};

// 滑入动画
const SlideInAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">滑入动画</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <motion.div
        className="w-full h-40 rounded-xl bg-gradient-to-br from-secondary to-pink-500 flex items-center justify-center text-white font-bold"
        initial={{ x: -50, opacity: 0 }}
        animate={{
          x: visible ? 0 : -50,
          opacity: visible ? 1 : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        滑入效果
      </motion.div>
    </div>
  );
};

// 缩放动画
const ScaleAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">缩放动画</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <motion.div
        className="w-full h-40 rounded-xl bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center text-white font-bold"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: visible ? 1 : 0.8,
          opacity: visible ? 1 : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        缩放效果
      </motion.div>
    </div>
  );
};

// 旋转动画
const RotateAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">旋转动画</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <motion.div
        className="w-40 h-40 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold mx-auto"
        initial={{ rotate: -90, opacity: 0 }}
        animate={{
          rotate: visible ? 0 : -90,
          opacity: visible ? 1 : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        旋转效果
      </motion.div>
    </div>
  );
};

// 弹跳入场动画
const BounceAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">弹跳入场</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <motion.div
        className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold mx-auto"
        initial={{ y: -100, scale: 0.7, opacity: 0 }}
        animate={{
          y: visible ? 0 : -100,
          scale: visible ? 1 : 0.7,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 10,
          duration: 0.8,
        }}
      >
        弹跳效果
      </motion.div>
    </div>
  );
};

// 从角落展开动画
const CornerExpandAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">角落展开</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <motion.div
        className="w-full h-40 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-bold"
        initial={{
          scale: 0,
          opacity: 0,
          originX: 0,
          originY: 0,
        }}
        animate={{
          scale: visible ? 1 : 0,
          opacity: visible ? 1 : 0,
        }}
        transition={{ duration: 0.6 }}
      >
        角落展开
      </motion.div>
    </div>
  );
};

// 模糊入场动画
const BlurInAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">模糊入场</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <motion.div
        className="w-full h-40 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold"
        initial={{
          opacity: 0,
          filter: "blur(10px)",
        }}
        animate={{
          opacity: visible ? 1 : 0,
          filter: visible ? "blur(0)" : "blur(10px)",
        }}
        transition={{ duration: 0.7 }}
      >
        模糊效果
      </motion.div>
    </div>
  );
};

// 分割入场动画
const SplitAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">分割入场</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <div className="relative h-40">
        <motion.div
          className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-r from-purple-500 to-indigo-600"
          initial={{
            y: -50,
            opacity: 0,
          }}
          animate={{
            y: visible ? 0 : -50,
            opacity: visible ? 1 : 0,
          }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-r from-indigo-600 to-blue-500"
          initial={{
            y: 50,
            opacity: 0,
          }}
          animate={{
            y: visible ? 0 : 50,
            opacity: visible ? 1 : 0,
          }}
          transition={{ duration: 0.5 }}
        />
        <div className="absolute inset-0 flex items-center justify-center z-10 text-white font-bold">
          分割效果
        </div>
      </div>
    </div>
  );
};

// 3D翻转入场动画
const FlipAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft perspective-1000">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">3D翻转</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <motion.div
        className="w-40 h-40 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold mx-auto"
        initial={{
          rotateY: -180,
          opacity: 0,
          scale: 0.8,
        }}
        animate={{
          rotateY: visible ? 0 : -180,
          opacity: visible ? 1 : 0,
          scale: visible ? 1 : 0.8,
        }}
        transition={{ duration: 0.7 }}
      >
        3D翻转
      </motion.div>
    </div>
  );
};

// 叠加入场动画
const StackAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const colors = [
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-pink-600",
    "from-rose-500 to-orange-600",
    "from-amber-500 to-yellow-600",
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">叠加入场</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <div className="flex justify-center h-40 relative">
        {colors.map((color, index) => (
          <motion.div
            key={index}
            className={`absolute w-32 h-32 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold`}
            style={{
              zIndex: index,
              transform: `translateY(${index * 10}px)`,
            }}
            initial={{
              x: index % 2 === 0 ? -100 : 100,
              opacity: 0,
            }}
            animate={{
              x: visible ? 0 : index % 2 === 0 ? -100 : 100,
              opacity: visible ? 1 : 0,
            }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
            }}
          >
            {index + 1}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 组合入场动画
const ComboAnimation: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">组合动画</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
      <motion.div
        className="w-full h-40 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold"
        initial={{
          y: -50,
          scale: 0.9,
          opacity: 0,
          rotate: -10,
        }}
        animate={{
          y: visible ? 0 : -50,
          scale: visible ? 1 : 0.9,
          opacity: visible ? 1 : 0,
          rotate: visible ? 0 : -10,
        }}
        transition={{
          type: "spring",
          stiffness: 120,
          damping: 15,
          duration: 0.7,
        }}
      >
        组合效果
      </motion.div>
    </div>
  );
};

const EntranceAnimations = () => {
  return (
    <div className="bg-gray-50 rounded-xl p-6 shadow-soft">
      <h2 className="text-2xl font-bold mb-4">入场动画</h2>
      <div className="grid grid-cols-3 gap-8">
        <FadeInAnimation />
        <SlideInAnimation />
        <ScaleAnimation />
        <RotateAnimation />
        <BounceAnimation />
        <CornerExpandAnimation />
        <BlurInAnimation />
        <SplitAnimation />
        <FlipAnimation />
        <StackAnimation />
        <ComboAnimation />
      </div>
    </div>
  );
};

export default EntranceAnimations;
export {
  FadeInAnimation,
  SlideInAnimation,
  ScaleAnimation,
  RotateAnimation,
  BounceAnimation,
  CornerExpandAnimation,
  BlurInAnimation,
  SplitAnimation,
  FlipAnimation,
  StackAnimation,
  ComboAnimation,
};
