type Result = Ok(number) | Err(string);
const r = Ok(21);
const __r = match r { Ok(v) => v * 2, Err(e) => -1, };
