import { Hero } from '@/components/hero'
import { Features } from '@/components/sections/Features'
import { Compare } from '@/components/sections/Compare'
import PlaygroundEmbed from '@/components/sections/PlaygroundEmbed'
import { Quickstart } from '@/components/sections/Quickstart'
import { Ecosystem } from '@/components/sections/Ecosystem'
import { CallToAction } from '@/components/sections/CallToAction'

export default function Home() {
  return (
    <main className="bg-[#050510]">
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
