import { Environment, Lightformer } from '@react-three/drei'

// Fully procedural environment — no network-fetched HDRIs.
export function Env() {
  return (
    <>
      <ambientLight intensity={0.12} />
      <hemisphereLight args={['#243642', '#05070a', 0.35]} />
      <directionalLight position={[5, 8, 4]} intensity={1.1} color="#c3d7e4" />
      <directionalLight position={[-6, 4, -6]} intensity={0.5} color="#6f93a8" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[9, 5, 1]} intensity={1.8} color="#cfe0ea" />
        <Lightformer form="rect" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[5, 2.4, 1]} intensity={1.1} color="#d9a441" />
        <Lightformer form="rect" position={[6, 2.5, 3]} rotation-y={-Math.PI / 2} scale={[5, 2.5, 1]} intensity={0.7} color="#87a7bb" />
        <Lightformer form="rect" position={[0, 1, 8]} scale={[8, 1.6, 1]} intensity={0.35} color="#3d5666" />
      </Environment>
    </>
  )
}
