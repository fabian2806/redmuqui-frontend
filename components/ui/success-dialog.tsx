"use client"

import { CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type SuccessDialogProps = {
  open: boolean
  title: string
  description: string
  buttonText?: string
  onClose: () => void
}

export function SuccessDialog({
  open,
  title,
  description,
  buttonText = "Aceptar",
  onClose,
}: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose()
    }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>

          <DialogTitle className="text-center text-lg">
            {title}
          </DialogTitle>

          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            onClick={onClose}
            className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
          >
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}