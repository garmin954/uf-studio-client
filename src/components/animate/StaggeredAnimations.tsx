import React from "react";
import { motion } from "framer-motion";

// 交错卡片组件
const StaggeredCards: React.FC = () => {
  const [trigger, setTrigger] = React.useState(false);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">交错卡片动画</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setTrigger(!trigger)}
        >
          重新播放
        </button>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.div
            key={index}
            className="p-5 rounded-lg bg-gray-50 flex items-center"
            initial={{ x: -30, opacity: 0 }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            transition={{
              duration: 0.5,
              delay: 0.1 * index,
            }}
            style={{
              backgroundColor: index % 2 === 0 ? "#f9fafb" : "#f3f4f6",
            }}
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold mr-4">
              {index + 1}
            </div>
            <div>
              <h4 className="font-bold">交错卡片 {index + 1}</h4>
              <p className="text-sm text-gray-600">
                这是一个交错动画效果的示例
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 交错网格组件
const StaggeredGrid: React.FC = () => {
  const [trigger, setTrigger] = React.useState(false);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">交错网格动画</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setTrigger(!trigger)}
        >
          重新播放
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 16 }).map((_, index) => (
          <motion.div
            key={index}
            className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.05 * index,
            }}
            whileHover={{
              backgroundColor: "#4F46E5",
              color: "white",
            }}
          >
            {index + 1}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 交错文字动画
const StaggeredText: React.FC = () => {
  const [trigger, setTrigger] = React.useState(false);
  const text = "Framer Motion 交错动画";

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">交错文字动画</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setTrigger(!trigger)}
        >
          重新播放
        </button>
      </div>
      <motion.h2 className="text-4xl font-bold text-gray-800">
        {Array.from(text).map((char, index) => (
          <motion.span
            key={index}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.1 * index,
            }}
            whileHover={{
              color: "#4F46E5",
              scale: 1.2,
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.h2>
    </div>
  );
};

// 交错图标动画
const StaggeredIcons: React.FC = () => {
  const [trigger, setTrigger] = React.useState(false);
  const icons = [
    "fa-star",
    "fa-heart",
    "fa-bolt",
    "fa-cube",
    "fa-rocket",
    "fa-code",
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">交错图标动画</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setTrigger(!trigger)}
        >
          重新播放
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        {icons.map((icon, index) => (
          <motion.div
            key={index}
            className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.1 * index,
            }}
            whileHover={{
              scale: 1.2,
              backgroundColor: "#4F46E5",
            }}
          >
            <i
              className={`fa ${icon} text-2xl ${
                index % 2 === 0 ? "text-primary" : "text-secondary"
              }`}
            ></i>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const StaggeredAnimations = () => {
  return (
    <div className="bg-gray-50 rounded-xl p-6 shadow-soft">
      <StaggeredCards />
      <StaggeredGrid />
      <StaggeredText />
      <StaggeredIcons />
    </div>
  );
};

export default StaggeredAnimations;
export { StaggeredCards, StaggeredGrid, StaggeredText, StaggeredIcons };
