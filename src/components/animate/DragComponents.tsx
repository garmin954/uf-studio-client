import React, { useState } from "react";
import { motion } from "framer-motion";

// 基础拖拽组件
const BasicDrag: React.FC = () => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <h3 className="text-xl font-bold mb-4">基础拖拽</h3>
      <div className="h-64 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
        <motion.div
          className="w-24 h-24 rounded-lg flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br from-primary to-purple-600"
          drag
          dragConstraints={{
            top: 0,
            left: 0,
            right: 448,
            bottom: 256,
          }}
          whileDrag={{
            scale: 1.1,
            opacity: 0.8,
            boxShadow: "0 15px 30px rgba(79, 70, 229, 0.4)",
          }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          拖拽我
        </motion.div>
      </div>
    </div>
  );
};

// 弹性拖拽组件
const ElasticDrag: React.FC = () => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <h3 className="text-xl font-bold mb-4">弹性拖拽</h3>
      <div className="h-64 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
        <motion.div
          className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br from-secondary to-pink-500"
          drag
          dragElastic={0.3}
          whileDrag={{
            scale: 1.1,
            opacity: 0.8,
            boxShadow: "0 15px 30px rgba(236, 72, 153, 0.4)",
          }}
          transition={{ type: "spring", stiffness: 100, damping: 10 }}
        >
          弹性拖拽
        </motion.div>
      </div>
    </div>
  );
};

// 拖拽排序组件
const SortableDrag: React.FC = () => {
  const [items, _setItems] = useState([
    { id: 1, title: "项目一" },
    { id: 2, title: "项目二" },
    { id: 3, title: "项目三" },
    { id: 4, title: "项目四" },
    { id: 5, title: "项目五" },
  ]);

  const handleDragEnd = (_e: any, _item: any) => {
    // 这里可以实现排序逻辑
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <h3 className="text-xl font-bold mb-4">拖拽排序</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <motion.div
            key={item.id}
            className="p-4 rounded-lg bg-gray-50 flex items-center justify-between cursor-grab"
            drag
            dragConstraints={{ left: 0, right: 0 }}
            whileDrag={{
              scale: 1.02,
              boxShadow: "0 5px 10px rgba(0, 0, 0, 0.05)",
              backgroundColor: "#fff",
            }}
            onDragEnd={(e) => handleDragEnd(e, item)}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center text-white">
                {item.id}
              </div>
              <span>{item.title}</span>
            </div>
            <i className="fa fa-bars text-gray-400"></i>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 拖拽到目标组件
const DragToTarget: React.FC = () => {
  const [isDropped, _setIsDropped] = useState(false);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <h3 className="text-xl font-bold mb-4">拖拽到目标</h3>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
          <motion.div
            className="w-24 h-24 rounded-lg flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br from-amber-500 to-orange-500"
            drag
            dragConstraints={{
              top: 0,
              left: 0,
              right: 224,
              bottom: 256,
            }}
            whileDrag={{
              scale: 1.1,
              opacity: 0.8,
            }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            拖到右侧
          </motion.div>
        </div>
        <div
          className={`h-64 rounded-lg flex items-center justify-center ${
            isDropped ? "bg-green-100 border-2 border-green-300" : "bg-gray-100"
          }`}
        >
          <div className="text-center">
            <i
              className={`fa ${
                isDropped
                  ? "fa-check-circle text-5xl text-green-500"
                  : "fa-arrow-left text-5xl text-gray-400"
              }`}
            ></i>
            <p className="mt-4 font-medium">
              {isDropped ? "已成功放置" : "拖放到这里"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DragComponents = () => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <h3 className="text-xl font-bold mb-4">拖拽组件</h3>
      <div className="grid grid-cols-2 gap-6">
        <BasicDrag />
        <ElasticDrag />
        <SortableDrag />
        <DragToTarget />
      </div>
    </div>
  );
};

export default DragComponents;
export { BasicDrag, ElasticDrag, SortableDrag, DragToTarget };
