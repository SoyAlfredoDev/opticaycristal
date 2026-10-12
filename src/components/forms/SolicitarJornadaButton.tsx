"use client";

import { Button, type ButtonProps } from "@/components/ui/Button";
import { useJornadaModal } from "@/components/forms/JornadaModalProvider";

type SolicitarJornadaButtonProps = Omit<ButtonProps, "href">;

export default function SolicitarJornadaButton({
  children = "Solicitar jornada",
  onClick,
  type = "button",
  ...props
}: SolicitarJornadaButtonProps) {
  const { open } = useJornadaModal();

  return (
    <Button
      type={type}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) open();
      }}
    >
      {children}
    </Button>
  );
}
