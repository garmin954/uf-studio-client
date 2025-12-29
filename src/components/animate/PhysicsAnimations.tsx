import React from "react";
import { motion } from "framer-motion";

// 弹簧动画组件
const SpringAnimation: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-soft">
    <h3 className="text-xl font-bold mb-4">弹簧动画</h3>
    <div className="h-64 flex items-center justify-center">
      <motion.div
        className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-primary to-purple-600"
        animate={{
          x: [0, 100, 0, -100, 0],
          y: [0, -50, 0, -50, 0],
        }}
        transition={{
          type: "spring",
          stiffness: 50,
          damping: 10,
          duration: 3,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      >
        弹簧
      </motion.div>
    </div>
  </div>
);

// 弹性卡片组件
const ElasticCard: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-soft">
    <h3 className="text-xl font-bold mb-4">弹性卡片</h3>
    <div className="h-64 flex items-center justify-center">
      <motion.div
        className="w-64 h-40 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br from-secondary to-pink-500"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
        }}
        whileHover={{
          scale: 1.05,
          rotate: 5,
        }}
        whileTap={{
          scale: 0.95,
          rotate: -5,
        }}
      >
        <div className="text-center">
          <h4 className="text-xl font-bold mb-2">弹性卡片</h4>
          <p className="font-normal">体验物理弹性效果</p>
        </div>
      </motion.div>
    </div>
  </div>
);

// 物理悬停网格
const PhysicsGrid: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-soft">
    <h3 className="text-xl font-bold mb-4">物理悬停网格</h3>
    <div className="grid grid-cols-4 gap-4 h-64">
      {Array.from({ length: 16 }).map((_, index) => (
        <motion.div
          key={index}
          className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold"
          whileHover={{
            scale: 1.2,
            rotate: 15,
            y: -10,
            backgroundColor: "#4F46E5",
            color: "white",
          }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 10,
          }}
        >
          {index + 1}
        </motion.div>
      ))}
    </div>
  </div>
);

// 弹跳效果组件
const BouncingBall: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-soft">
    <h3 className="text-xl font-bold mb-4">弹跳效果</h3>
    <div className="h-64 relative overflow-hidden rounded-lg border-2 border-gray-200 flex items-end justify-center">
      <motion.div
        className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500"
        animate={{
          y: [0, -300, 0, -200, 0, -100, 0],
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          duration: 3,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      ></motion.div>
    </div>
  </div>
);

const PhysicsAnimations = () => {
  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <h2 className="text-2xl font-bold mb-4">物理动画示例</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SpringAnimation />
        <ElasticCard />
        <PhysicsGrid />
        <BouncingBall />
      </div>
    </div>
  );
};

export default PhysicsAnimations;
export { SpringAnimation, ElasticCard, PhysicsGrid, BouncingBall };
