import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import './App.css'

const START = [0, 0.65, 8]
const GOAL_Z = -8
const OBSTACLES = [
  { z: 5, speed: 1.3, width: 3.2, color: '#ff5c7a' },
  { z: 1, speed: -1.7, width: 3.8, color: '#ffb84d' },
  { z: -3, speed: 1.9, width: 3.3, color: '#b66dff' },
]

function Player({ positionRef, resetSignal }) {
  const mesh = useRef()
  const keys = useRef({})

  useEffect(() => {
    const down = (event) => {
      keys.current[event.key.toLowerCase()] = true
    }
    const up = (event) => {
      keys.current[event.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useEffect(() => {
    if (mesh.current) mesh.current.position.set(...START)
  }, [resetSignal])

  useFrame((_, delta) => {
    if (!mesh.current) return
    const direction = {
      x: (keys.current.d || keys.current.arrowright ? 1 : 0) -
        (keys.current.a || keys.current.arrowleft ? 1 : 0),
      z: (keys.current.s || keys.current.arrowdown ? 1 : 0) -
        (keys.current.w || keys.current.arrowup ? 1 : 0),
    }
    mesh.current.position.x += direction.x * delta * 5
    mesh.current.position.z += direction.z * delta * 5
    mesh.current.position.x = Math.max(-5.3, Math.min(5.3, mesh.current.position.x))
    mesh.current.position.z = Math.max(-9, Math.min(9, mesh.current.position.z))
    positionRef.current = [mesh.current.position.x, mesh.current.position.z]
  })

  return (
    <mesh ref={mesh} castShadow>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="#38d9ff" emissive="#07536d" emissiveIntensity={0.7} />
    </mesh>
  )
}

function Obstacle({ obstacle, index, positionsRef }) {
  const mesh = useRef()

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const x = Math.sin(clock.getElapsedTime() * obstacle.speed + index) * obstacle.width
    mesh.current.position.x = x
    positionsRef.current[index] = [x, obstacle.z]
  })

  return (
    <mesh ref={mesh} position={[0, 0.55, obstacle.z]} castShadow>
      <boxGeometry args={[2.3, 1.1, 0.8]} />
      <meshStandardMaterial color={obstacle.color} emissive={obstacle.color} emissiveIntensity={0.25} />
    </mesh>
  )
}

function Arena({ onDeath, onWin, resetSignal }) {
  const playerPosition = useRef([START[0], START[2]])
  const obstaclePositions = useRef(OBSTACLES.map((obstacle) => [0, obstacle.z]))
  const collisionCooldown = useRef(0)
  const won = useRef(false)

  useFrame((_, delta) => {
    collisionCooldown.current -= delta
    const [playerX, playerZ] = playerPosition.current

    if (!won.current && playerZ <= GOAL_Z + 0.5) {
      won.current = true
      onWin()
    }

    if (collisionCooldown.current > 0 || won.current) return
    const hit = obstaclePositions.current.some(([x, z]) =>
      Math.abs(playerX - x) < 1.55 && Math.abs(playerZ - z) < 0.95,
    )
    if (hit) {
      collisionCooldown.current = 1
      onDeath()
    }
  })

  useEffect(() => {
    won.current = false
  }, [resetSignal])

  return (
    <>
      <Player positionRef={playerPosition} resetSignal={resetSignal} />
      {OBSTACLES.map((obstacle, index) => (
        <Obstacle
          key={obstacle.z}
          obstacle={obstacle}
          index={index}
          positionsRef={obstaclePositions}
        />
      ))}
    </>
  )
}

function Marker({ position, color, label }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[1.3, 1.3, 0.08, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
      <Text position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="white">
        {label}
      </Text>
    </group>
  )
}

function App() {
  const [deaths, setDeaths] = useState(0)
  const [won, setWon] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)

  const restart = () => {
    setWon(false)
    setResetSignal((value) => value + 1)
  }

  return (
    <main className="game">
      <header className="hud">
        <div>
          <p className="eyebrow">MISION CONDOR</p>
          <h1>De A a B</h1>
        </div>
        <div className="stats">
          <span>Muertes <strong>{deaths}</strong></span>
          <button onClick={restart}>Reiniciar</button>
        </div>
      </header>

      <section className="scene-wrap">
        <Canvas shadows camera={{ position: [11, 13, 14], fov: 45 }}>
          <color attach="background" args={['#10182d']} />
          <ambientLight intensity={1.3} />
          <directionalLight position={[4, 10, 5]} intensity={3} castShadow />
          <Arena
            onDeath={() => {
              setDeaths((value) => value + 1)
              setResetSignal((value) => value + 1)
            }}
            onWin={() => setWon(true)}
            resetSignal={resetSignal}
          />
          <Marker position={[0, 0.08, 8]} color="#27d17f" label="A" />
          <Marker position={[0, 0.08, GOAL_Z]} color="#f4d35e" label="B" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[13, 20]} />
            <meshStandardMaterial color="#1a2942" />
          </mesh>
          <gridHelper args={[13, 13, '#416080', '#263c5c']} position={[0, 0.05, 0]} />
          <OrbitControls enablePan={false} minPolarAngle={0.55} maxPolarAngle={1.35} />
        </Canvas>
        {won && (
          <div className="victory">
            <span>¡LLEGASTE!</span>
            <p>La misión fue completada</p>
            <button onClick={restart}>Jugar de nuevo</button>
          </div>
        )}
      </section>

      <footer>
        <span>Muévete con <b>WASD</b> o las <b>flechas</b></span>
        <span>Esquiva las paredes móviles y llega a <b>B</b></span>
      </footer>
    </main>
  )
}

export default App
