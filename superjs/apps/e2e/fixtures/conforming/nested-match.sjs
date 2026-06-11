type Tree = Leaf(number) | Branch({ left: Tree, right: Tree });

function total(t: Tree): number {
  return match t {
    Leaf(n) => n,
    Branch({ left, right }) => total(left) + total(right),
  };
}

const __r: number = total(Branch({ left: Leaf(40), right: Leaf(2) }));
