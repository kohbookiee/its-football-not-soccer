import { Suspense, useEffect, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useTexture } from "@react-three/drei"
import { SRGBColorSpace } from "three"
import ArchiveHud, { ArchiveEnlarge } from "../components/ArchiveHud"

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

function Stands() {
  const seats = []
  for (let tier = 0; tier < 3; tier += 1) {
    const count = 42
    const radius = 7.4 + tier * 0.85
    const y = 0.2 + tier * 0.55
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2
      seats.push(
        <mesh
          key={`${tier}-${index}`}
          position={[Math.sin(angle) * radius, y, Math.cos(angle) * radius]}
          rotation={[0, -angle, 0]}
        >
          <boxGeometry args={[0.78, 0.48, 0.42]} />
          <meshStandardMaterial color={index % 8 === 0 ? "#2c4cff" : "#14161c"} roughness={0.9} />
        </mesh>,
      )
    }
  }

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <circleGeometry args={[5.4, 56]} />
        <meshStandardMaterial color="#0d3f18" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[2.15, 2.2, 72]} />
        <meshBasicMaterial color="#d8ff00" transparent opacity={0.55} />
      </mesh>
      {seats}
    </group>
  )
}

function CameraDrift() {
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const drift = reduceMotion ? 0 : Math.sin(time * 0.12) * 0.16
    state.camera.position.set(drift, 1.72, 5.35)
    state.camera.lookAt(0, 0.45, 0)
  })
  return null
}

function Lantern({ images, onSelect }) {
  const group = useRef(null)
  const loaded = useTexture(images.map((image) => image.card))
  const textures = Array.isArray(loaded) ? loaded : [loaded]
  textures.forEach((texture) => {
    texture.colorSpace = SRGBColorSpace
  })

  useFrame((_, delta) => {
    if (!reduceMotion && group.current) group.current.rotation.y += delta * 0.16
  })

  const copies = 2
  const total = images.length * copies
  return (
    <group ref={group} position={[0, 0.15, 0]}>
      {Array.from({ length: total }, (_, index) => {
        const imageIndex = index % images.length
        const image = images[imageIndex]
        const turn = index / total
        const angle = turn * Math.PI * 2 * 1.7
        const y = (turn - 0.5) * 3.2
        const radius = 3.35
        const aspect = image.width / image.height || 1.5
        const frameHeight = 0.78
        const frameWidth = Math.min(frameHeight * aspect, 1.2)
        return (
          <mesh
            key={`${image.id}-${index}`}
            position={[Math.sin(angle) * radius, y, Math.cos(angle) * radius]}
            rotation={[0, angle + Math.PI, 0]}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(imageIndex)
            }}
            onPointerOver={(event) => {
              event.stopPropagation()
              document.body.style.cursor = "pointer"
            }}
            onPointerOut={() => {
              document.body.style.cursor = ""
            }}
          >
            <planeGeometry args={[frameWidth, frameWidth / aspect]} />
            <meshBasicMaterial map={textures[imageIndex]} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}

export default function ClubTerrace({ club, archive, history, seasonRow, seasonLabel, onBack }) {
  const images = archive?.images ?? []
  const [index, setIndex] = useState(0)
  const [enlarged, setEnlarged] = useState(false)
  const count = images.length
  const current = images[index] ?? null

  useEffect(() => {
    return () => {
      document.body.style.cursor = ""
    }
  }, [])

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") {
        if (enlarged) setEnlarged(false)
        else onBack()
        return
      }
      if (enlarged || count < 2) return
      if (event.key === "ArrowRight") setIndex((value) => (value + 1) % count)
      if (event.key === "ArrowLeft") setIndex((value) => (value - 1 + count) % count)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [count, enlarged, onBack])

  return (
    <section className={enlarged ? "terrace is-enlarged" : "terrace"}>
      <Canvas camera={{ position: [0, 1.72, 5.35], fov: 48 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#07080b"]} />
        <fog attach="fog" args={["#07080b", 8, 18]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 4]} intensity={1.15} />
        <Stands />
        <CameraDrift />
        {count > 0 && (
          <Suspense fallback={null}>
            <Lantern images={images} onSelect={setIndex} />
          </Suspense>
        )}
      </Canvas>
      <ArchiveHud
        club={club}
        archive={archive}
        image={current}
        index={index}
        history={history}
        seasonRow={seasonRow}
        seasonLabel={seasonLabel}
        onBack={onBack}
        onPrev={() => setIndex((value) => (value - 1 + count) % count)}
        onNext={() => setIndex((value) => (value + 1) % count)}
        onEnlarge={() => setEnlarged(true)}
      />
      {enlarged && current ? <ArchiveEnlarge image={current} onClose={() => setEnlarged(false)} /> : null}
    </section>
  )
}
