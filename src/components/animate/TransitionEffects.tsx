import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// 淡入淡出过渡
const FadeTransition: React.FC = () => {
  const [show, setShow] = useState(true);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">淡入淡出过渡</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setShow(!show)}
        >
          {show ? "隐藏" : "显示"}
        </button>
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            className="w-64 h-40 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            淡入淡出效果
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 滑入滑出过渡
const SlideTransition: React.FC = () => {
  const [show, setShow] = useState(true);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">滑入滑出过渡</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setShow(!show)}
        >
          {show ? "隐藏" : "显示"}
        </button>
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            className="w-64 h-40 rounded-xl bg-gradient-to-br from-secondary to-pink-500 flex items-center justify-center text-white font-bold mx-auto"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            滑入滑出效果
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 缩放过渡
const ScaleTransition: React.FC = () => {
  const [show, setShow] = useState(true);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">缩放过渡</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setShow(!show)}
        >
          {show ? "隐藏" : "显示"}
        </button>
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            className="w-64 h-40 rounded-xl bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center text-white font-bold mx-auto"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            缩放效果
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 切换过渡
const SwitchTransition: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">内容切换过渡</h3>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => setCount(count + 1)}
        >
          切换
        </button>
      </div>
      <div className="flex justify-center">
        <AnimatePresence>
          <motion.div
            key={count}
            className="w-64 h-40 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            内容 {count + 1}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const TransitionEffects = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <FadeTransition />
      <SlideTransition />
      <ScaleTransition />
      <SwitchTransition />
    </div>
  );
};

export default TransitionEffects;
export { FadeTransition, SlideTransition, ScaleTransition, SwitchTransition };
