// src/components/globe/mat4.ts
// ── Column-major mat4 helpers (WebGL standard) ──────────────────────────
// Storage: [col0row0, col0row1, col0row2, col0row3,  col1row0, ...]
// i.e. mat[col*4 + row]

export function m4id(): number[] {
  return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
}

// C = A*B  (column-major)
export function m4mul(A: number[], B: number[]): number[] {
  const C = new Array(16).fill(0)
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++)
        C[col*4+row] += A[k*4+row] * B[col*4+k]
  return C
}

export function m4rotY(a: number): number[] {
  const c = Math.cos(a), s = Math.sin(a)
  return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]
}
export function m4rotX(a: number): number[] {
  const c = Math.cos(a), s = Math.sin(a)
  return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]
}
export function m4trans(x: number, y: number, z: number): number[] {
  return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]
}
export function m4persp(fovY: number, asp: number, near: number, far: number): number[] {
  const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far)
  return [f/asp,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]
}
// Upper-left 3×3 of mat4 (for normal transform AND for the picking
// front-face test — both only care about rotation, not translation).
export function m3from4(m: number[]): number[] {
  return [m[0],m[1],m[2], m[4],m[5],m[6], m[8],m[9],m[10]]
}

// Transform a point by a column-major mat4 → clip-space [x,y,z,w]
export function transformPoint(m: number[], x: number, y: number, z: number): [number, number, number, number] {
  return [
    m[0]*x + m[4]*y + m[8]*z  + m[12],
    m[1]*x + m[5]*y + m[9]*z  + m[13],
    m[2]*x + m[6]*y + m[10]*z + m[14],
    m[3]*x + m[7]*y + m[11]*z + m[15],
  ]
}

// Rotate a point by a column-major 3×3
export function rotate3(m3: number[], x: number, y: number, z: number): [number, number, number] {
  return [
    m3[0]*x + m3[3]*y + m3[6]*z,
    m3[1]*x + m3[4]*y + m3[7]*z,
    m3[2]*x + m3[5]*y + m3[8]*z,
  ]
}