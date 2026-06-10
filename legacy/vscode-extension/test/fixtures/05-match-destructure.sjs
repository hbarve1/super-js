const area = match s {
  Circle({ radius }) => Math.PI * radius * radius
  Rect({ w, h }) => w * h
  Point => 0
}
