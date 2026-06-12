import { Hero } from '@/components/hero'
import { Features } from '@/components/sections/Features'
import { Compare } from '@/components/sections/Compare'
import { PlaygroundEmbed } from '@/components/sections/PlaygroundEmbed'
import { Quickstart } from '@/components/sections/Quickstart'
import { Ecosystem } from '@/components/sections/Ecosystem'
import { CallToAction } from '@/components/sections/CallToAction'

export default function Home() {
  return (
    <main id="main-content">
      <Hero />
      <Features />
      <Compare />
      <PlaygroundEmbed />
      <Quickstart />
      <Ecosystem />
      <CallToAction />
    </main>
  )
}
