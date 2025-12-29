import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// 定义侧边栏菜单项类型
interface MenuItem {
  id: string;
  name: string;
  icon: string;
  path: string;
}

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: "entrance",
      name: "入场动画",
      icon: "fa-fade-in",
      path: "entrance_animations",
    },
    {
      id: "hover",
      name: "悬停效果",
      icon: "fa-hand-pointer-o",
      path: "hover_effects",
    },
    {
      id: "drag",
      name: "拖拽功能",
      icon: "fa-arrows",
      path: "drag_components",
    },
    {
      id: "scroll",
      name: "滚动动画",
      icon: "fa-long-arrow-down",
      path: "scroll_animations",
    },
    { id: "3d", name: "3D变换", icon: "fa-cube", path: "transform_3d" },
    {
      id: "physics",
      name: "物理动画",
      icon: "fa-balance-scale",
      path: "physics_animations",
    },
    {
      id: "stagger",
      name: "交错动画",
      icon: "fa-link",
      path: "staggered_animations",
    },
    {
      id: "transition",
      name: "过渡效果",
      icon: "fa-exchange",
      path: "transition_effects",
    },
  ];

  // 显示通知
  const showNotificationHandler = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <div>
      <div className="flex h-screen overflow-hidden">
        {/* 侧边栏 */}
        <motion.aside
          className={`bg-white shadow-medium fixed lg:relative z-30 h-full transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="p-4 flex items-center justify-between">
            <motion.div
              className="flex items-center space-x-3"
              animate={{ opacity: sidebarOpen ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <i className="fa fa-magic text-white"></i>
              </div>
              <h1 className="text-xl font-bold text-primary">Motion</h1>
            </motion.div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <i
                className={`fa ${
                  sidebarOpen ? "fa-angle-left" : "fa-angle-right"
                } text-gray-500`}
              ></i>
            </button>
          </div>

          <nav className="mt-6">
            {menuItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center p-3 mb-1 rounded-lg transition-all text-xl ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-50"
                  }`
                }
                onClick={() => !sidebarOpen && setSidebarOpen(true)}
              >
                <i className={`fa ${item.icon} w-6 text-center`}></i>
                <motion.span
                  className="ml-3"
                  animate={{
                    opacity: sidebarOpen ? 1 : 0,
                    width: sidebarOpen ? "auto" : 0,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {item.name}
                </motion.span>
              </NavLink>
            ))}
          </nav>

          <div className="absolute bottom-16 left-0 right-0 p-4">
            <motion.div
              className={`glass rounded-xl p-4 shadow-soft ${
                sidebarOpen ? "mx-4" : "mx-2"
              }`}
              animate={{ opacity: sidebarOpen ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-pink-500"></div>
                <div>
                  <p className="text-sm font-medium">Framer 开发者</p>
                  <p className="text-xs text-gray-500">高级账户</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.aside>

        {/* 主内容区 */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* 顶部导航栏 */}
          <motion.header
            className="fixed top-0 right-0 left-0 lg:left-64 z-20 transition-all duration-300 bg-white/90 backdrop-blur-md shadow-sm py-3"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="container mx-auto px-4 flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 mr-3 lg:hidden"
                >
                  <i className="fa fa-bars text-gray-600"></i>
                </button>
                <h2 className="text-xl font-bold text-gray-800">
                  Framer Motion 动画效果展示
                </h2>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={showNotificationHandler}
                  className="p-2 rounded-lg hover:bg-gray-100 relative"
                >
                  <i className="fa fa-bell text-gray-600"></i>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full"></span>
                </button>

                <div className="relative">
                  <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600"></div>
                    <span className="hidden md:inline-block text-sm font-medium">
                      开发者
                    </span>
                    <i className="fa fa-angle-down text-gray-500"></i>
                  </button>
                </div>
              </div>
            </div>
          </motion.header>

          {/* 主内容 */}
          <div className="container mx-auto px-4 pt-4 pb-12">
            <Outlet />
          </div>
        </div>
      </div>

      {/* 通知 */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            className="fixed top-4 right-4 bg-white rounded-lg shadow-medium p-4 flex items-center max-w-sm z-40"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
              <i className="fa fa-bell"></i>
            </div>
            <div>
              <h4 className="font-bold text-gray-800">新通知</h4>
              <p className="text-sm text-gray-600">
                您有一个新的动画效果已添加到库中
              </p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="ml-4 p-1 rounded-full hover:bg-gray-100"
            >
              <i className="fa fa-times text-gray-500"></i>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
