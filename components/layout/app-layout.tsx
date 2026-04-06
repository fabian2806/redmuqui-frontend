"use client"

import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { ReactNode } from "react"

interface AppLayoutProps {
  children: ReactNode
  title?: string
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <Sidebar />
      <div className="ml-64 transition-all duration-300">
        <Header title={title} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
