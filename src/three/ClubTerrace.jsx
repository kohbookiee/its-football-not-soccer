import { Suspense, useEffect, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useTexture } from "@react-three/drei"
import { DoubleSide, SRGBColorSpace } from "three"
import ArchiveHud, { ArchiveEnlarge } from "../components/ArchiveHud"

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
const GAP = 4.6
const CAMERA_Z = 6.4
const PASS_Z = CAMERA_Z - 3.4
const DRIFT = 1.65

function fieldDepth(total) {
  return Math.max(total, 1) * GAP
}

function place(index, total) {
  const turn = index * 2.399963
  const ring = 0.85 + (index % 4) * 0.62
  const z = PASS_Z - 0.6 - (index / Math.max(total, 1)) * fieldDepth(total)
  return {
    position: [Math.cos(turn) * ring, Math.sin(turn) * ring * 0.58, z],
    rotation: [((index % 5) - 2) * 0.025, Math.sin(turn) * 0.22, ((index % 7) - 3) * 0.018],
  }
}

function Flight({ paused }) {
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(event) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [])

  useFrame((state) => {
    const camera = state.camera
    const ease = reduceMotion ? 1 : 0.07
    const aimX = pointer.current.x * 1.85
    const aimY = 0.08 - pointer.current.y * 0.95
    camera.position.x += (aimX - camera.position.x) * ease
    camera.position.y += (aimY - camera.position.y) * ease
    camera.lookAt(
      camera.position.x + pointer.current.x * 2.6,
      camera.position.y - pointer.current.y * 1.15,
      camera.position.z - 9,
    )
    camera.rotation.z = -pointer.current.x * 0.045
    camera.userData.paused = paused
  })

  return null
}

function PhotoField({ images, paused, onSelect, onOpen }) {
  const group = useRef(null)
  const nearest = useRef(-1)
  const loaded = useTexture(images.map((image) => image.src))
  const textures = Array.isArray(loaded) ? loaded : [loaded]
  textures.forEach((texture) => {
    texture.colorSpace = SRGBColorSpace
  })

  useFrame((state, delta) => {
    const root = group.current
    if (!root) return
    const step = paused || reduceMotion ? 0 : delta * DRIFT
    const depth = fieldDepth(root.children.length)
    let best = Infinity
    let bestIndex = -1
    root.children.forEach((mesh) => {
      mesh.position.z += step
      if (mesh.position.z > PASS_Z) mesh.position.z -= depth
      const distance = state.camera.position.z - mesh.position.z
      if (distance > 3.2 && distance < best) {
        best = distance
        bestIndex = mesh.userData.imageIndex
      }
    })
    if (bestIndex >= 0 && bestIndex !== nearest.current) {
      nearest.current = bestIndex
      onSelect(bestIndex)
    }
  })

  const total = images.length

  return (
    <group ref={group}>
      {images.map((image, index) => {
        const aspect = image.width / image.height || 1.4
        const boost = 1 + (index % 3) * 0.16
        let width = (2.05 + (index % 4) * 0.18) * boost
        let height = width / aspect
        if (height > 2.55) {
          height = 2.55
          width = height * aspect
        }
        const spot = place(index, total)
        return (
          <mesh
            key={image.id}
            rotation={spot.rotation}
            ref={(mesh) => {
              if (!mesh || mesh.userData.placed) return
              mesh.position.set(spot.position[0], spot.position[1], spot.position[2])
              mesh.userData.placed = true
              mesh.userData.imageIndex = index
            }}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(index)
            }}
            onDoubleClick={(event) => {
              event.stopPropagation()
              onSelect(index)
              onOpen()
            }}
            onPointerOver={(event) => {
              event.stopPropagation()
              document.body.style.cursor = "pointer"
            }}
            onPointerOut={() => {
              document.body.style.cursor = ""
            }}
          >
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial map={textures[index]} toneMapped={false} side={DoubleSide} />
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
      <Canvas camera={{ position: [0, 0.08, CAMERA_Z], fov: 58 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#07080b"]} />
        <fog attach="fog" args={["#07080b", 7, 24]} />
        <Flight paused={enlarged} />
        {count > 0 && (
          <Suspense fallback={null}>
            <PhotoField
              images={images}
              paused={enlarged}
              onSelect={setIndex}
              onOpen={() => setEnlarged(true)}
            />
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
        onEnlarge={() => setEnlarged(true)}
      />
      {enlarged && current ? <ArchiveEnlarge image={current} onClose={() => setEnlarged(false)} /> : null}
    </section>
  )
}
