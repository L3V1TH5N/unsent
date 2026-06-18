// src/components/globe/geometry.ts
export interface SphereGeometry {
  pos: number[]
  norm: number[]
  uv: number[]
  idx: number[]
}

export function sphere(stacks: number, slices: number, r: number): SphereGeometry {
  const pos: number[] = [], norm: number[] = [], uv: number[] = [], idx: number[] = []
  for (let i = 0; i <= stacks; i++) {
    const phi = i / stacks * Math.PI
    for (let j = 0; j <= slices; j++) {
      const theta = j / slices * 2 * Math.PI
      const x = -Math.sin(phi) * Math.cos(theta), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(theta)
      pos.push(r*x, r*y, r*z); norm.push(x, y, z); uv.push(j/slices, i/stacks)
    }
  }
  for (let i = 0; i < stacks; i++) for (let j = 0; j < slices; j++) {
    const a = i*(slices+1)+j, b = a+slices+1
    idx.push(a, b, a+1, b, b+1, a+1)
  }
  return { pos, norm, uv, idx }
}