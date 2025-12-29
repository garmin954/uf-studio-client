import React from "react";
import { motion } from "framer-motion";

// 3D旋转卡片组件
const Rotate3DCard: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-soft">
    <h3 className="text-xl font-bold mb-4">3D旋转卡片</h3>
    <div className="h-80 flex items-center justify-center">
      <motion.div
        className="w-64 h-80 rounded-xl overflow-hidden shadow-medium relative perspective-1000"
        whileHover={{
          rotateX: [-5, 5, -5],
          rotateY: [5, -5, 5],
        }}
        transition={{ duration: 3, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-600"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
            <i className="fa fa-cube text-3xl"></i>
          </div>
          <h4 className="text-2xl font-bold mb-3">3D变换</h4>
          <p>悬停时体验平滑的3D旋转效果</p>
        </div>
      </motion.div>
    </div>
  </div>
);

// 透视卡片组件
const PerspectiveCard: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-soft">
    <h3 className="text-xl font-bold mb-4">透视卡片</h3>
    <div className="h-80 flex items-center justify-center">
      <motion.div
        className="w-64 h-80 rounded-xl overflow-hidden shadow-medium relative"
        whileHover={{
          perspective: 1000,
          rotateX: 10,
          rotateY: -10,
          scale: 1.05,
        }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-pink-500"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
            <i className="fa fa-eye text-3xl"></i>
          </div>
          <h4 className="text-2xl font-bold mb-3">透视效果</h4>
          <p>悬停时呈现深度和立体感</p>
        </div>
      </motion.div>
    </div>
  </div>
);

// 3D导航菜单项
interface NavMenuItemProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavMenuItem: React.FC<NavMenuItemProps> = ({
  label,
  active = false,
  onClick,
}) => (
  <motion.button
    className={`px-6 py-3 rounded-lg text-gray-800 font-medium ${
      active ? "bg-primary text-white" : "bg-gray-100"
    }`}
    whileHover={{
      transformStyle: "preserve-3d",
      rotateX: -10,
      translateY: -5,
      backgroundColor: active ? "#4F46E5" : "#EC4899",
      color: "white",
    }}
    transition={{ duration: 0.3 }}
    onClick={onClick}
  >
    {label}
  </motion.button>
);

// 3D导航组件
const Navigation3D: React.FC = () => {
  const [active, setActive] = React.useState(0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <h3 className="text-xl font-bold mb-4">3D导航菜单</h3>
      <div className="flex flex-wrap gap-3">
        {["首页", "产品", "服务", "关于我们", "联系"].map((item, index) => (
          <NavMenuItem
            key={index}
            label={item}
            active={active === index}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  );
};

// 3D画廊组件
const Gallery3D: React.FC = () => {
  const images = [
    "https://picsum.photos/id/1015/800/600",
    "https://picsum.photos/id/1016/800/600",
    "https://picsum.photos/id/1018/800/600",
    "https://picsum.photos/id/1019/800/600",
    "https://picsum.photos/id/1020/800/600",
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-soft">
      <h3 className="text-xl font-bold mb-4">3D画廊</h3>
      <div className="h-96 relative perspective-1000">
        <div className="absolute inset-0 bg-gray-100 rounded-lg"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-80 perspective-1000">
            {images.map((image, index) => (
              <motion.div
                key={index}
                className="absolute w-full h-full rounded-lg overflow-hidden shadow-medium"
                style={{
                  backgroundImage: `url(${image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transform: `rotateY(${
                    (index - 2) * 45
                  }deg) translateZ(200px)`,
                }}
                whileHover={{
                  scale: 1.05,
                  zIndex: 10,
                }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Transform3D = () => {
  return (
    <div className="p-4">
      <Rotate3DCard />
      <PerspectiveCard />
      <Navigation3D />
      <Gallery3D />
    </div>
  );
};
export default Transform3D;
export { Rotate3DCard, PerspectiveCard, Navigation3D, Gallery3D };
