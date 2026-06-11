const head: number[] = [1, 2];
const all: number[] = [...head, 3, 4];

const base = { x: 10, y: 20 };
const ext = { ...base, z: 8 };

const __r: number = all.length + ext.x + ext.y + ext.z;
