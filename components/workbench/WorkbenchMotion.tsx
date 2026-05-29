'use client'

import type { ReactNode } from 'react'
import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export function WorkbenchMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement | null>(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-workbench-motion], [data-workspace-motion="enter"]', {
        autoAlpha: 0,
        y: 12,
        duration: 0.38,
        ease: 'power2.out',
        stagger: 0.045,
        clearProps: 'all',
      })
    },
    { scope },
  )

  return <div ref={scope}>{children}</div>
}

export default WorkbenchMotion
