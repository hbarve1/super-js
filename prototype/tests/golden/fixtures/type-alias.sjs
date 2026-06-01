type Status = "active" | "inactive" | "pending"
type ID = string | number

function activate(id: ID): Status {
  console.log("activating", id)
  return "active"
}

const result: Status = activate(42)
console.log(result)
