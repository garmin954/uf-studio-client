import { Button, ButtonProps } from "@/components/ui/button";
import { useState } from "react";

type Props = {
    children: React.ReactNode;
    onClick: () => Promise<void>;
} & ButtonProps;

export default function AsyncButton({ children, onClick, ...props }: Props) {
    const [loading, setLoading] = useState(false);
    const handleClick = async () => {
        try {
            setLoading(true);
            await onClick();
        } catch (error) {
            setLoading(false);
            return Promise.reject(error)
        }
        setLoading(false);
    }
    return <Button {...props} onClick={handleClick} loading={loading} >
        {children}
    </Button>
}
