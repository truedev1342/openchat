'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Phone } from 'lucide-react'

interface CallSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CallSetupDialog({ open, onOpenChange }: CallSetupDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
