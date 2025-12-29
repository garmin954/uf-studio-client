import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useKeyPress } from "ahooks";
import LogicUpdater from "@/pages/components/Updater/LogicUpdater";



export default function ToolsModal() {
  const [open, setOpen] = useState(false);
  useKeyPress("ctrl.alt.f12", () => {
    setOpen(true);
  });


  function onCancel() {
    setOpen(false);
  }


  return (
    <Dialog open={open}>
      <DialogContent className="w-[20rem]  bg-white flex flex-col gap-4 p-4" top={15}>
        <DialogHeader className="flex justify-between">
          <DialogTitle>Tools</DialogTitle>
          <motion.div
            className="absolute right-[1rem] top-[.2rem]  w-[2rem] h-[2rem] cursor-pointer flex justify-center items-center "
            initial={{ opacity: 0, borderRadius: "0%", rotate: 0 }}
            animate={{ opacity: 1, borderRadius: "50%", rotate: 90 }}
            exit={{ opacity: 0, borderRadius: "5%", rotate: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut", type: "spring", stiffness: 100, damping: 10 }}
            whileHover={{ scale: 1.1, borderRadius: "10%", rotate: 90, backgroundColor: "rgba(0, 0, 0, 0.2)" }}
            onClick={onCancel}
          >
            <X size={15} />
          </motion.div>
        </DialogHeader>
        <LogicUpdater isBeta />
      </DialogContent>
    </Dialog>
  );
}
